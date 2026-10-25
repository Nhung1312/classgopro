import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RotateCcw,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  Plus,
  Square,
  CheckSquare,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Pause,
} from 'lucide-react';
import {
  ReviewQuestionBank,
  ReviewQuestionLevel,
  ReviewQuestion,
} from '../types';
import {
  generateQuestionsViaAi,
  createQuestionBank,
  addQuestionToBank,
  loadQuestionsForBank,
  generateStableLessonId,
} from '../services/reviewQuestionService';
import {
  getKnttChapters,
  formatKnttChapterTitle,
  getKnttCatalogLessonsWithBankStatus,
  BOOK_SERIES_KNTT_NAME,
} from '../data/knttMathCatalog';

export interface BulkAiTaskDraft {
  tempId: string;
  level: ReviewQuestionLevel;
  question: string;
  answer: string;
  selected: boolean;
}

export type BulkAiTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'saved';

export interface BulkAiTask {
  id: string; // e.g. `${lessonId}-${level}`
  lessonId: string;
  lessonName: string;
  subject: string;
  grade: string;
  semester?: string;
  sectionName?: string;
  level: ReviewQuestionLevel;
  count: number;
  status: BulkAiTaskStatus;
  errorMessage?: string;
  drafts: BulkAiTaskDraft[];
}

export interface LessonScopeItem {
  lessonId: string;
  lessonName: string;
  bankId?: string;
  currentBasicCount: number;
  currentAdvCount: number;
}

interface BulkAiQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  banks: ReviewQuestionBank[];
  ownerId?: string;
  onQuestionsSaved: () => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialSubject?: string;
  initialGrade?: string;
  initialSemester?: string;
  initialSection?: string;
}

const STORAGE_KEY = 'classgo_bulk_ai_queue_state_v1';

