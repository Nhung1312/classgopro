import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle,
  X,
  BookOpen,
  Shuffle,
  Lightbulb,
  Check,
  AlertCircle,
  Zap,
  Layers,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Student, ClassRoom, ScoreCommentRule } from '../types';
import { calculateStudentGrade } from '../utils/gradeCalculator';
import {
  DEFAULT_SCORE_COMMENT_RULES,
  VNEDU_MATH_COMMENT_TEMPLATES,
  loadScoreCommentRules,
  saveScoreCommentRules,
  getCommentFromRules,
} from '../utils/vnEduComments';
import { soundEngine } from '../utils/audio';

interface AutoCommentRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  activeClassId: string;
  onApplyCurrentClass: (updatedStudents: Student[]) => void;
  onApplyAllClasses: (updatedClasses: ClassRoom[]) => void;
}

export const AutoCommentRulesModal: React.FC<AutoCommentRulesModalProps> = ({
  isOpen,
  onClose,
  classes,
  activeClassId,
  onApplyCurrentClass,
  onApplyAllClasses,
}) => {
  const currentClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const [rules, setRules] = useState<ScoreCommentRule[]>([]);
  const [noScoreComment, setNoScoreComment] = useState<string>(
    'Chưa đủ cột điểm kiểm tra đánh giá.'
  );
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [enableVariation, setEnableVariation] = useState<boolean>(false);
  const [activeTemplateDropdownId, setActiveTemplateDropdownId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [targetScope, setTargetScope] = useState<'CURRENT' | 'ALL'>('ALL');

  useEffect(() => {
    if (isOpen) {
      setRules(loadScoreCommentRules());
    }
  }, [isOpen]);

  if (!isOpen || !currentClass) return null;

  // Calculate stats for current class vs all classes
  const currentClassStudents = currentClass.students || [];
  const allStudents = classes.flatMap((c) => c.students || []);

  const selectedStudents = targetScope === 'ALL' ? allStudents : currentClassStudents;

  const studentSummaries = selectedStudents.map((s) => ({
    student: s,
    summary: calculateStudentGrade(s),
  }));

  const getStudentCountForRule = (min: number, max: number) => {
    return studentSummaries.filter(({ summary }) => {
      if (summary.finalAvg === null) return false;
      return summary.finalAvg >= min - 0.001 && summary.finalAvg <= max + 0.001;
    }).length;
  };

  const noScoreCount = studentSummaries.filter(
    ({ summary }) => summary.finalAvg === null
  ).length;

  const handleScoreRangeChange = (
    id: string,
    field: 'minScore' | 'maxScore',
    val: number
  ) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleCommentChange = (id: string, text: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, comment: text } : r))
    );
  };

  const handleSelectTemplate = (ruleId: string, templateText: string) => {
    handleCommentChange(ruleId, templateText);
    setActiveTemplateDropdownId(null);
  };

  const handleResetDefaults = () => {
    setRules(DEFAULT_SCORE_COMMENT_RULES);
    setNoScoreComment('Chưa đủ cột điểm kiểm tra đánh giá.');
    saveScoreCommentRules(DEFAULT_SCORE_COMMENT_RULES);
    setToastMessage('Đã khôi phục bảng nhận xét chuẩn Bộ GD&ĐT');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSaveOnly = () => {
    saveScoreCommentRules(rules);
    soundEngine.playSuccess();
    setToastMessage('Đã lưu bảng quy tắc nhận xét!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Helper to generate comments for a list of students
  const generateUpdatedStudents = (studentList: Student[]) => {
    return studentList.map((std, idx) => {
      if (!overwriteExisting && std.notes && std.notes.trim() !== '') {
        return std;
      }
      const summary = calculateStudentGrade(std);
      const comment = getCommentFromRules(
        summary.finalAvg,
        rules,
        enableVariation,
        idx,
        noScoreComment
      );
      return {
        ...std,
        notes: comment,
      };
    });
  };

  // 1-Click for Current Class Only
  const handleApplyCurrentClass = () => {
    saveScoreCommentRules(rules);
    const updated = generateUpdatedStudents(currentClass.students);
    onApplyCurrentClass(updated);
    soundEngine.playSuccess();
    onClose();
  };

  // 1-Click for ALL Classes
  const handleApplyAllClasses = () => {
    saveScoreCommentRules(rules);
    const updatedClasses = classes.map((cls) => ({
      ...cls,
      students: generateUpdatedStudents(cls.students),
      updatedAt: new Date().toISOString(),
    }));
    onApplyAllClasses(updatedClasses);
    soundEngine.playSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-scale-in">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-black text-2xl border border-purple-500/30 shadow-inner">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Bảng Nhận Xét Tự Động Theo Khoảng Điểm
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {classes.length} Lớp ({allStudents.length} HS)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chỉ cần 1 chạm — Hệ thống tự động quét điểm và điền nhận xét cho từng lớp hoặc TẤT CẢ các lớp cùng lúc!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Toast feedback */}
          {toastMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Scope Selector: Current Class vs All Classes */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 shadow-inner space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-bold text-white text-xs flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Phạm vi xem thống kê &amp; áp dụng nhận xét:</span>
              </div>

              {/* Scope Switcher Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTargetScope('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    targetScope === 'ALL'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Tất cả các lớp ({classes.length} lớp - {allStudents.length} HS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope('CURRENT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    targetScope === 'CURRENT'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Chỉ Lớp {currentClass.name} ({currentClassStudents.length} HS)</span>
                </button>
              </div>
            </div>

            {/* Classes Overview Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-900">
              <span className="text-[11px] text-slate-500">Danh sách lớp:</span>
              {classes.map((cls) => {
                const graded = cls.students.filter((s) => {
                  const g = calculateStudentGrade(s);
                  return g.finalAvg !== null;
                }).length;
                const isCurrent = cls.id === currentClass.id;

                return (
                  <span
                    key={cls.id}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-purple-950/70 border-purple-500/50 text-purple-200 font-bold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Lớp {cls.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({graded}/{cls.students.length} có điểm)
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Quick Notice Banner with Reset Button */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Quy chế tự động 100% theo ĐTB môn (ĐTBmhk):</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Thầy cô có thể sửa trực tiếp câu từ, thay đổi khoảng điểm hoặc chọn câu mẫu có sẵn.
              </p>
            </div>

            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700 flex-shrink-0 self-start sm:self-auto"
              title="Khôi phục các câu nhận xét chuẩn Bộ GD&ĐT"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mẫu chuẩn Bộ GD&amp;ĐT</span>
            </button>
          </div>

          {/* Rules Matrix Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>📋 Bảng Khoảng Điểm &amp; Câu Nhận Xét Môn Toán</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Tự động lưu lại cho tất cả các lớp
              </span>
            </div>

            <div className="space-y-3">
              {rules.map((rule) => {
                const count = getStudentCountForRule(rule.minScore, rule.maxScore);
                const isDropdownOpen = activeTemplateDropdownId === rule.id;

                const badgeColor =
                  rule.evaluation === 'Xuất sắc'
                    ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                    : rule.evaluation === 'Giỏi'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : rule.evaluation === 'Khá'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40'
                    : rule.evaluation === 'Đạt'
                    ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                    : 'bg-rose-950 text-rose-300 border-rose-500/40';

                return (
                  <div
                    key={rule.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5 transition-all hover:border-slate-700"
                  >
                    {/* Row Header: Range, Evaluation, Count */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${badgeColor}`}
                        >
                          {rule.evaluation}
                        </span>

                        {/* Score Inputs */}
                        <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 font-mono text-xs font-bold text-white">
                          <span>Từ</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={rule.minScore}
                            onChange={(e) =>
                              handleScoreRangeChange(
                                rule.id,
                                'minScore',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-amber-300 focus:outline-none focus:border-purple-500"
                          />
                          <span>đến</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={rule.maxScore}
                            onChange={(e) =>
                              handleScoreRangeChange(
                                rule.id,
                                'maxScore',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-amber-300 focus:outline-none focus:border-purple-500"
                          />
                          <span>điểm</span>
                        </div>
                      </div>

                      {/* Matching Students Count Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 font-bold">
                          {targetScope === 'ALL' ? 'Tất cả lớp có:' : `Lớp ${currentClass.name}:`}{' '}
                          <strong className="text-purple-300 font-black">{count}</strong> HS
                        </span>

                        {/* Quick Template Picker Button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTemplateDropdownId(
                                isDropdownOpen ? null : rule.id
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1 border border-slate-700 transition-colors"
                            title="Chọn từ danh sách các câu nhận xét mẫu"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Mẫu khác</span>
                          </button>

                          {/* Dropdown Menu */}
                          {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1.5 z-50 w-80 sm:w-96 bg-slate-950 border border-purple-500/50 rounded-2xl shadow-2xl p-2.5 space-y-1 animate-scale-in">
                              <div className="text-[11px] font-bold text-purple-300 px-2 py-1 border-b border-slate-800">
                                💡 Chọn câu nhận xét mẫu ({rule.evaluation}):
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                {rule.alternatives.map((alt, altIdx) => (
                                  <button
                                    key={altIdx}
                                    type="button"
                                    onClick={() => handleSelectTemplate(rule.id, alt)}
                                    className="w-full text-left p-2 rounded-xl text-[11px] text-slate-300 hover:bg-purple-950/60 hover:text-white hover:border-purple-500/40 border border-transparent transition-all flex items-start gap-1.5"
                                  >
                                    <span className="text-purple-400 font-bold">•</span>
                                    <span>{alt}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Editable Comment Input / Textarea */}
                    <div>
                      <textarea
                        rows={2}
                        value={rule.comment}
                        onChange={(e) => handleCommentChange(rule.id, e.target.value)}
                        placeholder={`Nhập câu nhận xét cho học sinh ${rule.evaluation}...`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed font-medium"
                      />
                    </div>
                  </div>
                );
              })}

              {/* Special row for students without scores */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-800 text-slate-400 border border-slate-700">
                      Chưa đủ điểm
                    </span>
                    <span className="text-slate-400 text-xs">
                      Học sinh chưa có đủ cột điểm đánh giá ({noScoreCount} HS)
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={noScoreComment}
                  onChange={(e) => setNoScoreComment(e.target.value)}
                  placeholder="Nhận xét cho học sinh chưa đủ điểm..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="font-bold text-white text-xs">⚙️ Tùy chọn điền tự động:</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Overwrite option */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-0 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-white text-xs">
                    Ghi đè cả nhận xét đã có
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {overwriteExisting
                      ? 'Áp dụng nhận xét mới cho toàn bộ 100% học sinh.'
                      : 'Chỉ điền vào những học sinh hiện chưa có nhận xét (ô trống).'}
                  </div>
                </div>
              </label>

              {/* Natural Variation option */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={enableVariation}
                  onChange={(e) => setEnableVariation(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-0 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>Đa dạng hóa câu từ</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-900 text-purple-200 font-bold">
                      Tự nhiên
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Luân phiên các câu mẫu đồng nghĩa để học sinh cùng mức điểm không bị lặp 100% từ ngữ.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions - Two Explicit 1-Click Buttons */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleSaveOnly}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700 w-full lg:w-auto"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Lưu bảng quy tắc</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Đóng
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
            {/* BUTTON 1: Apply to Current Class */}
            <button
              onClick={handleApplyCurrentClass}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-purple-900/60 hover:border-purple-500/50 text-purple-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all active:scale-95 w-full sm:w-auto"
              title={`Áp dụng chỉ cho lớp ${currentClass.name}`}
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>⚡ Áp dụng Lớp {currentClass.name} ({currentClassStudents.length} HS)</span>
            </button>

            {/* BUTTON 2: Apply to ALL CLASSES (1 Click) */}
            <button
              onClick={handleApplyAllClasses}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:via-indigo-500 hover:to-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-900/50 border border-purple-400/50 transition-all active:scale-95 w-full sm:w-auto"
              title="Áp dụng nhận xét tự động cho toàn bộ tất cả các lớp đang dạy"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
              <span>🚀 ÁP DỤNG TẤT CẢ {classes.length} LỚP ({allStudents.length} HS)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
