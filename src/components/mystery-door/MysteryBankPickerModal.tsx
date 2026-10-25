import React, { useState, useMemo } from 'react';
import { ClassRoom, ReviewQuestionBank, Student } from '../../types';
import {
  loadQuestionBanks,
  loadQuestionsForBank,
  extractGradeFromClassName,
  normalizeSubjectName,
  isSubjectMatch,
} from '../../services/reviewQuestionService';
import {
  X,
  Search,
  BookOpen,
  Filter,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
  FolderPlus,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface MysteryBankPickerModalProps {
  isOpen?: boolean;
  activeClass: ClassRoom;
  student?: Student | null;
  ownerId?: string;
  onSelectBank: (bank: ReviewQuestionBank) => void;
  onClose: () => void;
  onNavigateToReviewBank: () => void;
}

export const MysteryBankPickerModal: React.FC<MysteryBankPickerModalProps> = ({
  activeClass,
  student,
  ownerId,
  onSelectBank,
  onClose,
  onNavigateToReviewBank,
}) => {
  // Load question banks for current teacher
  const allBanks = useMemo(() => {
    return loadQuestionBanks(ownerId);
  }, [ownerId]);

  // Detected metadata from class
  const detectedGrade = useMemo(() => {
    return extractGradeFromClassName(activeClass.name) || '';
  }, [activeClass.name]);

  const detectedSubject = useMemo(() => {
    return normalizeSubjectName(activeClass.subject) || '';
  }, [activeClass.subject]);

  // Filter states
  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    // If there are banks matching detectedGrade, default to detectedGrade, otherwise 'ALL'
    if (detectedGrade && allBanks.some((b) => String(b.grade) === detectedGrade)) {
      return detectedGrade;
    }
    return 'ALL';
  });

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    // If there are banks matching detectedSubject, default to it
    if (detectedSubject && allBanks.some((b) => isSubjectMatch(b.subject, detectedSubject))) {
      return detectedSubject;
    }
    return 'ALL';
  });

  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract distinct grades and subjects from available banks
  const availableGrades = useMemo(() => {
    const set = new Set(allBanks.map((b) => String(b.grade)).filter(Boolean));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [allBanks]);

  const availableSubjects = useMemo(() => {
    const set = new Set(allBanks.map((b) => normalizeSubjectName(b.subject)).filter(Boolean));
    return Array.from(set).sort();
  }, [allBanks]);

  const availableSections = useMemo(() => {
    let filtered = allBanks;
    if (selectedGrade !== 'ALL') {
      filtered = filtered.filter((b) => String(b.grade) === selectedGrade);
    }
    if (selectedSubject !== 'ALL') {
      filtered = filtered.filter((b) => isSubjectMatch(b.subject, selectedSubject));
    }
    const set = new Set(filtered.map((b) => b.sectionName).filter(Boolean)) as Set<string>;
    return Array.from(set).sort();
  }, [allBanks, selectedGrade, selectedSubject]);

  // Filtered banks based on user choices
  const filteredBanks = useMemo(() => {
    return allBanks.filter((b) => {
      if (selectedGrade !== 'ALL' && String(b.grade) !== selectedGrade) {
        return false;
      }
      if (selectedSubject !== 'ALL' && !isSubjectMatch(b.subject, selectedSubject)) {
        return false;
      }
      if (selectedSemester !== 'ALL' && (b.semester || '1') !== selectedSemester) {
        return false;
      }
      if (selectedSection !== 'ALL' && b.sectionName !== selectedSection) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = b.lessonName.toLowerCase().includes(query);
        const matchSection = (b.sectionName || '').toLowerCase().includes(query);
        const matchSubj = b.subject.toLowerCase().includes(query);
        if (!matchName && !matchSection && !matchSubj) return false;
      }
      return true;
    });
  }, [allBanks, selectedGrade, selectedSubject, selectedSemester, selectedSection, searchQuery]);

  // Pre-calculate questions breakdown for each bank
  const bankQuestionCounts = useMemo(() => {
    const map = new Map<string, { basic: number; advanced: number; total: number }>();
    for (const b of allBanks) {
      const questions = loadQuestionsForBank(b.id, ownerId);
      const basic = questions.filter((q) => q.level === 'basic').length;
      const advanced = questions.filter((q) => q.level === 'advanced').length;
      map.set(b.id, { basic, advanced, total: questions.length });
    }
    return map;
  }, [allBanks, ownerId]);

  const handleResetFiltersToAll = () => {
    setSelectedGrade('ALL');
    setSelectedSubject('ALL');
    setSelectedSemester('ALL');
    setSelectedSection('ALL');
    setSearchQuery('');
    soundEngine.playTick(1.2);
  };

  const handleChooseBank = (bank: ReviewQuestionBank) => {
    soundEngine.playTick(1.4);
    onSelectBank(bank);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl shadow-amber-500/10 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/30">
              🚪
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>KHO KIỂM TRA BÀI CŨ</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Chọn Bài Học Cho Ô Cửa Bí Mật
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STUDENT & CLASS BADGE ROW */}
        <div className="px-5 py-3 bg-indigo-950/40 border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Học sinh được gọi:</span>
            <span className="font-black text-white bg-indigo-900/60 px-2.5 py-1 rounded-lg border border-indigo-500/40 text-sm">
              {student?.name || 'Học sinh'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span>Lớp: <strong className="text-amber-400">{activeClass.name}</strong></span>
            {detectedGrade && <span>• Khối <strong className="text-sky-300">{detectedGrade}</strong></span>}
            {activeClass.subject && <span>• Môn <strong className="text-emerald-300">{activeClass.subject}</strong></span>}
          </div>
        </div>

        {/* FILTER CONTROLS BAR */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Subject Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Môn học:
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">Tất cả môn</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Khối lớp:
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">Tất cả khối</option>
                {availableGrades.map((gr) => (
                  <option key={gr} value={gr}>
                    Khối {gr}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Học kỳ:
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">Cả năm</option>
                <option value="1">Học kỳ 1</option>
                <option value="2">Học kỳ 2</option>
              </select>
            </div>

            {/* Section / Chapter Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Chương / Chủ đề:
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-400 truncate"
              >
                <option value="ALL">Tất cả chương</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên bài học hoặc từ khóa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* BANK LIST / RESULTS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredBanks.length === 0 ? (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-4 my-4 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-sm sm:text-base font-black text-amber-300">
                  Chưa Có Ngân Hàng Câu Hỏi Phù Hợp
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Lớp <strong className="text-white">{activeClass.name}</strong>{' '}
                  {detectedGrade && <span>(Khối {detectedGrade})</span>}{' '}
                  {detectedSubject && <span>(Môn {detectedSubject})</span>} hiện chưa có ngân hàng câu hỏi bài học nào khớp với bộ lọc đang chọn.
                </p>
              </div>

              {/* Direct Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToReviewBank();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>👉 Đến Kho KT Bài Cũ Để Tạo / Nhập Kho</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetFiltersToAll}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                >
                  <span>Xem tất cả môn & khối khác</span>
                </button>
              </div>
            </div>
          ) : (
            filteredBanks.map((bank) => {
              const counts = bankQuestionCounts.get(bank.id) || { basic: 0, advanced: 0, total: 0 };
              const hasQuestions = counts.total > 0;

              return (
                <div
                  key={bank.id}
                  className="bg-slate-850/80 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-amber-500/50 rounded-2xl p-4 sm:p-4.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black uppercase">
                        {bank.subject} - Lớp {bank.grade}
                      </span>
                      {bank.semester && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold">
                          HK {bank.semester}
                        </span>
                      )}
                      {bank.sectionName && (
                        <span className="text-xs text-slate-400 truncate max-w-xs">
                          {bank.sectionName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-slate-100 group-hover:text-amber-300 transition-colors leading-snug">
                      {bank.lessonName}
                    </h3>

                    {/* Question breakdown */}
                    <div className="flex items-center gap-3 text-xs pt-0.5">
                      <span className="text-sky-300 font-mono font-bold flex items-center gap-1">
                        <span>📘 Cơ bản:</span>
                        <strong className="text-sky-400 font-black">{counts.basic}</strong> câu
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-purple-300 font-mono font-bold flex items-center gap-1">
                        <span>🚀 Nâng cao:</span>
                        <strong className="text-purple-400 font-black">{counts.advanced}</strong> câu
                      </span>
                      {counts.total === 0 && (
                        <span className="text-rose-400 font-bold text-[11px]">
                          (Chưa có câu hỏi)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Start Button */}
                  <div className="shrink-0 flex sm:flex-col justify-end">
                    <button
                      type="button"
                      disabled={!hasQuestions}
                      onClick={() => handleChooseBank(bank)}
                      className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
                        hasQuestions
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-orange-500/25 hover:scale-105 active:scale-95 cursor-pointer font-black'
                          : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span>BẮT ĐẦU MỞ CỬA</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM HELPER FOOTER */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Tìm thấy <strong className="text-amber-300">{filteredBanks.length}</strong> bài học trong Kho KT bài cũ
          </span>

          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToReviewBank();
            }}
            className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Quản lý Kho KT Bài Cũ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