export const BulkAiQuestionModal: React.FC<BulkAiQuestionModalProps> = ({
  isOpen,
  onClose,
  banks,
  ownerId,
  onQuestionsSaved,
  showNotification,
  initialSubject,
  initialGrade,
  initialSemester,
  initialSection,
}) => {
  // 1. Cascading filters for scope
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || 'Toán');
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade || '7');
  const [selectedSemester, setSelectedSemester] = useState<string>(initialSemester || '1');
  const [selectedSection, setSelectedSection] = useState<string>(initialSection || 'ALL');

  // 2. Counts & Prompt configuration
  const [basicCount, setBasicCount] = useState<number>(10);
  const [advancedCount, setAdvancedCount] = useState<number>(10);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // 3. Lessons in scope and selection
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [customLessonInput, setCustomLessonInput] = useState<string>('');
  const [customLessons, setCustomLessons] = useState<Array<{ id: string; name: string }>>([]);

  // 4. Queue / Step states
  const [currentStep, setCurrentStep] = useState<'CONFIG' | 'RUNNING' | 'SUMMARY'>('CONFIG');
  const [showConfirmStart, setShowConfirmStart] = useState<boolean>(false);
  const [tasks, setTasks] = useState<BulkAiTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const stopRef = useRef<boolean>(false);

  // 5. Per-lesson detail review modal
  const [reviewingLessonId, setReviewingLessonId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editDraftForm, setEditDraftForm] = useState<{ question: string; answer: string }>({
    question: '',
    answer: '',
  });

  // Extract filter options from banks
  const availableSubjects = useMemo(() => {
    const list = Array.from(new Set(banks.map((b) => b.subject).filter(Boolean)));
    if (!list.includes('Toán')) list.unshift('Toán');
    return list.sort();
  }, [banks]);

  const availableGrades = useMemo(() => {
    const filtered = banks.filter((b) => !selectedSubject || b.subject === selectedSubject);
    const list = Array.from(new Set(filtered.map((b) => String(b.grade)).filter(Boolean)));
    if (list.length === 0) return ['6', '7', '8', '9'];
    return list.sort((a, b) => Number(a) - Number(b));
  }, [banks, selectedSubject]);

  const availableSections = useMemo(() => {
    if (selectedSubject === 'Toán' && ['6', '7', '8', '9'].includes(String(selectedGrade))) {
      const chaps = getKnttChapters(selectedGrade, 'ALL');
      return chaps.map((c) => formatKnttChapterTitle(c));
    }
    const filtered = banks.filter(
      (b) =>
        (!selectedSubject || b.subject === selectedSubject) &&
        (!selectedGrade || String(b.grade) === selectedGrade)
    );
    const list = Array.from(new Set(filtered.map((b) => b.sectionName).filter(Boolean))) as string[];
    return list.sort();
  }, [banks, selectedSubject, selectedGrade]);

  // Derive lesson items available in the filtered scope
  const lessonsInScope: LessonScopeItem[] = useMemo(() => {
    if (selectedSubject === 'Toán' && ['6', '7', '8', '9'].includes(String(selectedGrade))) {
      const catLessons = getKnttCatalogLessonsWithBankStatus(
        Number(selectedGrade),
        'ALL',
        'ALL',
        banks,
        (bId) => {
          const qList = loadQuestionsForBank(bId, ownerId);
          return {
            basic: qList.filter((q) => q.level === 'basic').length,
            advanced: qList.filter((q) => q.level === 'advanced').length,
            total: qList.length,
          };
        }
      );

      let filtered = catLessons;
      if (selectedSection && selectedSection !== 'ALL') {
        filtered = filtered.filter(
          (c) =>
            c.chapterTitle === selectedSection ||
            c.chapterId === selectedSection ||
            selectedSection.includes(c.chapterTitle)
        );
      }

      const items: LessonScopeItem[] = filtered.map((c) => ({
        lessonId: c.id,
        lessonName: c.fullTitle,
        bankId: c.bankId,
        currentBasicCount: c.questionCount.basic,
        currentAdvCount: c.questionCount.advanced,
      }));

      for (const custom of customLessons) {
        if (!items.some((it) => it.lessonId === custom.id)) {
          items.push({
            lessonId: custom.id,
            lessonName: custom.name,
            currentBasicCount: 0,
            currentAdvCount: 0,
          });
        }
      }
      return items;
    }

    const filteredBanks = banks.filter((b) => {
      if (selectedSubject && b.subject !== selectedSubject) return false;
      if (selectedGrade && String(b.grade) !== selectedGrade) return false;
      if (selectedSemester && b.semester && b.semester !== selectedSemester) return false;
      if (selectedSection !== 'ALL' && b.sectionName !== selectedSection) return false;
      return true;
    });

    const items: LessonScopeItem[] = filteredBanks.map((b) => {
      const qList = loadQuestionsForBank(b.id, ownerId);
      return {
        lessonId: b.lessonId,
        lessonName: b.lessonName,
        bankId: b.id,
        currentBasicCount: qList.filter((q) => q.level === 'basic').length,
        currentAdvCount: qList.filter((q) => q.level === 'advanced').length,
      };
    });

    // Append custom entered lessons for this scope
    for (const c of customLessons) {
      if (!items.some((it) => it.lessonId === c.id)) {
        items.push({
          lessonId: c.id,
          lessonName: c.name,
          currentBasicCount: 0,
          currentAdvCount: 0,
        });
      }
    }

    return items;
  }, [banks, selectedSubject, selectedGrade, selectedSemester, selectedSection, customLessons, ownerId]);

  // Sync selected lessons default when lessonsInScope changes and nothing selected yet
  useEffect(() => {
    if (selectedLessonIds.size === 0 && lessonsInScope.length > 0) {
      setSelectedLessonIds(new Set(lessonsInScope.map((l) => l.lessonId)));
    }
  }, [lessonsInScope]);

  // Attempt to restore saved drafts from sessionStorage if available
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          setTasks(parsed.tasks);
          setCurrentStep('SUMMARY');
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Save drafts to sessionStorage whenever tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            tasks,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        // ignore
      }
    }
  }, [tasks]);

  if (!isOpen) return null;

  // Handlers for lesson selection
  const handleToggleLesson = (lessonId: string) => {
    setSelectedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const handleSelectAllLessons = (select: boolean) => {
    if (select) {
      setSelectedLessonIds(new Set(lessonsInScope.map((l) => l.lessonId)));
    } else {
      setSelectedLessonIds(new Set());
    }
  };

  const handleAddCustomLesson = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customLessonInput.trim();
    if (!name) return;

    const id = generateStableLessonId(selectedSubject, selectedGrade, name);
    if (!customLessons.some((c) => c.id === id) && !lessonsInScope.some((l) => l.lessonId === id)) {
      setCustomLessons((prev) => [...prev, { id, name }]);
      setSelectedLessonIds((prev) => new Set([...prev, id]));
    }
    setCustomLessonInput('');
  };

  // Pre-run calculation stats
  const selectedLessonsCount = selectedLessonIds.size;
  const tasksPerLesson = (basicCount > 0 ? 1 : 0) + (advancedCount > 0 ? 1 : 0);
  const totalTasksExpected = selectedLessonsCount * tasksPerLesson;
  const totalQuestionsExpected = selectedLessonsCount * (basicCount + advancedCount);

  // Start Queue execution
  const handleConfirmStartQueue = () => {
    if (selectedLessonsCount === 0) {
      showNotification('Vui lòng chọn ít nhất 1 bài học.', 'error');
      return;
    }
    if (basicCount === 0 && advancedCount === 0) {
      showNotification('Vui lòng chọn số lượng câu Cơ bản hoặc Nâng cao > 0.', 'error');
      return;
    }

    setShowConfirmStart(false);

    // Build task list
    const newTasks: BulkAiTask[] = [];
    const selectedList = lessonsInScope.filter((l) => selectedLessonIds.has(l.lessonId));

    selectedList.forEach((lesson) => {
      if (basicCount > 0) {
        newTasks.push({
          id: `${lesson.lessonId}-basic`,
          lessonId: lesson.lessonId,
          lessonName: lesson.lessonName,
          subject: selectedSubject,
          grade: selectedGrade,
          semester: selectedSemester,
          sectionName: selectedSection === 'ALL' ? undefined : selectedSection,
          level: 'basic',
          count: basicCount,
          status: 'pending',
          drafts: [],
        });
      }
      if (advancedCount > 0) {
        newTasks.push({
          id: `${lesson.lessonId}-advanced`,
          lessonId: lesson.lessonId,
          lessonName: lesson.lessonName,
          subject: selectedSubject,
          grade: selectedGrade,
          semester: selectedSemester,
          sectionName: selectedSection === 'ALL' ? undefined : selectedSection,
          level: 'advanced',
          count: advancedCount,
          status: 'pending',
          drafts: [],
        });
      }
    });

    setTasks(newTasks);
    setCurrentStep('RUNNING');
    setIsStopped(false);
    stopRef.current = false;

    // Start running sequentially
    runSequentialQueue(newTasks);
  };

  // The strictly sequential queue loop
  const runSequentialQueue = async (taskList: BulkAiTask[]) => {
    const updatedTasks = [...taskList];

    for (let i = 0; i < updatedTasks.length; i++) {
      if (stopRef.current) {
        break;
      }

      const task = updatedTasks[i];
      if (task.status === 'completed' || task.status === 'saved') {
        continue;
      }

      setActiveTaskId(task.id);
      task.status = 'running';
      task.errorMessage = undefined;
      setTasks([...updatedTasks]);

      try {
        // Collect existing questions for this lesson to avoid duplicates
        const existingBank = banks.find((b) => b.lessonId === task.lessonId);
        let existingQuestions: string[] = [];
        if (existingBank) {
          const qs = loadQuestionsForBank(existingBank.id, ownerId);
          existingQuestions = qs.map((q) => q.question);
        }

        // Call Gemini proxy with strict level
        const generated = await generateQuestionsViaAi({
          subject: task.subject,
          grade: task.grade,
          semester: task.semester,
          sectionName: task.sectionName,
          lessonName: task.lessonName,
          count: task.count,
          level: task.level,
          customPrompt: customPrompt.trim() || undefined,
          existingQuestions,
        });

        // Strict level validation: Reject any item that does not match task.level
        const validLevelItems = generated.filter((g) => g.level === task.level);

        // Anti-duplicate check within new batch and against existing
        const seenTexts = new Set(existingQuestions.map((q) => q.trim().toLowerCase()));
        const uniqueDrafts: BulkAiTaskDraft[] = [];

        validLevelItems.forEach((item, idx) => {
          const norm = item.question.trim().toLowerCase();
          if (!seenTexts.has(norm)) {
            seenTexts.add(norm);
            uniqueDrafts.push({
              tempId: `bulk-draft-${Date.now()}-${i}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              level: task.level,
              question: item.question,
              answer: item.answer,
              selected: true,
            });
          }
        });

        task.drafts = uniqueDrafts;
        task.status = 'completed';
      } catch (err: any) {
        console.error(`Task ${task.id} failed:`, err);
        task.status = 'failed';
        task.errorMessage = err.message || 'Lỗi khi gọi AI cho bài này.';
        // IMPORTANT: Continue queue to next task, don't crash the whole batch
      }

      setTasks([...updatedTasks]);
    }

    setActiveTaskId(null);
    setCurrentStep('SUMMARY');
  };

  // Stop the queue
  const handleStopQueue = () => {
    stopRef.current = true;
    setIsStopped(true);
    showNotification('Đã yêu cầu dừng hàng đợi. Tiến trình sẽ dừng sau bài hiện tại.', 'info');
  };

  // Retry a single failed task
  const handleRetrySingleTask = async (taskId: string) => {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const task = { ...tasks[taskIndex] };
    task.status = 'running';
    task.errorMessage = undefined;

    const updated = [...tasks];
    updated[taskIndex] = task;
    setTasks(updated);
    setActiveTaskId(task.id);

    try {
      const existingBank = banks.find((b) => b.lessonId === task.lessonId);
      let existingQuestions: string[] = [];
      if (existingBank) {
        const qs = loadQuestionsForBank(existingBank.id, ownerId);
        existingQuestions = qs.map((q) => q.question);
      }

      const generated = await generateQuestionsViaAi({
        subject: task.subject,
        grade: task.grade,
        semester: task.semester,
        sectionName: task.sectionName,
        lessonName: task.lessonName,
        count: task.count,
        level: task.level,
        customPrompt: customPrompt.trim() || undefined,
        existingQuestions,
      });

      const validLevelItems = generated.filter((g) => g.level === task.level);
      const seenTexts = new Set(existingQuestions.map((q) => q.trim().toLowerCase()));
      const uniqueDrafts: BulkAiTaskDraft[] = [];

      validLevelItems.forEach((item, idx) => {
        const norm = item.question.trim().toLowerCase();
        if (!seenTexts.has(norm)) {
          seenTexts.add(norm);
          uniqueDrafts.push({
            tempId: `bulk-retry-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            level: task.level,
            question: item.question,
            answer: item.answer,
            selected: true,
          });
        }
      });

      task.drafts = uniqueDrafts;
      task.status = 'completed';
    } catch (err: any) {
      task.status = 'failed';
      task.errorMessage = err.message || 'Lỗi khi gọi AI lại.';
    }

    const finalUpdated = [...tasks];
    finalUpdated[taskIndex] = task;
    setTasks(finalUpdated);
    setActiveTaskId(null);
  };

  // Group tasks by lesson for review
  const lessonGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        lessonId: string;
        lessonName: string;
        subject: string;
        grade: string;
        semester?: string;
        sectionName?: string;
        tasks: BulkAiTask[];
      }
    > = {};

    tasks.forEach((t) => {
      if (!groups[t.lessonId]) {
        groups[t.lessonId] = {
          lessonId: t.lessonId,
          lessonName: t.lessonName,
          subject: t.subject,
          grade: t.grade,
          semester: t.semester,
          sectionName: t.sectionName,
          tasks: [],
        };
      }
      groups[t.lessonId].tasks.push(t);
    });

    return Object.values(groups);
  }, [tasks]);

  // Approve all valid drafts for ALL lessons
  const handleApproveAllValidDrafts = () => {
    let totalQuestionsAdded = 0;
    let lessonsSavedCount = 0;

    const nextTasks = tasks.map((t) => ({ ...t, drafts: t.drafts.map((d) => ({ ...d })) }));

    lessonGroups.forEach((group) => {
      const lessonTasks = nextTasks.filter(
        (t) => t.lessonId === group.lessonId && t.status === 'completed'
      );
      if (lessonTasks.length === 0) return;

      // 1. Get or create bank for this lesson (1 lesson = 1 bank)
      const bankResult = createQuestionBank(
        {
          subject: group.subject,
          grade: group.grade,
          semester: group.semester,
          sectionName: group.sectionName,
          lessonId: group.lessonId,
          lessonName: group.lessonName,
        },
        ownerId
      );
      const targetBank = bankResult.bank;

      // Load existing questions to prevent duplicates
      const existingQs = loadQuestionsForBank(targetBank.id, ownerId);
      const existingTexts = new Set(existingQs.map((q) => q.question.trim().toLowerCase()));

      let addedInLesson = 0;
      lessonTasks.forEach((task) => {
        task.drafts.forEach((draft) => {
          if (!draft.selected) return;
          const norm = draft.question.trim().toLowerCase();
          if (existingTexts.has(norm)) return;

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
          addedInLesson++;
        });

        task.status = 'saved';
      });

      if (addedInLesson > 0) {
        totalQuestionsAdded += addedInLesson;
        lessonsSavedCount++;
      }
    });

    setTasks(nextTasks);
    onQuestionsSaved();
    showNotification(
      `Đã duyệt & lưu thành công ${totalQuestionsAdded} câu hỏi vào ${lessonsSavedCount} bài học!`,
      'success'
    );
  };

  // Approve a single lesson's drafts
  const handleApproveSingleLesson = (lessonId: string) => {
    const group = lessonGroups.find((g) => g.lessonId === lessonId);
    if (!group) return;

    const lessonTasks = tasks.filter((t) => t.lessonId === lessonId && t.status === 'completed');
    if (lessonTasks.length === 0) return;

    // Get or create bank
    const bankResult = createQuestionBank(
      {
        subject: group.subject,
        grade: group.grade,
        semester: group.semester,
        sectionName: group.sectionName,
        lessonId: group.lessonId,
        lessonName: group.lessonName,
      },
      ownerId
    );
    const targetBank = bankResult.bank;

    const existingQs = loadQuestionsForBank(targetBank.id, ownerId);
    const existingTexts = new Set(existingQs.map((q) => q.question.trim().toLowerCase()));

    let addedCount = 0;
    const nextTasks = tasks.map((t) => {
      if (t.lessonId !== lessonId) return t;

      const updatedDrafts = t.drafts.map((draft) => {
        if (!draft.selected) return draft;
        const norm = draft.question.trim().toLowerCase();
        if (existingTexts.has(norm)) return draft;

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
        return draft;
      });

      return {
        ...t,
        drafts: updatedDrafts,
        status: 'saved' as BulkAiTaskStatus,
      };
    });

    setTasks(nextTasks);
    setReviewingLessonId(null);
    onQuestionsSaved();
    showNotification(
      `Đã lưu thành công ${addedCount} câu hỏi vào bài "${group.lessonName}"!`,
      'success'
    );
  };

  // Preview editing handlers
  const handleToggleDraftSelection = (taskId: string, tempId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              drafts: t.drafts.map((d) => (d.tempId === tempId ? { ...d, selected: !d.selected } : d)),
            }
          : t
      )
    );
  };

  const handleDeleteDraft = (taskId: string, tempId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              drafts: t.drafts.filter((d) => d.tempId !== tempId),
            }
          : t
      )
    );
  };

  const handleStartEditDraft = (draft: BulkAiTaskDraft) => {
    setEditingDraftId(draft.tempId);
    setEditDraftForm({
      question: draft.question,
      answer: draft.answer,
    });
  };

  const handleSaveEditDraft = (taskId: string, tempId: string) => {
    if (!editDraftForm.question.trim() || !editDraftForm.answer.trim()) {
      showNotification('Vui lòng không để trống câu hỏi hoặc đáp án.', 'error');
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              drafts: t.drafts.map((d) =>
                d.tempId === tempId
                  ? {
                      ...d,
                      question: editDraftForm.question.trim(),
                      answer: editDraftForm.answer.trim(),
                    }
                  : d
              ),
            }
          : t
      )
    );
    setEditingDraftId(null);
  };

  // Calculate progress for running queue
  const completedOrFailedCount = tasks.filter(
    (t) => t.status === 'completed' || t.status === 'failed' || t.status === 'saved'
  ).length;
  const progressPercent =
    tasks.length > 0 ? Math.round((completedOrFailedCount / tasks.length) * 100) : 0;
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-xs">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <span>TẠO CÂU HỎI HÀNG LOẠT BẰNG AI</span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 normal-case font-bold">
                  {currentStep === 'CONFIG'
                    ? '1. Cấu hình bài học'
                    : currentStep === 'RUNNING'
                    ? '2. Đang tạo theo hàng đợi...'
                    : '3. Xem trước & Duyệt lưu'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Tạo tự động cho nhiều bài liên tiếp • Cơ bản & Nâng cao riêng biệt • Queue tuần tự an toàn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Đóng modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ==============================================================
            STEP 1: CONFIGURATION (CHỌN BÀI & CẤU HÌNH SỐ CÂU)
           ============================================================== */}
        {currentStep === 'CONFIG' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Cascading Filter Bar */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                1. Lọc phạm vi chương trình:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Môn */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Môn học</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {availableSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Khối */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Khối lớp</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {availableGrades.map((g) => (
                      <option key={g} value={g}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Học kỳ */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Học kỳ</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1">Học kỳ 1</option>
                    <option value="2">Học kỳ 2</option>
                  </select>
                </div>

                {/* Chương / Chủ đề */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Chương / Chủ đề
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 truncate"
                  >
                    <option value="ALL">Tất cả chương ({availableSections.length})</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Lesson Selection Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200">
                  2. Chọn các bài học cần tạo câu hỏi ({selectedLessonsCount} / {lessonsInScope.length} bài đã chọn):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllLessons(true)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-[11px]"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllLessons(false)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 font-semibold text-[11px]"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Lessons checklist container */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 max-h-56 overflow-y-auto space-y-1.5">
                {lessonsInScope.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 text-xs">
                    Chưa có bài nào trong bộ lọc này. Thầy cô có thể nhập thêm bài mới ở ô bên dưới.
                  </p>
                ) : (
                  lessonsInScope.map((lesson) => {
                    const isSelected = selectedLessonIds.has(lesson.lessonId);
                    return (
                      <div
                        key={lesson.lessonId}
                        onClick={() => handleToggleLesson(lesson.lessonId)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500/60 text-slate-100 shadow-sm'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-800 border-slate-700 flex-shrink-0 pointer-events-none"
                          />
                          <span className="font-semibold truncate">{lesson.lessonName}</span>
                        </div>

                        {/* Existing question counts indicator */}
                        <div className="flex items-center gap-1.5 text-[10px] font-mono flex-shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
                            Cơ bản: {lesson.currentBasicCount}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800/60">
                            Nâng cao: {lesson.currentAdvCount}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add custom lesson input */}
              <form onSubmit={handleAddCustomLesson} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customLessonInput}
                  onChange={(e) => setCustomLessonInput(e.target.value)}
                  placeholder="Thêm tên bài mới (ví dụ: Bài 4: Quy tắc chuyển vế)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!customLessonInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm bài</span>
                </button>
              </form>
            </div>

            {/* Counts Configuration per Lesson */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Basic Count */}
              <div className="bg-slate-950/70 border border-sky-500/30 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sky-300">
                    📘 Số câu CƠ BẢN cho mỗi bài:
                  </label>
                  <span className="text-[10px] text-slate-400">0 – 20 câu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBasicCount(num)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition-all text-center ${
                        basicCount === num
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Câu hỏi nhận biết, nhớ kiến thức, công thức, 1 bước tính (30s – 2p).
                </p>
              </div>

              {/* Advanced Count */}
              <div className="bg-slate-950/70 border border-purple-500/30 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-purple-300">
                    🚀 Số câu NÂNG CAO cho mỗi bài:
                  </label>
                  <span className="text-[10px] text-slate-400">0 – 20 câu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAdvancedCount(num)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition-all text-center ${
                        advancedCount === num
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Thông hiểu sâu, vận dụng 2–3 bước, so sánh, suy luận logic (1 – 4p).
                </p>
              </div>
            </div>

            {/* Custom Prompt Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-300">
                  3. Yêu cầu chung cho các bài (Tùy chọn):
                </label>
                <span className="text-[10px] text-slate-500">Áp dụng xuyên suốt cho tất cả bài trong đợt này</span>
              </div>
              <textarea
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ví dụ: Ưu tiên câu hỏi ngắn gọn kiểm tra miệng 1-2 phút, không cần vẽ hình phức tạp..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none text-xs leading-relaxed"
              />
            </div>

            {/* Pre-run Summary Box */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-[11px] text-amber-200 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-amber-300">
                  📊 Thống kê dự kiến trước khi chạy:
                </div>
                <div>
                  <strong>{selectedLessonsCount}</strong> bài học đã chọn •{' '}
                  Cơ bản: <strong>{basicCount}</strong>/bài • Nâng cao:{' '}
                  <strong>{advancedCount}</strong>/bài
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-amber-400">
                  {totalQuestionsExpected} câu hỏi
                </div>
                <div className="text-[10px] text-slate-400">
                  qua {totalTasksExpected} lượt AI tuần tự
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            STEP 2: QUEUE PROGRESS (TIẾN TRÌNH TUẦN TỰ)
           ============================================================== */}
        {currentStep === 'RUNNING' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 flex flex-col justify-center">
            {/* Main Progress Indicator */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/25 animate-pulse mx-auto">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 border border-slate-800">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-100">
                  Đang xử lý tuần tự theo hàng đợi ({completedOrFailedCount} / {tasks.length} lượt)
                </h4>
                {activeTask ? (
                  <p className="text-xs text-slate-300">
                    Đang sinh:{' '}
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full ${
                        activeTask.level === 'basic'
                          ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                          : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                      }`}
                    >
                      {activeTask.level === 'basic' ? 'CƠ BẢN' : 'NÂNG CAO'} ({activeTask.count} câu)
                    </span>{' '}
                    cho bài <strong className="text-amber-300">"{activeTask.lessonName}"</strong>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Đang chuẩn bị task tiếp theo...</p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md mx-auto space-y-1">
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Tiến độ: {progressPercent}%</span>
                  <span>{completedOrFailedCount} / {tasks.length} task</span>
                </div>
              </div>

              {/* Stop Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStopQueue}
                  disabled={isStopped}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-700/60 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isStopped ? 'Đang dừng hàng đợi...' : 'Dừng tạo hàng đợi'}</span>
                </button>
              </div>
            </div>

            {/* Task List Peek */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Trạng thái các lượt gọi:
              </div>
              {tasks.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-xl text-[11px] bg-slate-900/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-mono text-slate-500 text-[10px]">#{idx + 1}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        t.level === 'basic' ? 'bg-sky-950 text-sky-400' : 'bg-purple-950 text-purple-400'
                      }`}
                    >
                      {t.level === 'basic' ? 'Cơ bản' : 'Nâng cao'}
                    </span>
                    <span className="text-slate-300 truncate">{t.lessonName}</span>
                  </div>

                  <div>
                    {t.status === 'running' && (
                      <span className="text-amber-400 flex items-center gap-1 font-bold">
                        <Loader2 className="w-3 h-3 animate-spin" /> Đang chạy
                      </span>
                    )}
                    {t.status === 'completed' && (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3" /> Xong ({t.drafts.length} câu)
                      </span>
                    )}
                    {t.status === 'failed' && (
                      <span className="text-rose-400 flex items-center gap-1 font-bold">
                        <AlertCircle className="w-3 h-3" /> Lỗi
                      </span>
                    )}
                    {t.status === 'pending' && <span className="text-slate-500">Chờ...</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==============================================================
            STEP 3: SUMMARY & APPROVAL (TỔNG QUAN & DUYỆT TỪNG BÀI)
           ============================================================== */}
        {currentStep === 'SUMMARY' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Top Toolbar in Summary */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <span>KẾT QUẢ TẠO HÀNG LOẠT</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Bản nháp chờ duyệt
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Thầy cô có thể duyệt từng bài hoặc duyệt toàn bộ các câu hợp lệ vào kho.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('CONFIG')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tạo đợt khác</span>
                </button>

                <button
                  type="button"
                  onClick={handleApproveAllValidDrafts}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Duyệt tất cả câu hợp lệ</span>
                </button>
              </div>
            </div>

            {/* List of lessons with status and review buttons */}
            <div className="space-y-2.5">
              {lessonGroups.map((group) => {
                const basicTask = group.tasks.find((t) => t.level === 'basic');
                const advTask = group.tasks.find((t) => t.level === 'advanced');

                const basicDraftsCount = basicTask?.drafts.length || 0;
                const advDraftsCount = advTask?.drafts.length || 0;
                const totalDraftsCount = basicDraftsCount + advDraftsCount;

                const hasFailure = group.tasks.some((t) => t.status === 'failed');
                const isAllSaved = group.tasks.every((t) => t.status === 'saved');

                return (
                  <div
                    key={group.lessonId}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <strong className="text-slate-100 text-xs sm:text-sm">
                          {group.lessonName}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>
                          [{group.subject} - K{group.grade}]
                        </span>
                        <span>•</span>
                        <span className="text-sky-400 font-semibold font-mono">
                          Cơ bản: {basicDraftsCount} câu
                        </span>
                        <span>•</span>
                        <span className="text-purple-400 font-semibold font-mono">
                          Nâng cao: {advDraftsCount} câu
                        </span>
                        <span>•</span>
                        <span className="text-slate-300 font-mono">
                          Tổng: {totalDraftsCount} câu mới
                        </span>
                      </div>
                    </div>

                    {/* Status & Action */}
                    <div className="flex items-center gap-2">
                      {isAllSaved ? (
                        <span className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Đã lưu vào kho
                        </span>
                      ) : hasFailure ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Có lượt bị lỗi
                          </span>
                          {/* Retry button for failed tasks */}
                          {group.tasks
                            .filter((t) => t.status === 'failed')
                            .map((ft) => (
                              <button
                                key={ft.id}
                                type="button"
                                onClick={() => handleRetrySingleTask(ft.id)}
                                className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Thử lại {ft.level === 'basic' ? 'Cơ bản' : 'Nâng cao'}</span>
                              </button>
                            ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewingLessonId(group.lessonId)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Xem & Duyệt</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between flex-shrink-0 text-xs">
          {currentStep === 'CONFIG' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmStart(true)}
                disabled={selectedLessonsCount === 0 || (basicCount === 0 && advancedCount === 0)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-450 disabled:opacity-50 text-white font-bold shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Bắt Đầu Tạo ({totalQuestionsExpected} câu)</span>
              </button>
            </>
          )}

          {currentStep === 'RUNNING' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleStopQueue}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                Dừng hàng đợi
              </button>
            </div>
          )}

          {currentStep === 'SUMMARY' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleApproveAllValidDrafts}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Duyệt Tất Cả Câu Hợp Lệ Vào Kho</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==============================================================
          CONFIRMATION DIALOG TRƯỚC KHI BẮT ĐẦU (TRÁNH BẤM NHẦM QUOTA)
         ============================================================== */}
      {showConfirmStart && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h4 className="font-bold text-sm text-slate-100">
                Xác nhận bắt đầu tạo hàng loạt
              </h4>
            </div>

            <p className="text-slate-300 leading-relaxed">
              Thầy cô sắp tạo câu hỏi tự động cho{' '}
              <strong className="text-amber-300">{selectedLessonsCount} bài học</strong>:
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
              <div>• Cơ bản: <strong>{basicCount} câu/bài</strong></div>
              <div>• Nâng cao: <strong>{advancedCount} câu/bài</strong></div>
              <div>• Tổng dự kiến: <strong className="text-emerald-400">{totalQuestionsExpected} câu hỏi</strong></div>
              <div>• Số lượt gọi AI: <strong>{totalTasksExpected} lượt tuần tự</strong></div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Quá trình sẽ diễn ra tuần tự từng bài để đảm bảo chất lượng và tránh nghẽn quota.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmStart(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmStartQueue}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận bắt đầu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          PER-LESSON DETAIL REVIEW MODAL (XEM & DUYỆT TỪNG BÀI)
         ============================================================== */}
      {reviewingLessonId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-900">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <div>
                  <h4 className="font-bold text-sm text-slate-100">
                    Duyệt câu hỏi:{' '}
                    <span className="text-amber-300">
                      {lessonGroups.find((g) => g.lessonId === reviewingLessonId)?.lessonName}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Chọn, sửa hoặc xóa các câu trước khi lưu vào Question Bank của bài này
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReviewingLessonId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {tasks
                .filter((t) => t.lessonId === reviewingLessonId && t.status === 'completed')
                .map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          task.level === 'basic'
                            ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                        }`}
                      >
                        {task.level === 'basic' ? 'CƠ BẢN' : 'NÂNG CAO'} ({task.drafts.length} câu)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Đã chọn: {task.drafts.filter((d) => d.selected).length} / {task.drafts.length}
                      </span>
                    </div>

                    {task.drafts.map((draft, idx) => {
                      const isEditing = editingDraftId === draft.tempId;
                      const isBasic = draft.level === 'basic';

                      return (
                        <div
                          key={draft.tempId}
                          className={`rounded-2xl border p-3 space-y-2 transition-all ${
                            draft.selected
                              ? 'bg-slate-900 border-indigo-500/60'
                              : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                          }`}
                        >
                          {/* Card top */}
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={draft.selected}
                                  onChange={() => handleToggleDraftSelection(task.id, draft.tempId)}
                                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-700"
                                />
                                <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                              </label>

                              {/* Non-clickable level badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  isBasic
                                    ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                                    : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                                }`}
                              >
                                {isBasic ? 'CƠ BẢN' : 'NÂNG CAO'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {!isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditDraft(draft)}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-indigo-300"
                                    title="Sửa câu hỏi"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDraft(task.id, draft.tempId)}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                                    title="Xóa câu hỏi"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditDraft(task.id, draft.tempId)}
                                    className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDraftId(null)}
                                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                                  >
                                    Hủy
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          {!isEditing ? (
                            <div className="space-y-1.5 text-xs">
                              <p className="text-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                                {draft.question}
                              </p>
                              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">
                                  Đáp án:
                                </span>
                                <p className="text-emerald-300/90 font-mono text-[11px] whitespace-pre-wrap">
                                  {draft.answer}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                                  Sửa câu hỏi:
                                </label>
                                <textarea
                                  rows={2}
                                  value={editDraftForm.question}
                                  onChange={(e) =>
                                    setEditDraftForm((prev) => ({ ...prev, question: e.target.value }))
                                  }
                                  className="w-full bg-slate-950 border border-indigo-500 rounded-xl p-2 text-slate-200 text-xs focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-emerald-400 block mb-0.5">
                                  Sửa đáp án:
                                </label>
                                <textarea
                                  rows={2}
                                  value={editDraftForm.answer}
                                  onChange={(e) =>
                                    setEditDraftForm((prev) => ({ ...prev, answer: e.target.value }))
                                  }
                                  className="w-full bg-slate-950 border border-emerald-500 rounded-xl p-2 text-emerald-200 text-xs font-mono focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-900">
              <button
                type="button"
                onClick={() => setReviewingLessonId(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleApproveSingleLesson(reviewingLessonId)}
                className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Duyệt & Lưu bài này vào kho</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
