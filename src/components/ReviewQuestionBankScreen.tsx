import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  BookOpen,
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Layers,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  X,
  Sparkles,
  FileJson,
  Check,
  AlertTriangle,
  Loader2,
  RotateCcw,
  CheckSquare,
  Square,
  Wand2,
} from 'lucide-react';
import {
  ReviewQuestion,
  ReviewQuestionBank,
  ReviewQuestionLevel,
  ClassGoJsonQuestionBankImport,
} from '../types';
import {
  loadQuestionBanks,
  loadQuestionsForBank,
  createQuestionBank,
  deleteQuestionBank,
  addQuestionToBank,
  updateQuestion,
  deleteQuestion,
  validateJsonQuestionBank,
  parseExcelQuestions,
  exportBankToJson,
  saveQuestions,
  loadAllQuestions,
  generateQuestionsViaAi,
  GeneratedAiQuestionDraft,
  JsonBankValidationResult,
  ExcelQuestionParseResult,
  generateLessonBatchQuestions,
} from '../services/reviewQuestionService';
import { MysteryDoorGame } from './mystery-door/MysteryDoorGame';
import {
  KNTT_MATH_CATALOG,
  BOOK_SERIES_KNTT_NAME,
  getKnttGrades,
  getKnttChapters,
  getKnttLessonsByChapter,
  formatKnttChapterTitle,
  formatKnttLessonTitle,
  findKnttLessonById,
  findMatchingBankForKnttLesson,
  getKnttCatalogLessonsWithBankStatus,
  CatalogLessonItem,
} from '../data/knttMathCatalog';

interface ReviewQuestionBankScreenProps {
  currentUser?: FirebaseUser | null;
}

export const ReviewQuestionBankScreen: React.FC<ReviewQuestionBankScreenProps> = ({ currentUser }) => {
  const ownerId = currentUser?.uid;

  // 1. Data States
  const [banks, setBanks] = useState<ReviewQuestionBank[]>(() => loadQuestionBanks(ownerId));
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);

  // 2. Filter & Search States
  const [subjectFilter, setSubjectFilter] = useState<string>('Toán');
  const [bookSeriesFilter, setBookSeriesFilter] = useState<string>('KNTT'); // 'KNTT' | 'OTHER'
  const [gradeFilter, setGradeFilter] = useState<string>('7'); // 'ALL' | '6' | '7' | '8' | '9'
  const [volumeFilter, setVolumeFilter] = useState<'ALL' | '1' | '2'>('ALL'); // Sách giáo khoa Tập 1 | Tập 2
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL'); // Học kỳ 1 | 2 (riêng biệt với Tập SGK)
  const [sectionFilter, setSectionFilter] = useState<string>('ALL'); // Chapter ID or Section name
  const [levelFilter, setLevelFilter] = useState<'ALL' | ReviewQuestionLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. UI Modal States
  const [isCreateBankOpen, setIsCreateBankOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ReviewQuestion | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [showAllAnswers, setShowAllAnswers] = useState(true);

  // JSON Import & Preview State
  const [jsonPreviewData, setJsonPreviewData] = useState<{
    rawJson: any;
    validation: JsonBankValidationResult;
  } | null>(null);

  // Excel Import & Preview State
  const [excelPreviewData, setExcelPreviewData] = useState<{
    fileBuffer: ArrayBuffer;
    fileName: string;
    parsed: ExcelQuestionParseResult;
  } | null>(null);

  // AI Question Generation States (Phase 2 & Hotfix 2A)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiStep, setAiStep] = useState<'CONFIG' | 'GENERATING' | 'PREVIEW'>('CONFIG');
  const [aiCount, setAiCount] = useState<number>(10);
  const [aiLevel, setAiLevel] = useState<ReviewQuestionLevel>('basic');
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  const [aiDrafts, setAiDrafts] = useState<GeneratedAiQuestionDraft[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Editing state for an individual draft in preview
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editDraftForm, setEditDraftForm] = useState<{
    question: string;
    answer: string;
  }>({ question: '', answer: '' });

  // Feedback Notification
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Mystery Door Game State (Phase 4A)
  const [isMysteryDoorOpen, setIsMysteryDoorOpen] = useState(false);

  // ==============================================================
  // BATCH AI QUESTION GENERATION STATES (Phase 3)
  // ==============================================================
  const [isBatchAiModalOpen, setIsBatchAiModalOpen] = useState(false);
  const [batchAiStep, setBatchAiStep] = useState<'CONFIG' | 'GENERATING' | 'PREVIEW'>('CONFIG');

  // Hierarchy filters inside Batch Modal:
  const [batchSubject, setBatchSubject] = useState<string>('Toán');
  const [batchBookSeries, setBatchBookSeries] = useState<string>('KNTT');
  const [batchGrade, setBatchGrade] = useState<string>('7');
  const [batchVolume, setBatchVolume] = useState<'ALL' | '1' | '2'>('ALL');
  const [batchSemester, setBatchSemester] = useState<string>('1');
  const [batchChapterId, setBatchChapterId] = useState<string>('ALL');
  const [batchSectionName, setBatchSectionName] = useState<string>('');

  // Lesson list for the selected chapter:
  const [batchLessonsList, setBatchLessonsList] = useState<Array<{
    id: string;
    lessonName: string;
    chapterName?: string;
    bankId?: string;
    hasBank?: boolean;
    selected: boolean;
    basicCount?: number;
    advancedCount?: number;
    existingCount?: { basic: number; advanced: number; total: number };
  }>>([]);
  const [newLessonInput, setNewLessonInput] = useState<string>('');

  // Count configuration per lesson (0, 5, 10, 15, 20):
  const [batchBasicCount, setBatchBasicCount] = useState<number>(10);
  const [batchAdvancedCount, setBatchAdvancedCount] = useState<number>(5);
  const [batchCustomPrompt, setBatchCustomPrompt] = useState<string>('');

  // Progress tracking during generation:
  const [batchProgress, setBatchProgress] = useState<{
    currentIndex: number;
    totalLessons: number;
    currentLessonName: string;
    currentStage: 'basic' | 'advanced' | 'idle';
    percent: number;
  }>({
    currentIndex: 0,
    totalLessons: 0,
    currentLessonName: '',
    currentStage: 'idle',
    percent: 0,
  });

  // Results for preview:
  const [batchResults, setBatchResults] = useState<Array<{
    lessonId: string;
    lessonName: string;
    bankId?: string;
    status: 'pending' | 'generating' | 'success' | 'error';
    errorMessage?: string;
    drafts: GeneratedAiQuestionDraft[];
    expanded?: boolean;
    saved?: boolean;
  }>>([]);

  // Inline editing state for a draft in batch preview:
  const [editingBatchDraft, setEditingBatchDraft] = useState<{
    lessonIndex: number;
    tempId: string;
    question: string;
    answer: string;
  } | null>(null);

  const [batchError, setBatchError] = useState<string | null>(null);
  const isBatchCancelledRef = useRef<boolean>(false);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Reload banks when user changes
  useEffect(() => {
    const loaded = loadQuestionBanks(ownerId);
    setBanks(loaded);
    if (loaded.length > 0 && !selectedBankId) {
      setSelectedBankId(loaded[0].id);
    }
  }, [ownerId]);

  // Load questions for selected bank
  useEffect(() => {
    if (selectedBankId) {
      const qList = loadQuestionsForBank(selectedBankId, ownerId);
      setQuestions(qList);
    } else {
      setQuestions([]);
    }
  }, [selectedBankId, ownerId]);

  // Derive unique selection options from available banks and KNTT catalog
  const subjects = useMemo(() => {
    const list = Array.from(new Set(banks.map((b) => b.subject).filter(Boolean)));
    if (!list.includes('Toán')) list.unshift('Toán');
    return list.sort();
  }, [banks]);

  const grades = useMemo(() => {
    if (bookSeriesFilter === 'KNTT' && (subjectFilter === 'Toán' || subjectFilter === 'ALL')) {
      return ['6', '7', '8', '9'];
    }
    let filtered = banks;
    if (subjectFilter !== 'ALL') {
      filtered = filtered.filter((b) => b.subject === subjectFilter);
    }
    const list = Array.from(new Set(filtered.map((b) => String(b.grade)).filter(Boolean)));
    if (list.length === 0) return ['6', '7', '8', '9'];
    return list.sort((a, b) => Number(a) - Number(b));
  }, [banks, subjectFilter, bookSeriesFilter]);

  const semesters = useMemo(() => {
    return ['1', '2'];
  }, []);

  // KNTT chapters list when viewing KNTT
  const knttChapters = useMemo(() => {
    if (bookSeriesFilter !== 'KNTT') return [];
    if (subjectFilter !== 'Toán' && subjectFilter !== 'ALL') return [];
    if (gradeFilter === 'ALL') {
      return [6, 7, 8, 9].flatMap((g) => getKnttChapters(g, volumeFilter));
    }
    return getKnttChapters(gradeFilter, volumeFilter);
  }, [bookSeriesFilter, subjectFilter, gradeFilter, volumeFilter]);

  const sections = useMemo(() => {
    if (bookSeriesFilter === 'KNTT' && (subjectFilter === 'Toán' || subjectFilter === 'ALL')) {
      return knttChapters.map((c) => ({
        id: c.id,
        name: formatKnttChapterTitle(c),
      }));
    }
    let filtered = banks;
    if (subjectFilter !== 'ALL') filtered = filtered.filter((b) => b.subject === subjectFilter);
    if (gradeFilter !== 'ALL') filtered = filtered.filter((b) => String(b.grade) === gradeFilter);
    if (semesterFilter !== 'ALL') filtered = filtered.filter((b) => (b.semester || '1') === semesterFilter);
    const list = Array.from(new Set(filtered.map((b) => b.sectionName).filter(Boolean))) as string[];
    return list.sort().map((sec) => ({ id: sec, name: sec }));
  }, [banks, subjectFilter, gradeFilter, semesterFilter, bookSeriesFilter, knttChapters]);

  // Catalog lessons with real bank status (annotates existing question counts and IDs)
  const catalogLessonItems: CatalogLessonItem[] = useMemo(() => {
    if (bookSeriesFilter !== 'KNTT') return [];
    if (subjectFilter !== 'Toán' && subjectFilter !== 'ALL') return [];

    const targetGrades = gradeFilter === 'ALL' ? [6, 7, 8, 9] : [Number(gradeFilter)];
    const allItems: CatalogLessonItem[] = [];

    for (const g of targetGrades) {
      const items = getKnttCatalogLessonsWithBankStatus(
        g,
        volumeFilter,
        sectionFilter,
        banks,
        (bId) => {
          const bQs = loadQuestionsForBank(bId, ownerId);
          return {
            basic: bQs.filter((q) => q.level === 'basic').length,
            advanced: bQs.filter((q) => q.level === 'advanced').length,
            total: bQs.length,
          };
        }
      );
      allItems.push(...items);
    }
    return allItems;
  }, [bookSeriesFilter, subjectFilter, gradeFilter, volumeFilter, sectionFilter, banks, ownerId]);

  const filteredBanks = useMemo(() => {
    return banks.filter((b) => {
      if (subjectFilter !== 'ALL' && b.subject !== subjectFilter) return false;
      if (gradeFilter !== 'ALL' && String(b.grade) !== gradeFilter) return false;
      if (semesterFilter !== 'ALL' && (b.semester || '1') !== semesterFilter) return false;
      if (sectionFilter !== 'ALL') {
        const foundChap = knttChapters.find((c) => c.id === sectionFilter);
        if (foundChap) {
          const formatted = formatKnttChapterTitle(foundChap).toLowerCase();
          if (
            b.sectionName?.toLowerCase() !== formatted &&
            !b.sectionName?.toLowerCase().includes(foundChap.title.toLowerCase())
          ) {
            return false;
          }
        } else if (b.sectionName !== sectionFilter) {
          return false;
        }
      }
      return true;
    });
  }, [banks, subjectFilter, gradeFilter, semesterFilter, sectionFilter, knttChapters]);

  // Auto-select first matching bank or catalog lesson if current selection is outside filter
  useEffect(() => {
    if (bookSeriesFilter === 'KNTT' && (subjectFilter === 'Toán' || subjectFilter === 'ALL')) {
      if (catalogLessonItems.length > 0) {
        const isCurrentValid = catalogLessonItems.some(
          (item) => item.bankId === selectedBankId || `kntt-virtual:${item.id}` === selectedBankId
        );
        if (!isCurrentValid) {
          const firstWithBank = catalogLessonItems.find((i) => i.hasBank && i.bankId);
          if (firstWithBank && firstWithBank.bankId) {
            setSelectedBankId(firstWithBank.bankId);
          } else {
            setSelectedBankId(`kntt-virtual:${catalogLessonItems[0].id}`);
          }
        }
      } else {
        setSelectedBankId('');
      }
    } else {
      if (filteredBanks.length > 0) {
        const isCurrentValid = filteredBanks.some((b) => b.id === selectedBankId);
        if (!isCurrentValid) {
          setSelectedBankId(filteredBanks[0].id);
        }
      } else {
        setSelectedBankId('');
      }
    }
  }, [bookSeriesFilter, subjectFilter, catalogLessonItems, filteredBanks, selectedBankId]);

  // Active Lesson Target: Represents either an existing bank or an uncreated catalog lesson
  const activeLessonTarget = useMemo(() => {
    if (selectedBankId.startsWith('kntt-virtual:')) {
      const knttId = selectedBankId.replace('kntt-virtual:', '');
      const found = findKnttLessonById(knttId);
      if (found) {
        return {
          isVirtual: true,
          catalogId: found.lesson.id,
          bankId: undefined as string | undefined,
          subject: 'Toán',
          bookSeries: BOOK_SERIES_KNTT_NAME,
          grade: String(found.grade),
          volume: found.chapter.volume,
          semester: semesterFilter !== 'ALL' ? semesterFilter : (found.chapter.volume === 1 ? '1' : '2'),
          sectionName: formatKnttChapterTitle(found.chapter),
          lessonName: formatKnttLessonTitle(found.lesson),
          lessonId: found.lesson.id,
        };
      }
    }
    const realBank = banks.find((b) => b.id === selectedBankId);
    if (realBank) {
      return {
        isVirtual: false,
        catalogId: realBank.lessonId,
        bankId: realBank.id,
        subject: realBank.subject,
        bookSeries: realBank.subject === 'Toán' ? BOOK_SERIES_KNTT_NAME : undefined,
        grade: String(realBank.grade),
        volume: 1,
        semester: realBank.semester || '1',
        sectionName: realBank.sectionName || '',
        lessonName: realBank.lessonName,
        lessonId: realBank.lessonId,
      };
    }
    return null;
  }, [selectedBankId, banks, semesterFilter]);

  const activeBank = useMemo(() => {
    if (!activeLessonTarget) return null;
    if (!activeLessonTarget.isVirtual && activeLessonTarget.bankId) {
      return banks.find((b) => b.id === activeLessonTarget.bankId) || null;
    }
    return {
      id: selectedBankId,
      ownerId: ownerId || 'system',
      subject: activeLessonTarget.subject,
      grade: activeLessonTarget.grade,
      semester: activeLessonTarget.semester || '1',
      sectionName: activeLessonTarget.sectionName || '',
      lessonId: activeLessonTarget.lessonId,
      lessonName: activeLessonTarget.lessonName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ReviewQuestionBank;
  }, [activeLessonTarget, banks, selectedBankId, ownerId]);

  // Filtered Questions by level and search query
  const displayedQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (levelFilter !== 'ALL' && q.level !== levelFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const inQuestion = q.question.toLowerCase().includes(query);
        const inAnswer = q.answer.toLowerCase().includes(query);
        if (!inQuestion && !inAnswer) return false;
      }
      return true;
    });
  }, [questions, levelFilter, searchQuery]);

  // Stats for active bank
  const stats = useMemo(() => {
    const basic = questions.filter((q) => q.level === 'basic').length;
    const advanced = questions.filter((q) => q.level === 'advanced').length;
    return { total: questions.length, basic, advanced };
  }, [questions]);

  // Form states for Create Bank
  const [newBankForm, setNewBankForm] = useState({
    subject: 'Toán',
    grade: '7',
    semester: '1',
    sectionName: '',
    lessonName: '',
  });

  // Form states for Add Question
  const [newQuestionForm, setNewQuestionForm] = useState<{
    level: ReviewQuestionLevel;
    question: string;
    answer: string;
  }>({
    level: 'basic',
    question: '',
    answer: '',
  });

  // Action: Handle Create Bank
  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankForm.subject.trim() || !newBankForm.grade.trim() || !newBankForm.lessonName.trim()) {
      showNotification('Vui lòng nhập đầy đủ Môn, Khối và Tên bài học.', 'error');
      return;
    }

    const res = createQuestionBank(
      {
        subject: newBankForm.subject.trim(),
        grade: newBankForm.grade.trim(),
        semester: newBankForm.semester,
        sectionName: newBankForm.sectionName.trim(),
        lessonName: newBankForm.lessonName.trim(),
      },
      ownerId
    );

    const updated = loadQuestionBanks(ownerId);
    setBanks(updated);
    setSelectedBankId(res.bank.id);
    setIsCreateBankOpen(false);

    if (res.isDuplicate) {
      showNotification(`Bài học này đã có sẵn trong kho: "${res.bank.lessonName}". Đã mở bài hiện tại.`, 'info');
    } else {
      showNotification(`Đã tạo bài mới: "${res.bank.lessonName}".`, 'success');
    }
  };

  // Action: Handle Add Question
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLessonTarget) return;

    if (!newQuestionForm.question.trim() || !newQuestionForm.answer.trim()) {
      showNotification('Vui lòng nhập nội dung câu hỏi và đáp án.', 'error');
      return;
    }

    try {
      let targetBankId = activeLessonTarget.bankId;
      if (!targetBankId || activeLessonTarget.isVirtual) {
        const bankRes = createQuestionBank(
          {
            subject: activeLessonTarget.subject,
            grade: activeLessonTarget.grade,
            semester: activeLessonTarget.semester,
            sectionName: activeLessonTarget.sectionName,
            lessonId: activeLessonTarget.lessonId,
            lessonName: activeLessonTarget.lessonName,
          },
          ownerId
        );
        targetBankId = bankRes.bank.id;
      }

      const added = addQuestionToBank(
        {
          bankId: targetBankId,
          question: newQuestionForm.question,
          answer: newQuestionForm.answer,
          level: newQuestionForm.level,
          source: 'manual',
        },
        ownerId
      );

      const refreshed = loadQuestionBanks(ownerId);
      setBanks(refreshed);
      setSelectedBankId(targetBankId);
      setQuestions((prev) => [added, ...prev]);
      setNewQuestionForm({ level: 'basic', question: '', answer: '' });
      setIsAddQuestionOpen(false);
      showNotification('Đã thêm câu hỏi thành công!', 'success');
    } catch (err: any) {
      showNotification(err.message || 'Lỗi thêm câu hỏi', 'error');
    }
  };

  // Action: Handle Update Question
  const handleUpdateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    if (!editingQuestion.question.trim() || !editingQuestion.answer.trim()) {
      showNotification('Vui lòng nhập nội dung câu hỏi và đáp án.', 'error');
      return;
    }

    try {
      const updated = updateQuestion(
        editingQuestion.id,
        {
          question: editingQuestion.question,
          answer: editingQuestion.answer,
          level: editingQuestion.level,
        },
        ownerId
      );

      if (updated) {
        setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
        setEditingQuestion(null);
        showNotification('Đã cập nhật câu hỏi!', 'success');
      }
    } catch (err: any) {
      showNotification(err.message || 'Lỗi cập nhật', 'error');
    }
  };

  // Action: Handle Delete Question
  const handleDeleteQuestion = (id: string) => {
    const success = deleteQuestion(id, ownerId);
    if (success) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setDeletingQuestionId(null);
      showNotification('Đã xóa câu hỏi khỏi bài.', 'success');
    }
  };

  // Action: Handle JSON File Selection
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const handleSelectJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedJson = JSON.parse(event.target?.result as string);
        const validation = validateJsonQuestionBank(parsedJson, questions);
        setJsonPreviewData({
          rawJson: parsedJson,
          validation,
        });
      } catch (err) {
        showNotification('File không phải định dạng JSON hợp lệ.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Action: Confirm JSON Import
  const handleConfirmJsonImport = () => {
    if (!jsonPreviewData || !jsonPreviewData.validation.isValid || !jsonPreviewData.validation.bankData) {
      return;
    }

    const { bankData, validQuestions } = jsonPreviewData.validation;

    // 1. Get or create target bank
    const bankRes = createQuestionBank(
      {
        subject: bankData.subject,
        grade: bankData.grade,
        semester: bankData.semester,
        sectionName: bankData.sectionName,
        lessonId: bankData.lessonId,
        lessonName: bankData.lessonName,
      },
      ownerId
    );

    const targetBank = bankRes.bank;

    // 2. Add non-duplicate valid questions
    const allQuestions = loadAllQuestions(ownerId);
    const existingBankQuestions = allQuestions.filter((q) => q.bankId === targetBank.id);
    const existingIds = new Set(existingBankQuestions.map((q) => q.id));

    const questionsToAdd: ReviewQuestion[] = [];
    const now = new Date().toISOString();

    validQuestions.forEach((vq) => {
      if (!existingIds.has(vq.id)) {
        questionsToAdd.push({
          id: vq.id,
          bankId: targetBank.id,
          question: vq.question,
          answer: vq.answer,
          level: vq.level,
          source: 'import',
          createdAt: now,
          updatedAt: now,
        });
        existingIds.add(vq.id);
      }
    });

    saveQuestions([...questionsToAdd, ...allQuestions], ownerId);

    // Refresh banks and select imported bank
    const updatedBanks = loadQuestionBanks(ownerId);
    setBanks(updatedBanks);
    setSelectedBankId(targetBank.id);
    setQuestions(loadQuestionsForBank(targetBank.id, ownerId));

    const skipped = validQuestions.length - questionsToAdd.length + (jsonPreviewData.validation.duplicateCountWithExistingBank || 0);

    setJsonPreviewData(null);
    showNotification(
      `Đã nhập thành công ${questionsToAdd.length} câu vào bài "${targetBank.lessonName}".${
        skipped > 0 ? ` (Bỏ qua ${skipped} câu trùng ID).` : ''
      }`,
      'success'
    );
  };

  // Action: Handle Excel File Selection
  const excelInputRef = useRef<HTMLInputElement>(null);
  const handleSelectExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parseExcelQuestions(buffer);
        setExcelPreviewData({
          fileBuffer: buffer,
          fileName: file.name,
          parsed,
        });
      } catch (err) {
        showNotification('Không thể đọc file Excel. Vui lòng kiểm tra file.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Action: Confirm Excel Import into current activeBank / activeLessonTarget
  const handleConfirmExcelImport = () => {
    if (!excelPreviewData || !activeLessonTarget) return;

    const validRows = excelPreviewData.parsed.validRows;
    if (validRows.length === 0) {
      showNotification('Không có câu hỏi hợp lệ để nhập.', 'error');
      return;
    }

    let targetBankId = activeLessonTarget.bankId;
    if (!targetBankId || activeLessonTarget.isVirtual) {
      const bankRes = createQuestionBank(
        {
          subject: activeLessonTarget.subject,
          grade: activeLessonTarget.grade,
          semester: activeLessonTarget.semester,
          sectionName: activeLessonTarget.sectionName,
          lessonId: activeLessonTarget.lessonId,
          lessonName: activeLessonTarget.lessonName,
        },
        ownerId
      );
      targetBankId = bankRes.bank.id;
    }

    const allQuestions = loadAllQuestions(ownerId);
    const existingBankQuestions = allQuestions.filter((q) => q.bankId === targetBankId);
    const existingIds = new Set(existingBankQuestions.map((q) => q.id));

    const questionsToAdd: ReviewQuestion[] = [];
    let duplicateSkipped = 0;
    const now = new Date().toISOString();

    validRows.forEach((row) => {
      if (existingIds.has(row.id)) {
        duplicateSkipped++;
        return;
      }

      questionsToAdd.push({
        id: row.id,
        bankId: targetBankId!,
        question: row.question,
        answer: row.answer,
        level: row.level,
        source: 'import',
        createdAt: now,
        updatedAt: now,
      });
      existingIds.add(row.id);
    });

    saveQuestions([...questionsToAdd, ...allQuestions], ownerId);
    const refreshed = loadQuestionBanks(ownerId);
    setBanks(refreshed);
    setSelectedBankId(targetBankId!);
    setQuestions(loadQuestionsForBank(targetBankId!, ownerId));
    setExcelPreviewData(null);

    showNotification(
      `Đã nhập thành công ${questionsToAdd.length} câu từ Excel vào bài "${activeLessonTarget.lessonName}".${
        duplicateSkipped > 0 ? ` (Bỏ qua ${duplicateSkipped} câu trùng ID).` : ''
      }`,
      'success'
    );
  };

  // Action: Export Current Bank to JSON
  const handleExportJson = () => {
    if (!activeLessonTarget || activeLessonTarget.isVirtual || !activeLessonTarget.bankId) {
      showNotification('Bài học này chưa có câu hỏi nào trong kho để xuất.', 'info');
      return;
    }

    const jsonExport = exportBankToJson(activeLessonTarget.bankId, ownerId);
    if (!jsonExport) return;

    const blob = new Blob([JSON.stringify(jsonExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classgo_ktbc_${activeLessonTarget.subject}_K${activeLessonTarget.grade}_${activeLessonTarget.lessonId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification(`Đã xuất file JSON cho bài "${activeLessonTarget.lessonName}".`, 'success');
  };

  // ==============================================================
  // AI QUESTION GENERATION ACTIONS (Phase 2)
  // ==============================================================
  const handleOpenAiModal = (preferredLevel?: ReviewQuestionLevel) => {
    if (!activeLessonTarget) {
      showNotification('Vui lòng chọn bài học trước khi tạo câu hỏi bằng AI.', 'error');
      return;
    }
    setAiStep('CONFIG');
    setAiError(null);
    setAiCount(10);
    // Respect current level filter or preferred level, default to basic
    setAiLevel(
      preferredLevel || (levelFilter === 'advanced' ? 'advanced' : 'basic')
    );
    setAiCustomPrompt('');
    setAiDrafts([]);
    setEditingDraftId(null);
    setIsAiModalOpen(true);
  };

  const handleStartGenerateAi = async () => {
    if (!activeLessonTarget) return;
    setAiError(null);
    setAiStep('GENERATING');

    try {
      const generated = await generateQuestionsViaAi({
        subject: activeLessonTarget.subject,
        bookSeries: activeLessonTarget.bookSeries,
        grade: String(activeLessonTarget.grade),
        semester: activeLessonTarget.semester,
        sectionName: activeLessonTarget.sectionName,
        lessonName: activeLessonTarget.lessonName,
        count: aiCount,
        level: aiLevel, // strictly single level
        customPrompt: aiCustomPrompt.trim() || undefined,
        existingQuestions: questions.map((q) => q.question),
      });

      if (!generated || generated.length === 0) {
        throw new Error(`AI không trả về câu hỏi hợp lệ nào cho mức ${aiLevel === 'basic' ? 'Cơ bản' : 'Nâng cao'}. Vui lòng thử lại.`);
      }

      // Enforce strict level filtering: only keep items matching aiLevel
      const validForLevel = generated.filter((q) => q.level === aiLevel);
      if (validForLevel.length === 0) {
        throw new Error(`Câu hỏi trả về không khớp với mức độ ${aiLevel === 'basic' ? 'Cơ bản' : 'Nâng cao'}. Vui lòng thử lại.`);
      }

      const drafts: GeneratedAiQuestionDraft[] = validForLevel.map((q, idx) => ({
        tempId: `ai-draft-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        level: aiLevel,
        question: q.question,
        answer: q.answer,
        selected: true,
      }));

      setAiDrafts(drafts);
      setAiStep('PREVIEW');
    } catch (err: any) {
      console.error('Failed to generate questions via AI:', err);
      setAiError(err.message || 'Lỗi khi gọi AI. Vui lòng kiểm tra kết nối mạng và thử lại.');
      setAiStep('CONFIG');
    }
  };

  const handleToggleSelectDraft = (tempId: string) => {
    setAiDrafts((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, selected: !d.selected } : d))
    );
  };

  const handleSelectAllDrafts = (selectAll: boolean) => {
    setAiDrafts((prev) => prev.map((d) => ({ ...d, selected: selectAll })));
  };

  const handleDeleteDraft = (tempId: string) => {
    setAiDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
  };

  const handleStartEditDraft = (draft: GeneratedAiQuestionDraft) => {
    setEditingDraftId(draft.tempId);
    setEditDraftForm({
      question: draft.question,
      answer: draft.answer,
    });
  };

  const handleSaveEditDraft = (tempId: string) => {
    if (!editDraftForm.question.trim() || !editDraftForm.answer.trim()) {
      showNotification('Vui lòng không để trống câu hỏi hoặc đáp án.', 'error');
      return;
    }
    setAiDrafts((prev) =>
      prev.map((d) =>
        d.tempId === tempId
          ? {
              ...d,
              question: editDraftForm.question.trim(),
              answer: editDraftForm.answer.trim(),
            }
          : d
      )
    );
    setEditingDraftId(null);
  };

  const handleCancelEditDraft = () => {
    setEditingDraftId(null);
  };

  const handleApproveAiQuestions = () => {
    if (!activeLessonTarget) return;

    const selectedToSave = aiDrafts.filter((d) => d.selected);
    if (selectedToSave.length === 0) {
      showNotification('Vui lòng chọn ít nhất 1 câu hỏi để duyệt lưu vào kho.', 'error');
      return;
    }

    try {
      // 1. If this is a virtual catalog lesson (no bank yet), CREATE THE BANK ON DEMAND ONLY NOW!
      let targetBankId = activeLessonTarget.bankId;
      if (!targetBankId || activeLessonTarget.isVirtual) {
        const bankRes = createQuestionBank(
          {
            subject: activeLessonTarget.subject,
            grade: activeLessonTarget.grade,
            semester: activeLessonTarget.semester,
            sectionName: activeLessonTarget.sectionName,
            lessonId: activeLessonTarget.lessonId,
            lessonName: activeLessonTarget.lessonName,
          },
          ownerId
        );
        targetBankId = bankRes.bank.id;
      }

      // Check existing questions in target bank to prevent duplicate saving
      const existingBankQuestions = loadQuestionsForBank(targetBankId, ownerId);
      const existingQuestionTexts = new Set(
        existingBankQuestions.map((q) => q.question.trim().toLowerCase())
      );

      let duplicateCount = 0;
      const addedQuestions: ReviewQuestion[] = [];

      for (const draft of selectedToSave) {
        const normalized = draft.question.trim().toLowerCase();
        if (existingQuestionTexts.has(normalized)) {
          duplicateCount++;
          continue;
        }
        existingQuestionTexts.add(normalized);

        const added = addQuestionToBank(
          {
            bankId: targetBankId,
            question: draft.question,
            answer: draft.answer,
            level: draft.level, // strictly 'basic' or 'advanced'
            source: 'ai',
          },
          ownerId
        );
        addedQuestions.push(added);
      }

      // Refresh banks list and update current selection to the real bank
      const updatedBanks = loadQuestionBanks(ownerId);
      setBanks(updatedBanks);
      setSelectedBankId(targetBankId);
      setQuestions(loadQuestionsForBank(targetBankId, ownerId));
      setIsAiModalOpen(false);
      setAiDrafts([]);

      if (addedQuestions.length === 0 && duplicateCount > 0) {
        showNotification(
          `Tất cả ${duplicateCount} câu hỏi được chọn đều đã có trong bài học (trùng nội dung).`,
          'info'
        );
      } else {
        showNotification(
          `Đã duyệt & lưu thành công ${addedQuestions.length} câu hỏi ${
            aiLevel === 'basic' ? 'Cơ bản' : 'Nâng cao'
          } do AI tạo vào bài "${activeLessonTarget.lessonName}"!${
            duplicateCount > 0 ? ` (Bỏ qua ${duplicateCount} câu bị trùng).` : ''
          }`,
          'success'
        );
      }
    } catch (err: any) {
      showNotification(err.message || 'Lỗi khi lưu câu hỏi vào kho.', 'error');
    }
  };

  // ==============================================================
  // BATCH AI QUESTION GENERATION ACTIONS (Phase 3)
  // ==============================================================

  // Helper to sync lesson list based on subject, bookSeries, grade, volume, semester, chapterId
  const syncBatchLessonsList = (
    subj: string,
    bookSeries: string,
    grd: string,
    vol: 'ALL' | '1' | '2',
    sem: string,
    chapId: string,
    customLessonsToKeep: Array<{ id: string; lessonName: string; selected: boolean }> = []
  ) => {
    if (subj === 'Toán' && bookSeries === 'KNTT') {
      const items = getKnttCatalogLessonsWithBankStatus(
        grd,
        vol,
        chapId,
        banks,
        (bId) => {
          const bQs = loadQuestionsForBank(bId, ownerId);
          return {
            basic: bQs.filter((q) => q.level === 'basic').length,
            advanced: bQs.filter((q) => q.level === 'advanced').length,
            total: bQs.length,
          };
        }
      );

      const mapped = items.map((it) => ({
        id: it.id,
        lessonName: it.fullTitle,
        chapterName: it.fullChapterTitle,
        bankId: it.bankId,
        hasBank: it.hasBank,
        selected: true,
        basicCount: batchBasicCount,
        advancedCount: batchAdvancedCount,
        existingCount: it.existingCounts,
      }));

      // Also preserve any manually added custom lessons not yet in bank
      const existingLessonNames = new Set(mapped.map((b) => b.lessonName.toLowerCase().trim()));
      const additional = customLessonsToKeep
        .filter((c) => !existingLessonNames.has(c.lessonName.toLowerCase().trim()))
        .map((c) => ({
          id: c.id,
          lessonName: c.lessonName,
          chapterName: 'Bài tự nhập',
          bankId: undefined,
          hasBank: false,
          selected: c.selected,
          basicCount: batchBasicCount,
          advancedCount: batchAdvancedCount,
          existingCount: undefined,
        }));

      setBatchLessonsList([...mapped, ...additional]);
      return;
    }

    // Fallback for other subjects
    const allQ = loadAllQuestions(ownerId);
    const matchedBanks = banks.filter((b) => {
      const matchSub = b.subject.toLowerCase() === subj.toLowerCase();
      const matchGrd = String(b.grade) === String(grd);
      const matchSem = !sem || (b.semester || '1') === sem;
      const matchSec = !chapId || chapId === 'ALL' || (b.sectionName || '').toLowerCase() === chapId.toLowerCase();
      return matchSub && matchGrd && matchSem && matchSec;
    });

    const bankItems = matchedBanks.map((b) => {
      const bQs = allQ.filter((q) => q.bankId === b.id);
      return {
        id: b.id,
        lessonName: b.lessonName,
        chapterName: b.sectionName || '',
        bankId: b.id,
        hasBank: true,
        selected: true,
        basicCount: batchBasicCount,
        advancedCount: batchAdvancedCount,
        existingCount: {
          basic: bQs.filter((q) => q.level === 'basic').length,
          advanced: bQs.filter((q) => q.level === 'advanced').length,
          total: bQs.length,
        },
      };
    });

    setBatchLessonsList([...bankItems]);
  };

  const handleOpenBatchAiModal = () => {
    const initSub = activeLessonTarget?.subject || (subjectFilter !== 'ALL' ? subjectFilter : 'Toán');
    const initBook = initSub === 'Toán' ? bookSeriesFilter : 'KNTT';
    const initGrd = activeLessonTarget ? String(activeLessonTarget.grade) : (gradeFilter !== 'ALL' ? gradeFilter : '7');
    const initVol = volumeFilter;
    const initSem = activeLessonTarget?.semester || (semesterFilter !== 'ALL' ? semesterFilter : '1');

    let initChapId = 'ALL';
    let initSecName = '';
    if (initSub === 'Toán' && initBook === 'KNTT') {
      const chaps = getKnttChapters(initGrd, initVol);
      if (sectionFilter !== 'ALL') {
        initChapId = sectionFilter;
        const found = chaps.find((c) => c.id === sectionFilter);
        if (found) initSecName = formatKnttChapterTitle(found);
      } else if (chaps.length > 0) {
        initChapId = chaps[0].id;
        initSecName = formatKnttChapterTitle(chaps[0]);
      }
    } else {
      initSecName = activeLessonTarget?.sectionName || (sectionFilter !== 'ALL' ? sectionFilter : 'Chương 1');
    }

    setBatchSubject(initSub);
    setBatchBookSeries(initBook);
    setBatchGrade(initGrd);
    setBatchVolume(initVol);
    setBatchSemester(initSem);
    setBatchChapterId(initChapId);
    setBatchSectionName(initSecName);
    setBatchBasicCount(10);
    setBatchAdvancedCount(5);
    setBatchCustomPrompt('');
    setBatchError(null);
    setNewLessonInput('');
    setBatchResults([]);
    setEditingBatchDraft(null);

    syncBatchLessonsList(initSub, initBook, initGrd, initVol, initSem, initChapId);

    setBatchAiStep('CONFIG');
    setIsBatchAiModalOpen(true);
  };

  const handleBatchSubjectChange = (newSub: string) => {
    setBatchSubject(newSub);
    syncBatchLessonsList(newSub, batchBookSeries, batchGrade, batchVolume, batchSemester, batchChapterId);
  };

  const handleBatchBookSeriesChange = (newBook: string) => {
    setBatchBookSeries(newBook);
    syncBatchLessonsList(batchSubject, newBook, batchGrade, batchVolume, batchSemester, batchChapterId);
  };

  const handleBatchGradeChange = (newGrd: string) => {
    setBatchGrade(newGrd);
    let newChapId = batchChapterId;
    let newSecName = batchSectionName;
    if (batchSubject === 'Toán' && batchBookSeries === 'KNTT') {
      const chaps = getKnttChapters(newGrd, batchVolume);
      if (chaps.length > 0) {
        newChapId = chaps[0].id;
        newSecName = formatKnttChapterTitle(chaps[0]);
      } else {
        newChapId = 'ALL';
      }
      setBatchChapterId(newChapId);
      setBatchSectionName(newSecName);
    }
    syncBatchLessonsList(batchSubject, batchBookSeries, newGrd, batchVolume, batchSemester, newChapId);
  };

  const handleBatchVolumeChange = (newVol: 'ALL' | '1' | '2') => {
    setBatchVolume(newVol);
    let newChapId = batchChapterId;
    let newSecName = batchSectionName;
    if (batchSubject === 'Toán' && batchBookSeries === 'KNTT') {
      const chaps = getKnttChapters(batchGrade, newVol);
      if (chaps.length > 0) {
        newChapId = chaps[0].id;
        newSecName = formatKnttChapterTitle(chaps[0]);
      } else {
        newChapId = 'ALL';
      }
      setBatchChapterId(newChapId);
      setBatchSectionName(newSecName);
    }
    syncBatchLessonsList(batchSubject, batchBookSeries, batchGrade, newVol, batchSemester, newChapId);
  };

  const handleBatchSemesterChange = (newSem: string) => {
    setBatchSemester(newSem);
    syncBatchLessonsList(batchSubject, batchBookSeries, batchGrade, batchVolume, newSem, batchChapterId);
  };

  const handleBatchChapterChange = (newChapId: string) => {
    setBatchChapterId(newChapId);
    if (batchSubject === 'Toán' && batchBookSeries === 'KNTT') {
      if (newChapId === 'ALL') {
        setBatchSectionName('Tất cả các chương');
      } else {
        const found = getKnttChapters(batchGrade, batchVolume).find((c) => c.id === newChapId);
        if (found) setBatchSectionName(formatKnttChapterTitle(found));
      }
    }
    syncBatchLessonsList(batchSubject, batchBookSeries, batchGrade, batchVolume, batchSemester, newChapId);
  };

  const handleToggleSelectBatchLesson = (id: string) => {
    setBatchLessonsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAllBatchLessons = (selectAll: boolean) => {
    setBatchLessonsList((prev) => prev.map((item) => ({ ...item, selected: selectAll })));
  };

  const handleUpdateLessonCustomCount = (lessonId: string, level: 'basic' | 'advanced', count: number) => {
    setBatchLessonsList((prev) =>
      prev.map((item) => {
        if (item.id === lessonId) {
          return {
            ...item,
            [level === 'basic' ? 'basicCount' : 'advancedCount']: count,
          };
        }
        return item;
      })
    );
  };

  const handleApplyCountsToAllBatchLessons = (basic: number, adv: number) => {
    setBatchLessonsList((prev) =>
      prev.map((item) => ({
        ...item,
        basicCount: basic,
        advancedCount: adv,
      }))
    );
    showNotification(`Đã áp dụng ${basic} câu Cơ bản & ${adv} câu Nâng cao cho tất cả bài trong danh sách.`, 'info');
  };

  const handleAddCustomBatchLesson = () => {
    const trimmed = newLessonInput.trim();
    if (!trimmed) return;

    const exists = batchLessonsList.some(
      (l) => l.lessonName.toLowerCase().trim() === trimmed.toLowerCase()
    );
    if (exists) {
      showNotification(`Bài "${trimmed}" đã có trong danh sách.`, 'info');
      setNewLessonInput('');
      return;
    }

    const newItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      lessonName: trimmed,
      chapterName: 'Bài tự nhập',
      hasBank: false,
      selected: true,
      basicCount: batchBasicCount,
      advancedCount: batchAdvancedCount,
    };

    setBatchLessonsList((prev) => [...prev, newItem]);
    setNewLessonInput('');
  };

  const handleRemoveBatchLesson = (id: string) => {
    setBatchLessonsList((prev) => prev.filter((item) => item.id !== id));
  };

  // START BATCH GENERATION EXECUTION
  const handleStartGenerateBatchAi = async () => {
    const selected = batchLessonsList.filter((l) => l.selected);
    if (selected.length === 0) {
      setBatchError('Vui lòng chọn ít nhất 1 bài học để tạo câu hỏi.');
      return;
    }

    setBatchError(null);
    setBatchAiStep('GENERATING');
    isBatchCancelledRef.current = false;

    // Initialize initial pending results
    const initialResults = selected.map((item) => ({
      lessonId: item.id,
      lessonName: item.lessonName,
      chapterName: item.chapterName,
      bankId: item.bankId,
      status: 'pending' as const,
      drafts: [] as GeneratedAiQuestionDraft[],
      expanded: true,
    }));
    setBatchResults(initialResults);

    const totalSteps = selected.length;
    const allQuestions = loadAllQuestions(ownerId);

    // Run sequentially through each selected lesson
    for (let i = 0; i < selected.length; i++) {
      if (isBatchCancelledRef.current) {
        break;
      }

      const currentLesson = selected[i];
      const lessonBasic = currentLesson.basicCount ?? batchBasicCount;
      const lessonAdv = currentLesson.advancedCount ?? batchAdvancedCount;

      if (lessonBasic === 0 && lessonAdv === 0) {
        setBatchResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'success', drafts: [] } : r))
        );
        continue;
      }

      // Update progress
      setBatchProgress({
        currentIndex: i + 1,
        totalLessons: totalSteps,
        currentLessonName: currentLesson.lessonName,
        currentStage: lessonBasic > 0 ? 'basic' : 'advanced',
        percent: Math.round((i / totalSteps) * 100),
      });

      // Update status to generating
      setBatchResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'generating' } : r))
      );

      // Existing questions for this bank to prevent repetitive questions
      let existingTexts: string[] = [];
      if (currentLesson.bankId) {
        existingTexts = allQuestions
          .filter((q) => q.bankId === currentLesson.bankId)
          .map((q) => q.question);
      }

      try {
        const drafts = await generateLessonBatchQuestions({
          subject: batchSubject.trim(),
          bookSeries: (batchSubject === 'Toán' && batchBookSeries === 'KNTT') ? BOOK_SERIES_KNTT_NAME : undefined,
          grade: String(batchGrade).trim(),
          semester: batchSemester.trim(),
          sectionName: currentLesson.chapterName || batchSectionName.trim(),
          lessonName: currentLesson.lessonName.trim(),
          basicCount: lessonBasic,
          advancedCount: lessonAdv,
          customPrompt: batchCustomPrompt.trim() || undefined,
          existingQuestions: existingTexts,
          onProgress: (stage) => {
            setBatchProgress((prev) => ({
              ...prev,
              currentStage: stage,
            }));
          },
        });

        // Mark this lesson as success with generated drafts
        setBatchResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'success',
                  drafts,
                  expanded: true,
                }
              : r
          )
        );
      } catch (genErr: any) {
        console.error(`Error generating batch questions for lesson ${currentLesson.lessonName}:`, genErr);
        setBatchResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'error',
                  errorMessage: genErr?.message || 'Lỗi khi gọi AI cho bài này.',
                  drafts: [],
                  expanded: true,
                }
              : r
          )
        );
      }
    }

    setBatchProgress((prev) => ({
      ...prev,
      percent: 100,
      currentStage: 'idle',
    }));

    setBatchAiStep('PREVIEW');
  };

  const handleCancelBatchGeneration = () => {
    isBatchCancelledRef.current = true;
    setBatchAiStep('PREVIEW');
    showNotification('Đã dừng tiến trình tạo câu hỏi hàng loạt.', 'info');
  };

  // PREVIEW BATCH ACTIONS
  const handleToggleSelectAllBatchQuestions = (selectAll: boolean) => {
    setBatchResults((prev) =>
      prev.map((lesson) => ({
        ...lesson,
        drafts: lesson.drafts.map((d) => ({ ...d, selected: selectAll })),
      }))
    );
  };

  const handleToggleSelectLessonQuestions = (lessonIndex: number, selectAll: boolean) => {
    setBatchResults((prev) =>
      prev.map((lesson, idx) =>
        idx === lessonIndex
          ? {
              ...lesson,
              drafts: lesson.drafts.map((d) => ({ ...d, selected: selectAll })),
            }
          : lesson
      )
    );
  };

  const handleToggleSelectBatchDraft = (lessonIndex: number, tempId: string) => {
    setBatchResults((prev) =>
      prev.map((lesson, idx) =>
        idx === lessonIndex
          ? {
              ...lesson,
              drafts: lesson.drafts.map((d) =>
                d.tempId === tempId ? { ...d, selected: !d.selected } : d
              ),
            }
          : lesson
      )
    );
  };

  const handleDeleteBatchDraft = (lessonIndex: number, tempId: string) => {
    setBatchResults((prev) =>
      prev.map((lesson, idx) =>
        idx === lessonIndex
          ? {
              ...lesson,
              drafts: lesson.drafts.filter((d) => d.tempId !== tempId),
            }
          : lesson
      )
    );
  };

  const handleStartEditBatchDraft = (
    lessonIndex: number,
    draft: GeneratedAiQuestionDraft
  ) => {
    setEditingBatchDraft({
      lessonIndex,
      tempId: draft.tempId,
      question: draft.question,
      answer: draft.answer,
    });
  };

  const handleSaveEditBatchDraft = () => {
    if (!editingBatchDraft) return;
    if (!editingBatchDraft.question.trim() || !editingBatchDraft.answer.trim()) {
      showNotification('Vui lòng không để trống câu hỏi hoặc đáp án.', 'error');
      return;
    }

    setBatchResults((prev) =>
      prev.map((lesson, idx) =>
        idx === editingBatchDraft.lessonIndex
          ? {
              ...lesson,
              drafts: lesson.drafts.map((d) =>
                d.tempId === editingBatchDraft.tempId
                  ? {
                      ...d,
                      question: editingBatchDraft.question.trim(),
                      answer: editingBatchDraft.answer.trim(),
                    }
                  : d
              ),
            }
          : lesson
      )
    );
    setEditingBatchDraft(null);
  };

  const handleCancelEditBatchDraft = () => {
    setEditingBatchDraft(null);
  };

  const handleToggleExpandLesson = (lessonIndex: number) => {
    setBatchResults((prev) =>
      prev.map((lesson, idx) =>
        idx === lessonIndex ? { ...lesson, expanded: !lesson.expanded } : lesson
      )
    );
  };

  const handleExpandAllLessons = (expand: boolean) => {
    setBatchResults((prev) => prev.map((lesson) => ({ ...lesson, expanded: expand })));
  };

  // Retry a single failed lesson
  const handleRetryLessonInBatch = async (lessonIndex: number) => {
    const target = batchResults[lessonIndex];
    if (!target) return;

    setBatchResults((prev) =>
      prev.map((l, idx) => (idx === lessonIndex ? { ...l, status: 'generating', errorMessage: undefined } : l))
    );

    try {
      const allQuestions = loadAllQuestions(ownerId);
      let existingTexts: string[] = [];
      if (target.bankId) {
        existingTexts = allQuestions.filter((q) => q.bankId === target.bankId).map((q) => q.question);
      }

      const matchItem = batchLessonsList.find((b) => b.id === target.lessonId);
      const lessonBasic = matchItem?.basicCount ?? batchBasicCount;
      const lessonAdv = matchItem?.advancedCount ?? batchAdvancedCount;

      const drafts = await generateLessonBatchQuestions({
        subject: batchSubject.trim(),
        bookSeries: (batchSubject === 'Toán' && batchBookSeries === 'KNTT') ? BOOK_SERIES_KNTT_NAME : undefined,
        grade: String(batchGrade).trim(),
        semester: batchSemester.trim(),
        sectionName: (target as any).chapterName || batchSectionName.trim(),
        lessonName: target.lessonName.trim(),
        basicCount: lessonBasic,
        advancedCount: lessonAdv,
        customPrompt: batchCustomPrompt.trim() || undefined,
        existingQuestions: existingTexts,
      });

      setBatchResults((prev) =>
        prev.map((l, idx) =>
          idx === lessonIndex
            ? {
                ...l,
                status: 'success',
                drafts,
                expanded: true,
              }
            : l
        )
      );
      showNotification(`Đã tạo thành công câu hỏi cho "${target.lessonName}".`, 'success');
    } catch (err: any) {
      setBatchResults((prev) =>
        prev.map((l, idx) =>
          idx === lessonIndex
            ? {
                ...l,
                status: 'error',
                errorMessage: err?.message || 'Lỗi khi tạo câu hỏi.',
              }
            : l
        )
      );
      showNotification(`Lỗi khi tạo câu hỏi: ${err.message}`, 'error');
    }
  };

  // APPROVE & SAVE ALL BATCH QUESTIONS INTO SYSTEM QUESTION BANKS
  const handleApproveAndSaveBatchAll = () => {
    const totalSelected = batchResults.reduce(
      (sum, lesson) => sum + lesson.drafts.filter((d) => d.selected).length,
      0
    );

    if (totalSelected === 0) {
      showNotification('Vui lòng chọn ít nhất 1 câu hỏi để duyệt và lưu.', 'error');
      return;
    }

    try {
      let totalAddedCount = 0;
      let totalDuplicateCount = 0;
      let savedLessonsCount = 0;
      const allBanks = loadQuestionBanks(ownerId);

      for (const lesson of batchResults) {
        const selectedDrafts = lesson.drafts.filter((d) => d.selected);
        if (selectedDrafts.length === 0) continue;

        // 1. Get or create target bank
        let targetBank: ReviewQuestionBank;
        if (lesson.bankId) {
          const matched = allBanks.find((b) => b.id === lesson.bankId);
          if (matched) {
            targetBank = matched;
          } else {
            const bankRes = createQuestionBank(
              {
                subject: batchSubject.trim(),
                grade: String(batchGrade).trim(),
                semester: batchSemester.trim(),
                sectionName: (lesson as any).chapterName || batchSectionName.trim(),
                lessonId: lesson.lessonId,
                lessonName: lesson.lessonName.trim(),
              },
              ownerId
            );
            targetBank = bankRes.bank;
          }
        } else {
          const bankRes = createQuestionBank(
            {
              subject: batchSubject.trim(),
              grade: String(batchGrade).trim(),
              semester: batchSemester.trim(),
              sectionName: (lesson as any).chapterName || batchSectionName.trim(),
              lessonId: lesson.lessonId,
              lessonName: lesson.lessonName.trim(),
            },
            ownerId
          );
          targetBank = bankRes.bank;
        }

        const existingBankQuestions = loadQuestionsForBank(targetBank.id, ownerId);
        const existingTexts = new Set(
          existingBankQuestions.map((q) => q.question.trim().toLowerCase())
        );

        let lessonAdded = 0;
        for (const draft of selectedDrafts) {
          const norm = draft.question.trim().toLowerCase();
          if (existingTexts.has(norm)) {
            totalDuplicateCount++;
            continue;
          }
          existingTexts.add(norm);

          addQuestionToBank(
            {
              bankId: targetBank.id,
              question: draft.question,
              answer: draft.answer,
              level: draft.level,
              source: 'ai',
            },
            ownerId
          );
          lessonAdded++;
          totalAddedCount++;
        }

        if (lessonAdded > 0) {
          savedLessonsCount++;
        }
      }

      const refreshedBanks = loadQuestionBanks(ownerId);
      setBanks(refreshedBanks);

      if (selectedBankId) {
        setQuestions(loadQuestionsForBank(selectedBankId, ownerId));
      }

      setIsBatchAiModalOpen(false);
      setBatchResults([]);

      showNotification(
        `Đã duyệt & lưu thành công ${totalAddedCount} câu hỏi do AI tạo vào ${savedLessonsCount} bài học!${
          totalDuplicateCount > 0 ? ` (Bỏ qua ${totalDuplicateCount} câu trùng lặp).` : ''
        }`,
        'success'
      );
    } catch (err: any) {
      console.error('Error saving batch questions:', err);
      showNotification(err.message || 'Lỗi khi lưu danh sách câu hỏi hàng loạt.', 'error');
    }
  };

  // Quick save for a single lesson in the batch
  const handleSaveSingleLessonInBatch = (lessonIndex: number) => {
    const lesson = batchResults[lessonIndex];
    if (!lesson) return;

    const selectedDrafts = lesson.drafts.filter((d) => d.selected);
    if (selectedDrafts.length === 0) {
      showNotification('Vui lòng chọn ít nhất 1 câu hỏi trong bài này.', 'error');
      return;
    }

    try {
      const bankRes = createQuestionBank(
        {
          subject: batchSubject.trim(),
          grade: String(batchGrade).trim(),
          semester: batchSemester.trim(),
          sectionName: batchSectionName.trim(),
          lessonName: lesson.lessonName.trim(),
        },
        ownerId
      );
      const targetBank = bankRes.bank;

      const existingBankQuestions = loadQuestionsForBank(targetBank.id, ownerId);
      const existingTexts = new Set(
        existingBankQuestions.map((q) => q.question.trim().toLowerCase())
      );

      let addedCount = 0;
      let dupCount = 0;

      for (const draft of selectedDrafts) {
        const norm = draft.question.trim().toLowerCase();
        if (existingTexts.has(norm)) {
          dupCount++;
          continue;
        }
        existingTexts.add(norm);

        addQuestionToBank(
          {
            bankId: targetBank.id,
            question: draft.question,
            answer: draft.answer,
            level: draft.level,
            source: 'ai',
          },
          ownerId
        );
        addedCount++;
      }

      setBatchResults((prev) =>
        prev.map((l, idx) => (idx === lessonIndex ? { ...l, saved: true } : l))
      );

      const refreshedBanks = loadQuestionBanks(ownerId);
      setBanks(refreshedBanks);
      if (selectedBankId) {
        setQuestions(loadQuestionsForBank(selectedBankId, ownerId));
      }

      showNotification(
        `Đã lưu ${addedCount} câu hỏi vào bài "${lesson.lessonName}"!${
          dupCount > 0 ? ` (Bỏ qua ${dupCount} câu trùng).` : ''
        }`,
        'success'
      );
    } catch (err: any) {
      showNotification(err.message || 'Lỗi khi lưu bài.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Hidden File Inputs */}
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleSelectJsonFile}
      />
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={handleSelectExcelFile}
      />

      {/* Toast Notification */}
      {notice && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold transition-all border animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/60 text-rose-200'
              : 'bg-indigo-950/95 border-indigo-500/60 text-indigo-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : notice.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-400" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* TOP HEADER & CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <span>KHO CÂU HỎI KIỂM TRA BÀI CŨ</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold normal-case">
                  Đa môn • Cơ bản & Nâng cao
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Phục vụ gọi học sinh lên bảng và sẵn sàng tích hợp Ô Cửa Bí Mật
              </p>
            </div>
          </div>

          {/* Quick Action: New Bank & Batch AI Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenBatchAiModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-450 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/25 transition-all hover:scale-102 cursor-pointer"
              title="Tạo câu hỏi AI cho nhiều bài học cùng lúc"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>✨ Tạo Hàng Loạt Bằng AI</span>
            </button>
            <button
              onClick={() => setIsCreateBankOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo Bài / Kho Mới</span>
            </button>
          </div>
        </div>

        {/* CASCADING FILTER DROPDOWNS: Môn -> Bộ sách -> Khối -> Tập -> Học kỳ -> Chương */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
          {/* Môn */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Môn học</label>
            <div className="relative">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 appearance-none pr-8 truncate"
              >
                <option value="ALL">Tất cả môn ({subjects.length})</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Bộ sách */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bộ sách</label>
            <div className="relative">
              <select
                value={bookSeriesFilter}
                onChange={(e) => setBookSeriesFilter(e.target.value as any)}
                className="w-full bg-slate-800 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-400 appearance-none pr-8 truncate"
              >
                <option value="KNTT">Kết nối tri thức (KNTT)</option>
                <option value="ALL">Tất cả / Tự do</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Khối */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Khối lớp</label>
            <div className="relative">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 appearance-none pr-8 truncate"
              >
                <option value="ALL">Tất cả khối</option>
                {grades.map((gr) => (
                  <option key={gr} value={gr}>
                    Khối {gr}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Tập (SGK KNTT) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tập SGK</label>
            <div className="relative">
              <select
                value={volumeFilter}
                onChange={(e) => setVolumeFilter(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 appearance-none pr-8 truncate"
              >
                <option value="ALL">Cả 2 tập</option>
                <option value="1">Tập 1</option>
                <option value="2">Tập 2</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Học kỳ */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Học kỳ</label>
            <div className="relative">
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 appearance-none pr-8 truncate"
              >
                <option value="ALL">Tất cả kỳ</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Học kỳ {sem}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Chương / Chủ đề */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Chương / Chủ đề
            </label>
            <div className="relative">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 appearance-none pr-8 truncate"
              >
                <option value="ALL">Tất cả chương ({sections.length})</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* CHỌN BÀI HỌC (LESSON SELECTOR) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 whitespace-nowrap">📖 BÀI HỌC:</span>
            <div className="relative flex-1">
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-amber-200 font-bold focus:outline-none focus:border-amber-400 appearance-none pr-8 truncate shadow-inner"
              >
                {bookSeriesFilter === 'KNTT' && (subjectFilter === 'Toán' || subjectFilter === 'ALL') ? (
                  catalogLessonItems.length === 0 ? (
                    <option value="">Không có bài học nào trong danh mục khớp bộ lọc</option>
                  ) : (
                    catalogLessonItems.map((item) => {
                      const value = item.hasBank && item.bankId ? item.bankId : `kntt-virtual:${item.id}`;
                      const countText =
                        item.hasBank && item.questionCount.total > 0
                          ? `(${item.questionCount.total} câu: ${item.questionCount.basic} CB • ${item.questionCount.advanced} NC)`
                          : `(Chưa có câu hỏi)`;
                      return (
                        <option key={item.id} value={value}>
                          [K{item.grade} • T{item.volume}] {item.fullTitle} {countText}
                        </option>
                      );
                    })
                  )
                ) : filteredBanks.length === 0 ? (
                  <option value="">Chưa có bài nào khớp với bộ lọc</option>
                ) : (
                  filteredBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.subject} - K{b.grade}] {b.lessonName}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-amber-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Quick Bank Details Badge */}
          {activeLessonTarget?.isVirtual ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>KNTT • Chưa có câu hỏi</span>
              </span>
            </div>
          ) : activeBank ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-500/40 text-sky-300 font-bold">
                Cơ bản: {stats.basic} câu
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold">
                Nâng cao: {stats.advanced} câu
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                Tổng: {stats.total} câu
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ACTIVE LESSON ACTION BAR & FILTERS */}
      {activeBank ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            {/* Left: Level Filters & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80">
                <button
                  onClick={() => setLevelFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    levelFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  onClick={() => setLevelFilter('basic')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    levelFilter === 'basic'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-sky-300'
                  }`}
                >
                  Cơ bản ({stats.basic})
                </button>
                <button
                  onClick={() => setLevelFilter('advanced')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    levelFilter === 'advanced'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-purple-300'
                  }`}
                >
                  Nâng cao ({stats.advanced})
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm câu hỏi, đáp án..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Action Buttons (+ Thêm câu, Nhập JSON, Nhập Excel, Xuất JSON) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setShowAllAnswers(!showAllAnswers)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5"
                title={showAllAnswers ? 'Ẩn đáp án' : 'Hiện đáp án'}
              >
                {showAllAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{showAllAnswers ? 'Ẩn đáp án' : 'Hiện đáp án'}</span>
              </button>

              {/* Nút Tạo Câu Hỏi Bằng AI */}
              <button
                onClick={() => handleOpenAiModal()}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-450 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all hover:scale-102 cursor-pointer"
                title="Tạo câu hỏi tự động bằng AI cho bài học này"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>✨ Tạo bằng AI</span>
              </button>

              <button
                onClick={() => handleOpenBatchAiModal()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-102 cursor-pointer"
                title="Tạo hàng loạt câu hỏi cho nhiều bài trong chương"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Tạo hàng loạt</span>
              </button>

              {/* Nút Ô Cửa Bí Mật */}
              <button
                onClick={() => setIsMysteryDoorOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-purple-600/25 transition-all hover:scale-102 cursor-pointer"
                title="Mở trò chơi Ô Cửa Bí Mật cho bài học này"
              >
                <span>🚪</span>
                <span>Ô cửa bí mật</span>
              </button>

              <button
                onClick={() => setIsAddQuestionOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm câu</span>
              </button>

              <button
                onClick={() => jsonInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Nhập câu hỏi từ file JSON chuẩn ClassGo"
              >
                <FileJson className="w-3.5 h-3.5 text-sky-400" />
                <span>Nhập JSON</span>
              </button>

              <button
                onClick={() => excelInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Nhập câu hỏi từ bảng tính Excel (Mức độ, Câu hỏi, Đáp án)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nhập Excel</span>
              </button>

              <button
                onClick={handleExportJson}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Xuất bài học hiện tại ra file JSON"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Xuất JSON</span>
              </button>
            </div>
          </div>

          {/* QUESTIONS LIST / EMPTY STATE */}
          {displayedQuestions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
                {activeLessonTarget?.isVirtual ? '📚' : '📖'}
              </div>
              <div className="max-w-lg space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-slate-200">
                  {activeLessonTarget?.isVirtual
                    ? `Bài "${activeLessonTarget.lessonName}" chưa có câu hỏi trong kho.`
                    : questions.length === 0
                    ? 'Bài này chưa có câu hỏi.'
                    : 'Không tìm thấy câu hỏi nào phù hợp với bộ lọc.'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeLessonTarget?.isVirtual
                    ? `Bài học này thuộc SGK Toán ${activeLessonTarget.grade} - Kết nối tri thức (${activeLessonTarget.chapterName || 'Chương SGK'}). Thầy cô có thể tạo câu hỏi tự động bằng AI chuẩn kiến thức THCS, hoặc thêm câu hỏi thủ công / nhập từ Excel.`
                    : questions.length === 0
                    ? 'Thầy cô có thể thêm câu hỏi thủ công hoặc nhập nhanh từ file JSON / Excel.'
                    : 'Thử đổi mức độ hoặc xóa từ khóa tìm kiếm.'}
                </p>
              </div>

              {(activeLessonTarget?.isVirtual || questions.length === 0) && (
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    onClick={() => handleOpenAiModal()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-450 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all hover:scale-105 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>✨ Tạo câu hỏi bằng AI ngay</span>
                  </button>
                  <button
                    onClick={() => setIsAddQuestionOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Thêm thủ công</span>
                  </button>
                  <button
                    onClick={() => excelInputRef.current?.click()}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Nhập Excel</span>
                  </button>
                  <button
                    onClick={() => jsonInputRef.current?.click()}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileJson className="w-4 h-4 text-sky-400" />
                    <span>Nhập JSON</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {displayedQuestions.map((q, idx) => {
                const isBasic = q.level === 'basic';
                return (
                  <div
                    key={q.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all shadow-md group relative"
                  >
                    {/* Header: Level & Source Badge & Actions */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          #{idx + 1}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                            isBasic
                              ? 'bg-sky-950/90 text-sky-300 border border-sky-500/40'
                              : 'bg-purple-950/90 text-purple-300 border border-purple-500/40'
                          }`}
                        >
                          {isBasic ? 'CƠ BẢN' : 'NÂNG CAO'}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            q.source === 'ai'
                              ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {q.source === 'builtin'
                            ? 'Mẫu hệ thống'
                            : q.source === 'import'
                            ? 'Nhập file'
                            : q.source === 'ai'
                            ? '✨ AI tạo'
                            : 'Thủ công'}
                        </span>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingQuestion(q)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 transition-colors"
                          title="Sửa câu hỏi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingQuestionId(q.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 transition-colors"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-1.5 flex-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        Câu hỏi:
                      </div>
                      <p className="text-sm text-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                        {q.question}
                      </p>
                    </div>

                    {/* Answer Content */}
                    {showAllAnswers && (
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Đáp án / Gợi ý trả lời:</span>
                        </div>
                        <p className="text-xs text-emerald-300/90 font-mono whitespace-pre-wrap leading-relaxed">
                          {q.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <p className="text-slate-300 text-sm">Chưa có bài học nào được chọn hoặc tạo.</p>
          <button
            onClick={() => setIsCreateBankOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            + Tạo Bài / Kho Mới
          </button>
        </div>
      )}

      {/* ==============================================================
          MODAL: TẠO BÀI HỌC / BANK MỚI
         ============================================================== */}
      {isCreateBankOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Tạo Bài Học / Kho Câu Hỏi Mới</h3>
              </div>
              <button
                onClick={() => setIsCreateBankOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBank} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Môn học *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Toán, Ngữ văn, KHTN..."
                    value={newBankForm.subject}
                    onChange={(e) => setNewBankForm({ ...newBankForm, subject: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Khối lớp *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 7, 8, 6, 9, 10..."
                    value={newBankForm.grade}
                    onChange={(e) => setNewBankForm({ ...newBankForm, grade: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Học kỳ</label>
                  <select
                    value={newBankForm.semester}
                    onChange={(e) => setNewBankForm({ ...newBankForm, semester: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1">Học kỳ 1</option>
                    <option value="2">Học kỳ 2</option>
                    <option value="Cả năm">Cả năm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chương / Chủ đề</label>
                  <input
                    type="text"
                    placeholder="VD: Chương 1, Unit 3..."
                    value={newBankForm.sectionName}
                    onChange={(e) => setNewBankForm({ ...newBankForm, sectionName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tên bài học *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Bài 3: Hằng đẳng thức đáng nhớ"
                  value={newBankForm.lessonName}
                  onChange={(e) => setNewBankForm({ ...newBankForm, lessonName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBankOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  Tạo Bài Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: THÊM CÂU HỎI THỦ CÔNG
         ============================================================== */}
      {isAddQuestionOpen && activeBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Thêm Câu Hỏi Cho Bài Học</h3>
              </div>
              <button
                onClick={() => setIsAddQuestionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              Đang thêm vào: <strong className="text-amber-300">{activeBank.lessonName}</strong> ({activeBank.subject} - K{activeBank.grade})
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-3.5 text-xs">
              {/* Level Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Mức độ câu hỏi:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewQuestionForm({ ...newQuestionForm, level: 'basic' })}
                    className={`py-2 rounded-xl font-bold transition-all border ${
                      newQuestionForm.level === 'basic'
                        ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    🌱 Cơ bản
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewQuestionForm({ ...newQuestionForm, level: 'advanced' })}
                    className={`py-2 rounded-xl font-bold transition-all border ${
                      newQuestionForm.level === 'advanced'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    ⚡ Nâng cao
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nội dung câu hỏi *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nhập nội dung câu hỏi bài cũ..."
                  value={newQuestionForm.question}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              {/* Answer Text */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Đáp án / Lời giải tóm tắt *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nhập đáp án chuẩn hoặc gợi ý để chấm điểm..."
                  value={newQuestionForm.answer}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, answer: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddQuestionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  Lưu Câu Hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: SỬA CÂU HỎI (GIỮ NGUYÊN ID)
         ============================================================== */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Chỉnh Sửa Câu Hỏi</h3>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuestion} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Mức độ câu hỏi:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuestion({ ...editingQuestion, level: 'basic' })}
                    className={`py-2 rounded-xl font-bold transition-all border ${
                      editingQuestion.level === 'basic'
                        ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    🌱 Cơ bản
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingQuestion({ ...editingQuestion, level: 'advanced' })}
                    className={`py-2 rounded-xl font-bold transition-all border ${
                      editingQuestion.level === 'advanced'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    ⚡ Nâng cao
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nội dung câu hỏi *</label>
                <textarea
                  required
                  rows={3}
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Đáp án / Lời giải tóm tắt *</label>
                <textarea
                  required
                  rows={3}
                  value={editingQuestion.answer}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL CONFIRM: XÓA CÂU HỎI
         ============================================================== */}
      {deletingQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Xác nhận xóa câu hỏi</h3>
              <p className="text-xs text-slate-400">
                Thầy cô có chắc chắn muốn xóa câu hỏi này khỏi kho không? Hành động này chỉ xóa đúng câu này.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingQuestionId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteQuestion(deletingQuestionId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL PREVIEW: IMPORT JSON CLASSGO
         ============================================================== */}
      {jsonPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Xem Trước Dữ Liệu JSON ClassGo</h3>
              </div>
              <button
                onClick={() => setJsonPreviewData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Validation Details */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
              {jsonPreviewData.validation.isValid ? (
                <>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="text-sm font-bold text-amber-300">
                      📖 {jsonPreviewData.validation.bankData?.lessonName}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                      <div>Môn: <strong className="text-white">{jsonPreviewData.validation.bankData?.subject}</strong></div>
                      <div>Khối: <strong className="text-white">{jsonPreviewData.validation.bankData?.grade}</strong></div>
                      <div>Học kỳ: <strong className="text-white">{jsonPreviewData.validation.bankData?.semester}</strong></div>
                      <div>Mã bài: <strong className="text-white font-mono">{jsonPreviewData.validation.bankData?.lessonId}</strong></div>
                    </div>
                  </div>

                  {/* Question Count Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                      <div className="text-slate-400 text-[10px]">Tổng số câu</div>
                      <div className="text-base font-black text-white">
                        {jsonPreviewData.validation.validQuestions.length + jsonPreviewData.validation.invalidQuestions.length}
                      </div>
                    </div>
                    <div className="bg-sky-950/60 p-2.5 rounded-xl border border-sky-500/30">
                      <div className="text-sky-300 text-[10px]">Cơ bản</div>
                      <div className="text-base font-black text-sky-400">
                        {jsonPreviewData.validation.validQuestions.filter((q) => q.level === 'basic').length}
                      </div>
                    </div>
                    <div className="bg-purple-950/60 p-2.5 rounded-xl border border-purple-500/30">
                      <div className="text-purple-300 text-[10px]">Nâng cao</div>
                      <div className="text-base font-black text-purple-400">
                        {jsonPreviewData.validation.validQuestions.filter((q) => q.level === 'advanced').length}
                      </div>
                    </div>
                    <div className="bg-amber-950/60 p-2.5 rounded-xl border border-amber-500/30">
                      <div className="text-amber-300 text-[10px]">ID trùng (Bỏ qua)</div>
                      <div className="text-base font-black text-amber-400">
                        {jsonPreviewData.validation.duplicateCountWithExistingBank || 0}
                      </div>
                    </div>
                  </div>

                  {/* Warning banner if duplicates exist */}
                  {jsonPreviewData.validation.warnings.length > 0 && (
                    <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-amber-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Lưu ý khi nhập:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/80">
                        {jsonPreviewData.validation.warnings.slice(0, 3).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sample Preview Rows */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      Mẫu một số câu hỏi trong file:
                    </div>
                    <div className="space-y-2">
                      {jsonPreviewData.validation.validQuestions.slice(0, 3).map((vq) => (
                        <div
                          key={vq.id}
                          className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-500">[{vq.id}]</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                vq.level === 'basic' ? 'bg-sky-950 text-sky-400' : 'bg-purple-950 text-purple-400'
                              }`}
                            >
                              {vq.level === 'basic' ? 'Cơ bản' : 'Nâng cao'}
                            </span>
                          </div>
                          <div className="text-slate-200">{vq.question}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 text-rose-300 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>File JSON không hợp lệ</span>
                  </div>
                  <p className="text-xs text-rose-200">{jsonPreviewData.validation.error}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setJsonPreviewData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              {jsonPreviewData.validation.isValid && (
                <button
                  onClick={handleConfirmJsonImport}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận Nhập Vào Kho</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL PREVIEW: IMPORT EXCEL
         ============================================================== */}
      {excelPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Xem Trước Dữ Liệu Excel</h3>
              </div>
              <button
                onClick={() => setExcelPreviewData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              Đang nhập vào bài:{' '}
              <strong className="text-amber-300">{activeBank?.lessonName}</strong>
              <div className="text-slate-400 text-[11px] mt-0.5">
                Tệp: {excelPreviewData.fileName}
              </div>
            </div>

            {/* Excel Row Stats */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                <div className="text-slate-400 text-[10px]">Tổng dòng</div>
                <div className="text-base font-black text-white">
                  {excelPreviewData.parsed.totalRows}
                </div>
              </div>
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/30">
                <div className="text-emerald-300 text-[10px]">Hợp lệ</div>
                <div className="text-base font-black text-emerald-400">
                  {excelPreviewData.parsed.validRows.length}
                </div>
              </div>
              <div className="bg-sky-950/60 p-2.5 rounded-xl border border-sky-500/30">
                <div className="text-sky-300 text-[10px]">Cơ bản</div>
                <div className="text-base font-black text-sky-400">
                  {excelPreviewData.parsed.basicCount}
                </div>
              </div>
              <div className="bg-purple-950/60 p-2.5 rounded-xl border border-purple-500/30">
                <div className="text-purple-300 text-[10px]">Nâng cao</div>
                <div className="text-base font-black text-purple-400">
                  {excelPreviewData.parsed.advancedCount}
                </div>
              </div>
            </div>

            {/* Error Rows Warning */}
            {excelPreviewData.parsed.invalidRows.length > 0 && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-rose-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    Có {excelPreviewData.parsed.invalidRows.length} dòng không hợp lệ (sẽ bị bỏ qua):
                  </span>
                </div>
                <div className="max-h-20 overflow-y-auto space-y-1 text-[11px] text-rose-200">
                  {excelPreviewData.parsed.invalidRows.map((inv, i) => (
                    <div key={i}>
                      • Dòng {inv.rowNumber}: {inv.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Rows Preview */}
            <div className="space-y-1.5 overflow-y-auto flex-1 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Xem trước một số câu hỏi hợp lệ:
              </div>
              <div className="space-y-2">
                {excelPreviewData.parsed.validRows.slice(0, 3).map((row, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.level === 'basic' ? 'bg-sky-950 text-sky-400' : 'bg-purple-950 text-purple-400'
                        }`}
                      >
                        {row.level === 'basic' ? 'Cơ bản' : 'Nâng cao'}
                      </span>
                    </div>
                    <div className="text-slate-200 font-medium">{row.question}</div>
                    <div className="text-emerald-400 text-[11px] font-mono">Đáp án: {row.answer}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 flex-shrink-0 text-xs">
              <button
                onClick={() => setExcelPreviewData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmExcelImport}
                disabled={excelPreviewData.parsed.validRows.length === 0}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Nhập Vào Bài Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: TẠO CÂU HỎI BẰNG AI & DUYỆT (PREVIEW & APPROVAL)
         ============================================================== */}
      {isAiModalOpen && activeBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
                    <span>TẠO CÂU HỎI BẰNG AI</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 normal-case font-bold">
                      {aiStep === 'CONFIG'
                        ? 'Cấu hình yêu cầu'
                        : aiStep === 'GENERATING'
                        ? 'Đang sinh câu hỏi...'
                        : 'Xem trước & Duyệt'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bài:{' '}
                    <span className="text-amber-300 font-bold">
                      [{activeBank.subject} - K{activeBank.grade}] {activeBank.lessonName}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Đóng modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* STEP 1: CONFIGURATION FORM */}
              {aiStep === 'CONFIG' && (
                <div className="space-y-4">
                  {/* Context Info Card */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Thông tin bài học áp dụng:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Môn:</span>
                        <strong className="text-slate-200">{activeBank.subject}</strong>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Khối:</span>
                        <strong className="text-slate-200">Khối {activeBank.grade}</strong>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Học kỳ:</span>
                        <strong className="text-slate-200">Học kỳ {activeBank.semester || '1'}</strong>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Chương/Chủ đề:</span>
                        <strong className="text-slate-200 truncate block" title={activeBank.sectionName || ''}>
                          {activeBank.sectionName || 'Nội dung chung'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Error Notification if any */}
                  {aiError && (
                    <div className="bg-rose-950/50 border border-rose-500/40 rounded-2xl p-3 text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs">Không thể tạo câu hỏi:</div>
                        <div className="text-[11px] text-rose-200">{aiError}</div>
                      </div>
                    </div>
                  )}

                  {/* Config 1: Level Selection (Strictly CƠ BẢN or NÂNG CAO - No Mixed Batch) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      1. Chọn mức độ cho đợt câu hỏi này:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Basic Only */}
                      <button
                        type="button"
                        onClick={() => setAiLevel('basic')}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          aiLevel === 'basic'
                            ? 'bg-sky-950/60 border-sky-500 text-sky-200 shadow-md shadow-sky-500/15 ring-1 ring-sky-500/50'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-sm flex items-center justify-between mb-1.5 text-sky-300">
                          <span>📘 CƠ BẢN (Kiến thức nền, công thức)</span>
                          {aiLevel === 'basic' && (
                            <CheckCircle2 className="w-4 h-4 text-sky-400" />
                          )}
                        </div>
                        <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc list-inside">
                          <li>Nhận biết, nhớ kiến thức, công thức, tính toán 1 bước.</li>
                          <li>Phù hợp HS cần củng cố kiến thức nền (30s – 2 phút/câu).</li>
                        </ul>
                      </button>

                      {/* Advanced Only */}
                      <button
                        type="button"
                        onClick={() => setAiLevel('advanced')}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          aiLevel === 'advanced'
                            ? 'bg-purple-950/60 border-purple-500 text-purple-200 shadow-md shadow-purple-500/15 ring-1 ring-purple-500/50'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-sm flex items-center justify-between mb-1.5 text-purple-300">
                          <span>🚀 NÂNG CAO (Vận dụng, suy luận logic)</span>
                          {aiLevel === 'advanced' && (
                            <CheckCircle2 className="w-4 h-4 text-purple-400" />
                          )}
                        </div>
                        <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc list-inside">
                          <li>Thông hiểu sâu, 2–3 bước, so sánh, giải thích, bài toán tư duy.</li>
                          <li>Không vượt chương trình, không mẹo lạ HSG (1 – 4 phút/câu).</li>
                        </ul>
                      </button>
                    </div>
                  </div>

                  {/* Config 2: Number of questions (5, 10, 15, 20) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      2. Số lượng câu hỏi muốn sinh:
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setAiCount(num)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            aiCount === num
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                          }`}
                        >
                          {num} câu
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[11px] text-slate-400">Tùy chọn:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={aiCount}
                          onChange={(e) => setAiCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                          className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-center font-bold text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                        />
                        <span className="text-[11px] text-slate-400">câu (tối đa 20)</span>
                      </div>
                    </div>
                  </div>

                  {/* Config 3: Teacher's Custom Focus/Prompt */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        3. Gợi ý trọng tâm / Yêu cầu riêng (Tùy chọn):
                      </label>
                      <span className="text-[10px] text-slate-500">Giúp AI bám sát ý đồ của thầy cô</span>
                    </div>
                    <textarea
                      rows={2}
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Ví dụ: Tập trung vào định nghĩa và số đối; hoặc cho câu hỏi trắc nghiệm ngắn 4 đáp án; hoặc câu hỏi đố thực tế 1 phút..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none text-xs leading-relaxed"
                    />
                  </div>

                  {/* Pedagogical Note */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-[11px] text-amber-300/90 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Quy trình đảm bảo chất lượng:</strong> AI sẽ tạo bản nháp. Thầy cô được{' '}
                      <strong>xem trước, sửa trực tiếp hoặc xóa câu không thích</strong> trước khi bấm{' '}
                      <strong>Duyệt & Lưu</strong> vào kho câu hỏi.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 2: GENERATING STATE */}
              {aiStep === 'GENERATING' && (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/30 animate-pulse">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 border border-slate-800">
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-md">
                    <h4 className="text-base font-black text-slate-100">
                      AI đang phân tích bài học & soạn câu hỏi...
                    </h4>
                    <p className="text-xs text-slate-400">
                      Đang tạo {aiCount} câu hỏi kiểm tra bài cũ cho{' '}
                      <strong className="text-amber-300 font-semibold">{activeBank.lessonName}</strong>.
                    </p>
                  </div>

                  <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full animate-pulse w-3/4" />
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Chỉ mất khoảng 3 - 6 giây. Thầy cô sẽ duyệt danh sách ngay sau đó.
                  </p>
                </div>
              )}

              {/* STEP 3: PREVIEW & APPROVAL (DUYỆT CÂU HỎI) */}
              {aiStep === 'PREVIEW' && (
                <div className="space-y-3.5 animate-fade-in">
                  {/* Approval Toolbar */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200 select-none">
                        <input
                          type="checkbox"
                          checked={aiDrafts.length > 0 && aiDrafts.every((d) => d.selected)}
                          onChange={(e) => handleSelectAllDrafts(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-800 border-slate-700"
                        />
                        <span>Chọn tất cả ({aiDrafts.length} câu)</span>
                      </label>

                      <div className="h-4 w-px bg-slate-800 hidden sm:block" />

                      <span className="text-[11px] text-amber-400 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        Đã chọn: {aiDrafts.filter((d) => d.selected).length} / {aiDrafts.length} câu
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAiStep('CONFIG')}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Quay lại thay đổi cấu hình hoặc sinh lại"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sinh lại</span>
                      </button>
                    </div>
                  </div>

                  {/* Empty drafts alert */}
                  {aiDrafts.length === 0 ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                      <p className="text-slate-400 text-xs">
                        Thầy cô đã xóa hết các câu trong danh sách xem trước.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAiStep('CONFIG')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                      >
                        Tạo lại danh sách mới
                      </button>
                    </div>
                  ) : (
                    /* Draft Cards List */
                    <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                      {aiDrafts.map((draft, idx) => {
                        const isEditingThis = editingDraftId === draft.tempId;
                        const isBasic = draft.level === 'basic';

                        return (
                          <div
                            key={draft.tempId}
                            className={`rounded-2xl border transition-all p-3.5 space-y-2.5 ${
                              draft.selected
                                ? 'bg-slate-900 border-indigo-500/60 shadow-md'
                                : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                            }`}
                          >
                            {/* Card Top Row: Checkbox, Level Pill & Actions */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                              <div className="flex items-center gap-2.5">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={draft.selected}
                                    onChange={() => handleToggleSelectDraft(draft.tempId)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-800 border-slate-700"
                                  />
                                  <span className="font-mono text-xs font-bold text-slate-400">
                                    #{idx + 1}
                                  </span>
                                </label>

                                {/* Level Badge (Display Only - Non-clickable / Non-editable) */}
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider select-none ${
                                    isBasic
                                      ? 'bg-sky-950/90 text-sky-300 border border-sky-500/40'
                                      : 'bg-purple-950/90 text-purple-300 border border-purple-500/40'
                                  }`}
                                >
                                  {isBasic ? 'CƠ BẢN' : 'NÂNG CAO'}
                                </span>
                              </div>

                              {/* Card Action Buttons */}
                              <div className="flex items-center gap-1.5">
                                {!isEditingThis ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditDraft(draft)}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 transition-colors"
                                      title="Chỉnh sửa câu hỏi này"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDraft(draft.tempId)}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors"
                                      title="Xóa câu này khỏi danh sách duyệt"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditDraft(draft.tempId)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Lưu sửa</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditDraft}
                                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                                    >
                                      Hủy
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Card Content: Normal vs Editing Mode */}
                            {!isEditingThis ? (
                              <div className="space-y-2 text-xs">
                                <div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                    Câu hỏi:
                                  </div>
                                  <p className="text-slate-100 font-medium whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                                    {draft.question}
                                  </p>
                                </div>

                                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 space-y-0.5">
                                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Đáp án / Gợi ý đối chiếu:</span>
                                  </div>
                                  <p className="text-xs text-emerald-300/95 font-mono whitespace-pre-wrap leading-relaxed">
                                    {draft.answer}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              /* Inline Editing Mode */
                              <div className="space-y-2 pt-1">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Sửa câu hỏi:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={editDraftForm.question}
                                    onChange={(e) =>
                                      setEditDraftForm((prev) => ({ ...prev, question: e.target.value }))
                                    }
                                    className="w-full bg-slate-950 border border-indigo-500 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">
                                    Sửa đáp án:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={editDraftForm.answer}
                                    onChange={(e) =>
                                      setEditDraftForm((prev) => ({ ...prev, answer: e.target.value }))
                                    }
                                    className="w-full bg-slate-950 border border-emerald-500 rounded-xl p-2.5 text-emerald-200 text-xs font-mono focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between flex-shrink-0 text-xs">
              {aiStep === 'CONFIG' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    onClick={handleStartGenerateAi}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-450 text-white font-bold shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>✨ Bắt Đầu Sinh Câu Hỏi</span>
                  </button>
                </>
              ) : aiStep === 'GENERATING' ? (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAiStep('CONFIG')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                  >
                    Hủy tiến trình
                  </button>
                </div>
              ) : (
                /* PREVIEW FOOTER */
                <>
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                  >
                    Hủy bỏ (Không lưu)
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveAiQuestions}
                    disabled={aiDrafts.filter((d) => d.selected).length === 0}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>
                      Duyệt & Lưu ({aiDrafts.filter((d) => d.selected).length} câu) Vào Kho
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: BATCH AI QUESTION GENERATOR (Phase 3) */}
      {/* ============================================================== */}
      {isBatchAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* MODAL HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <Sparkles className="w-5 h-5 text-amber-100" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                    <span>TẠO HÀNG LOẠT CÂU HỎI BẰNG AI</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                      Đa Bài • GDPT 2018
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {batchAiStep === 'CONFIG'
                      ? 'Chọn chương/chủ đề, tích chọn các bài và số lượng câu Cơ bản/Nâng cao cho mỗi bài'
                      : batchAiStep === 'GENERATING'
                      ? 'AI đang phân tích và tạo lần lượt từng bài...'
                      : `Duyệt trước danh sách câu hỏi hàng loạt (${batchResults.reduce(
                          (acc, cur) => acc + cur.drafts.length,
                          0
                        )} câu đã tạo)`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (batchAiStep === 'GENERATING') {
                    handleCancelBatchGeneration();
                  } else {
                    setIsBatchAiModalOpen(false);
                  }
                }}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
              {batchError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{batchError}</span>
                  <button onClick={() => setBatchError(null)} className="text-rose-400 hover:text-rose-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ================= STEP 1: CONFIG ================= */}
              {batchAiStep === 'CONFIG' && (
                <div className="space-y-5">
                  {/* Scope Selector: Môn, Khối, Học kỳ, Chương */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5 text-xs uppercase tracking-wide text-amber-400">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>1. Chọn Phạm Vi Kiến Thức (Môn • Khối • Học kỳ • Chương)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                      {/* Môn học */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Môn học</label>
                        <select
                          value={batchSubject}
                          onChange={(e) => handleBatchSubjectChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                        >
                          {['Toán', 'Tiếng Anh', 'Ngữ văn', 'KHTN', 'Lịch sử', 'Địa lí', 'GDCD', 'Tin học', 'Công nghệ', 'Sinh học', 'Vật lí', 'Hóa học'].map((subj) => (
                            <option key={subj} value={subj}>
                              {subj}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Bộ sách */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bộ sách</label>
                        <select
                          value={batchBookSeries}
                          onChange={(e) => handleBatchBookSeriesChange(e.target.value)}
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                        >
                          <option value="KNTT">Kết nối tri thức (KNTT)</option>
                          <option value="OTHER">Tự do / Khác</option>
                        </select>
                      </div>

                      {/* Khối lớp */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Khối lớp</label>
                        <select
                          value={batchGrade}
                          onChange={(e) => handleBatchGradeChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                        >
                          {(batchSubject === 'Toán' && batchBookSeries === 'KNTT'
                            ? ['6', '7', '8', '9']
                            : ['6', '7', '8', '9', '10', '11', '12']
                          ).map((gr) => (
                            <option key={gr} value={gr}>
                              Lớp {gr}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tập (SGK) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tập SGK</label>
                        <select
                          value={batchVolume}
                          onChange={(e) => handleBatchVolumeChange(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                        >
                          <option value="ALL">Cả 2 tập</option>
                          <option value="1">Tập 1</option>
                          <option value="2">Tập 2</option>
                        </select>
                      </div>

                      {/* Học kỳ */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Học kỳ</label>
                        <select
                          value={batchSemester}
                          onChange={(e) => handleBatchSemesterChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                        >
                          <option value="1">Học kỳ 1</option>
                          <option value="2">Học kỳ 2</option>
                        </select>
                      </div>

                      {/* Chương / Chủ đề */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Chương / Chủ đề
                        </label>
                        {batchSubject === 'Toán' && batchBookSeries === 'KNTT' ? (
                          <select
                            value={batchChapterId}
                            onChange={(e) => handleBatchChapterChange(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-amber-500 truncate"
                          >
                            <option value="ALL">
                              Tất cả chương ({getKnttChapters(batchGrade, batchVolume).length} chương)
                            </option>
                            {getKnttChapters(batchGrade, batchVolume).map((c) => (
                              <option key={c.id} value={c.id}>
                                {formatKnttChapterTitle(c)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={batchSectionName}
                            onChange={(e) => setBatchSectionName(e.target.value)}
                            placeholder="VD: Chương 1: Số hữu tỉ"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Lessons List Selection */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5 text-xs uppercase tracking-wide text-amber-400">
                        <Layers className="w-3.5 h-3.5" />
                        <span>2. Tích Chọn Các Bài Học Cần Tạo Câu Hỏi ({batchLessonsList.filter((l) => l.selected).length}/{batchLessonsList.length} bài)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllBatchLessons(true)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 font-bold text-[11px]"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectAllBatchLessons(false)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold text-[11px]"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {/* Lessons list */}
                    {batchLessonsList.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 space-y-2">
                        <p>Chương này chưa có bài nào trong kho. Thầy cô hãy thêm tên bài học ở ô bên dưới:</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {batchLessonsList.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border gap-2 transition-all ${
                              item.selected
                                ? 'bg-slate-900 border-amber-500/40 text-slate-100 shadow-sm'
                                : 'bg-slate-900/40 border-slate-800 text-slate-400 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none min-w-0">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => handleToggleSelectBatchLesson(item.id)}
                                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700 flex-shrink-0"
                                />
                                <span className="font-mono text-[11px] font-bold text-slate-400 flex-shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="truncate">
                                  <div className="font-semibold text-xs text-slate-200 truncate">
                                    {item.lessonName}
                                  </div>
                                  {item.chapterName && item.chapterName !== 'Bài tự nhập' && (
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {item.chapterName}
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                              {/* Status badge: Đã có vs Chưa có câu hỏi */}
                              {item.hasBank && item.existingCount && (item.existingCount.basic > 0 || item.existingCount.advanced > 0) ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                  Đã có {item.existingCount.basic + item.existingCount.advanced} câu
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold whitespace-nowrap">
                                  Chưa có câu hỏi
                                </span>
                              )}

                              {/* Per-lesson custom counts (Cơ bản / Nâng cao) */}
                              <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-1 text-[11px] text-sky-300 px-1" title="Số câu Cơ bản cho bài này">
                                  <span className="font-bold">CB:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={item.basicCount ?? batchBasicCount}
                                    onChange={(e) =>
                                      handleUpdateLessonCustomCount(
                                        item.id,
                                        'basic',
                                        Math.max(0, Math.min(20, Number(e.target.value) || 0))
                                      )
                                    }
                                    className="w-10 bg-slate-800 border border-sky-500/40 rounded px-1 py-0.5 text-center font-bold text-sky-200 text-xs focus:outline-none"
                                  />
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-purple-300 px-1" title="Số câu Nâng cao cho bài này">
                                  <span className="font-bold">NC:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={item.advancedCount ?? batchAdvancedCount}
                                    onChange={(e) =>
                                      handleUpdateLessonCustomCount(
                                        item.id,
                                        'advanced',
                                        Math.max(0, Math.min(20, Number(e.target.value) || 0))
                                      )
                                    }
                                    className="w-10 bg-slate-800 border border-purple-500/40 rounded px-1 py-0.5 text-center font-bold text-purple-200 text-xs focus:outline-none"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveBatchLesson(item.id)}
                                className="p-1 text-slate-500 hover:text-rose-400"
                                title="Xóa khỏi danh sách"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Add Custom Lesson */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <input
                        type="text"
                        placeholder="Thêm nhanh tên bài học (VD: Bài 4: Quy tắc dấu ngoặc và chuyển vế)..."
                        value={newLessonInput}
                        onChange={(e) => setNewLessonInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomBatchLesson();
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomBatchLesson}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Thêm bài</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 3: Question Counts Configuration */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5 text-xs uppercase tracking-wide text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>3. Cấu Hình Số Lượng Câu Cho MỖI BÀI ĐƯỢC CHỌN</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Basic Count */}
                      <div className="p-3.5 rounded-2xl border border-sky-500/30 bg-sky-950/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-sky-300 text-xs flex items-center gap-1.5">
                            <span>📘 Số câu CƠ BẢN mỗi bài:</span>
                          </label>
                          <span className="font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-lg border border-sky-500/40">
                            {batchBasicCount} câu
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Nhận biết, nhớ công thức, tính toán 1 bước, củng cố kiến thức nền.
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {[0, 5, 10, 15, 20].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setBatchBasicCount(num)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                batchBasicCount === num
                                  ? 'bg-sky-600 text-white shadow-sm'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                              }`}
                            >
                              {num} câu
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Advanced Count */}
                      <div className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                            <span>🚀 Số câu NÂNG CAO mỗi bài:</span>
                          </label>
                          <span className="font-mono font-bold text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-lg border border-purple-500/40">
                            {batchAdvancedCount} câu
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Thông hiểu sâu, vận dụng, lập luận 2-3 bước, không vượt chương trình.
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {[0, 5, 10, 15, 20].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setBatchAdvancedCount(num)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                batchAdvancedCount === num
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                              }`}
                            >
                              {num} câu
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Calculation Summary Card */}
                    <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1.5">
                        <div className="text-slate-300 font-semibold">
                          Mặc định cấu hình:{' '}
                          <span className="text-sky-300 font-bold">{batchBasicCount} Cơ bản</span> +{' '}
                          <span className="text-purple-300 font-bold">{batchAdvancedCount} Nâng cao</span> ={' '}
                          <span className="text-amber-300 font-black">
                            {batchBasicCount + batchAdvancedCount} câu / bài
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyCountsToAllBatchLessons(batchBasicCount, batchAdvancedCount)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>Đồng bộ số câu ({batchBasicCount} CB, {batchAdvancedCount} NC) cho tất cả bài</span>
                          </button>
                          <span className="text-[11px] text-slate-400">
                            (Đã chọn {batchLessonsList.filter((l) => l.selected).length} bài)
                          </span>
                        </div>
                      </div>

                      <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-sm whitespace-nowrap self-start sm:self-auto shadow-sm">
                        Tổng cộng:{' '}
                        {batchLessonsList
                          .filter((l) => l.selected)
                          .reduce(
                            (sum, l) => sum + (l.basicCount ?? batchBasicCount) + (l.advancedCount ?? batchAdvancedCount),
                            0
                          )}{' '}
                        câu hỏi
                      </div>
                    </div>

                    {/* Teacher's Optional Focus Prompt */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">
                          Gợi ý trọng tâm / Yêu cầu riêng cho cả đợt (Tùy chọn):
                        </label>
                        <span className="text-[10px] text-slate-500">Áp dụng chung cho tất cả các bài được chọn</span>
                      </div>
                      <textarea
                        rows={2}
                        value={batchCustomPrompt}
                        onChange={(e) => setBatchCustomPrompt(e.target.value)}
                        placeholder="Ví dụ: Mỗi câu hỏi ngắn gọn, phù hợp học sinh trả lời miệng 1-2 phút; hoặc ưu tiên bài toán thực tế..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: GENERATING ================= */}
              {batchAiStep === 'GENERATING' && (
                <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/30 animate-pulse">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 border border-slate-800">
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-md">
                    <h4 className="text-base font-black text-slate-100">
                      AI đang tạo câu hỏi hàng loạt...
                    </h4>
                    <p className="text-xs text-slate-300">
                      Đang thực hiện bài{' '}
                      <strong className="text-amber-300 font-bold">
                        {batchProgress.currentIndex} / {batchProgress.totalLessons}
                      </strong>
                      : {batchProgress.currentLessonName}
                    </p>
                    <p className="text-[11px] text-sky-400 font-semibold">
                      {batchProgress.currentStage === 'basic'
                        ? `Đang tạo ${batchBasicCount} câu Cơ bản...`
                        : batchProgress.currentStage === 'advanced'
                        ? `Đang tạo ${batchAdvancedCount} câu Nâng cao...`
                        : 'Đang chuẩn bị...'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-72 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.max(
                          5,
                          Math.min(
                            100,
                            Math.round(
                              ((batchProgress.currentIndex - 0.5) /
                                Math.max(1, batchProgress.totalLessons)) *
                                100
                            )
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Live Progress Checklist */}
                  <div className="w-full max-w-lg bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-left space-y-1.5 max-h-48 overflow-y-auto text-xs">
                    {batchResults.map((res) => (
                      <div
                        key={res.lessonId}
                        className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {res.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : res.status === 'generating' ? (
                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                          ) : res.status === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              res.status === 'generating'
                                ? 'font-bold text-amber-200'
                                : res.status === 'success'
                                ? 'text-slate-200'
                                : 'text-slate-400'
                            }`}
                          >
                            {res.lessonName}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono ml-2 whitespace-nowrap">
                          {res.status === 'success'
                            ? `${res.drafts.length} câu ✅`
                            : res.status === 'generating'
                            ? 'Đang tạo...'
                            : res.status === 'error'
                            ? 'Lỗi ⚠️'
                            : 'Đang đợi'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Tạo tuần tự từng bài để đảm bảo chất lượng và tránh quá tải API.
                  </p>
                </div>
              )}

              {/* ================= STEP 3: PREVIEW ================= */}
              {batchAiStep === 'PREVIEW' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Top Batch Overview Bar */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200 select-none">
                        <input
                          type="checkbox"
                          checked={
                            batchResults.length > 0 &&
                            batchResults.every((l) => l.drafts.every((d) => d.selected))
                          }
                          onChange={(e) => handleToggleSelectAllBatchQuestions(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700"
                        />
                        <span>
                          Chọn tất cả các câu (
                          {batchResults.reduce((acc, cur) => acc + cur.drafts.length, 0)} câu)
                        </span>
                      </label>

                      <div className="h-4 w-px bg-slate-800 hidden sm:block" />

                      <span className="text-[11px] text-amber-400 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        Đã chọn:{' '}
                        {batchResults.reduce(
                          (acc, cur) => acc + cur.drafts.filter((d) => d.selected).length,
                          0
                        )}{' '}
                        / {batchResults.reduce((acc, cur) => acc + cur.drafts.length, 0)} câu
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleExpandAllLessons(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        Mở rộng tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExpandAllLessons(false)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        Thu gọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchAiStep('CONFIG')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-semibold flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sinh lại</span>
                      </button>
                    </div>
                  </div>

                  {/* Accordion List for each Lesson */}
                  <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                    {batchResults.map((lesson, lessonIdx) => {
                      const selectedInLesson = lesson.drafts.filter((d) => d.selected).length;
                      const basicInLesson = lesson.drafts.filter((d) => d.level === 'basic').length;
                      const advInLesson = lesson.drafts.filter((d) => d.level === 'advanced').length;
                      const allSelected =
                        lesson.drafts.length > 0 && selectedInLesson === lesson.drafts.length;

                      return (
                        <div
                          key={lesson.lessonId}
                          className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                        >
                          {/* Lesson Card Header / Accordion trigger */}
                          <div className="p-3.5 bg-slate-900/95 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) =>
                                  handleToggleSelectLessonQuestions(lessonIdx, e.target.checked)
                                }
                                disabled={lesson.drafts.length === 0}
                                className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700 flex-shrink-0"
                              />

                              <div
                                onClick={() => handleToggleExpandLesson(lessonIdx)}
                                className="flex-1 cursor-pointer select-none min-w-0"
                              >
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-slate-100 truncate">
                                    {lesson.lessonName}
                                  </h4>
                                  {lesson.saved && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                                      Đã lưu vào kho ✅
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Badges & Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {lesson.status === 'success' && (
                                <>
                                  <span className="px-2 py-0.5 rounded-lg bg-sky-950/80 border border-sky-500/40 text-sky-300 font-bold text-[10px]">
                                    {basicInLesson} Cơ bản
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-[10px]">
                                    {advInLesson} Nâng cao
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px]">
                                    Chọn {selectedInLesson}/{lesson.drafts.length}
                                  </span>

                                  {!lesson.saved && (
                                    <button
                                      type="button"
                                      onClick={() => handleSaveSingleLessonInBatch(lessonIdx)}
                                      disabled={selectedInLesson === 0}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950/80 hover:text-emerald-300 text-slate-300 text-[11px] font-semibold border border-slate-700 transition-colors disabled:opacity-40"
                                    >
                                      Lưu bài này
                                    </button>
                                  )}
                                </>
                              )}

                              {lesson.status === 'error' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-rose-400 font-bold">
                                    Lỗi sinh câu hỏi
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRetryLessonInBatch(lessonIdx)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[11px] font-bold"
                                  >
                                    Thử lại
                                  </button>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleExpandLesson(lessonIdx)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white"
                              >
                                {lesson.expanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Accordion Content */}
                          {lesson.expanded && (
                            <div className="p-3 bg-slate-950/60 space-y-2.5">
                              {lesson.status === 'error' && (
                                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                                  {lesson.errorMessage || 'Không thể tạo câu hỏi cho bài này.'}
                                </div>
                              )}

                              {lesson.drafts.length === 0 && lesson.status === 'success' && (
                                <div className="p-4 text-center text-slate-400 text-xs">
                                  Không có câu hỏi nào trong danh sách.
                                </div>
                              )}

                              {lesson.drafts.map((draft, qIdx) => {
                                const isEditing =
                                  editingBatchDraft?.lessonIndex === lessonIdx &&
                                  editingBatchDraft?.tempId === draft.tempId;
                                const isBasic = draft.level === 'basic';

                                return (
                                  <div
                                    key={draft.tempId}
                                    className={`rounded-xl border p-3 transition-all space-y-2 ${
                                      draft.selected
                                        ? 'bg-slate-900 border-amber-500/40'
                                        : 'bg-slate-950/50 border-slate-800 opacity-60'
                                    }`}
                                  >
                                    {/* Question Row Header */}
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={draft.selected}
                                          onChange={() =>
                                            handleToggleSelectBatchDraft(lessonIdx, draft.tempId)
                                          }
                                          className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700"
                                        />
                                        <span className="font-mono text-xs font-bold text-slate-400">
                                          #{qIdx + 1}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            isBasic
                                              ? 'bg-sky-950/90 text-sky-300 border border-sky-500/40'
                                              : 'bg-purple-950/90 text-purple-300 border border-purple-500/40'
                                          }`}
                                        >
                                          {isBasic ? 'CƠ BẢN' : 'NÂNG CAO'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        {!isEditing ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleStartEditBatchDraft(lessonIdx, draft)
                                              }
                                              className="p-1 rounded-lg text-slate-400 hover:text-amber-300"
                                              title="Sửa câu hỏi"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteBatchDraft(lessonIdx, draft.tempId)
                                              }
                                              className="p-1 text-slate-500 hover:text-rose-400"
                                              title="Xóa câu hỏi"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              onClick={handleSaveEditBatchDraft}
                                              className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                                            >
                                              Lưu sửa
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleCancelEditBatchDraft}
                                              className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                                            >
                                              Hủy
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Question content */}
                                    {!isEditing ? (
                                      <div className="space-y-1.5">
                                        <p className="text-slate-100 font-medium whitespace-pre-wrap leading-relaxed text-xs">
                                          {draft.question}
                                        </p>
                                        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 space-y-0.5">
                                          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                            Đáp án đối chiếu:
                                          </div>
                                          <p className="text-xs text-emerald-300/95 font-mono whitespace-pre-wrap">
                                            {draft.answer}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 pt-1">
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                            Sửa câu hỏi:
                                          </label>
                                          <textarea
                                            rows={2}
                                            value={editingBatchDraft.question}
                                            onChange={(e) =>
                                              setEditingBatchDraft((prev) =>
                                                prev ? { ...prev, question: e.target.value } : null
                                              )
                                            }
                                            className="w-full bg-slate-950 border border-amber-500 rounded-lg p-2 text-slate-200 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-emerald-400 mb-0.5">
                                            Sửa đáp án:
                                          </label>
                                          <textarea
                                            rows={2}
                                            value={editingBatchDraft.answer}
                                            onChange={(e) =>
                                              setEditingBatchDraft((prev) =>
                                                prev ? { ...prev, answer: e.target.value } : null
                                              )
                                            }
                                            className="w-full bg-slate-950 border border-emerald-500 rounded-lg p-2 text-emerald-200 text-xs font-mono"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between flex-shrink-0 text-xs">
              {batchAiStep === 'CONFIG' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsBatchAiModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors"
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    onClick={handleStartGenerateBatchAi}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-450 text-white font-bold shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>
                      ✨ Bắt Đầu Sinh Hàng Loạt ({batchLessonsList.filter((l) => l.selected).length} bài)
                    </span>
                  </button>
                </>
              ) : batchAiStep === 'GENERATING' ? (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={handleCancelBatchGeneration}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Dừng tiến trình (Giữ các bài đã tạo)
                  </button>
                </div>
              ) : (
                /* PREVIEW FOOTER */
                <>
                  <button
                    type="button"
                    onClick={() => setIsBatchAiModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors"
                  >
                    Hủy bỏ (Không lưu)
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveAndSaveBatchAll}
                    disabled={
                      batchResults.reduce(
                        (acc, cur) => acc + cur.drafts.filter((d) => d.selected).length,
                        0
                      ) === 0
                    }
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>
                      Duyệt & Lưu Tất Cả Vào Kho (
                      {batchResults.reduce(
                        (acc, cur) => acc + cur.drafts.filter((d) => d.selected).length,
                        0
                      )}{' '}
                      câu)
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: MYSTERY DOOR GAME (Phase 4A) */}
      {/* ============================================================== */}
      {isMysteryDoorOpen && activeBank && (
        <MysteryDoorGame
          bank={activeBank}
          ownerId={ownerId}
          onClose={() => setIsMysteryDoorOpen(false)}
        />
      )}

    </div>
  );
};
