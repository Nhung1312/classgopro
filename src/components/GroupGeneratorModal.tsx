import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Users,
  Dices,
  Copy,
  Check,
  Crown,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Printer,
  Shuffle,
  ShieldAlert,
  Scale,
} from 'lucide-react';
import { ClassRoom, GeneratedGroup, Student } from '../types';
import { soundEngine } from '../utils/audio';

interface GroupGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: ClassRoom;
}

const THEME_NAMES = {
  NUMBERS: ['Nhóm 1', 'Nhóm 2', 'Nhóm 3', 'Nhóm 4', 'Nhóm 5', 'Nhóm 6', 'Nhóm 7', 'Nhóm 8', 'Nhóm 9', 'Nhóm 10'],
  ANIMALS: ['🐉 Rồng Xanh', '🐯 Hổ Vàng', '🦅 Đại Bàng', '🦁 Sư Tử', '🐺 Sói Xám', '🐬 Cá Heo', '🐼 Gấu Trúc', '🦊 Cáo Lửa'],
  SCIENTISTS: ['🍎 Newton', '💡 Einstein', '🧪 Curie', '🔭 Galileo', '📐 Pythagoras', '⚡ Tesla', '🔬 Pasteur', '🧬 Darwin'],
  COLORS: ['🔴 Đỏ Rực', '🔵 Xanh Biển', '🟢 Ngọc Bích', '🟡 Hoàng Kim', '🟣 Tím Huyền', '🟠 Cam Lửa', '🟤 Nâu Đất', '⚪ Bạc Sáng'],
};

const GROUP_COLORS = [
  'from-indigo-600/30 to-blue-600/30 border-indigo-500/50 text-indigo-300',
  'from-emerald-600/30 to-teal-600/30 border-emerald-500/50 text-emerald-300',
  'from-amber-600/30 to-yellow-600/30 border-amber-500/50 text-amber-300',
  'from-rose-600/30 to-pink-600/30 border-rose-500/50 text-rose-300',
  'from-purple-600/30 to-violet-600/30 border-purple-500/50 text-purple-300',
  'from-cyan-600/30 to-sky-600/30 border-cyan-500/50 text-cyan-300',
  'from-orange-600/30 to-amber-600/30 border-orange-500/50 text-orange-300',
  'from-fuchsia-600/30 to-rose-600/30 border-fuchsia-500/50 text-fuchsia-300',
];

export const GroupGeneratorModal: React.FC<GroupGeneratorModalProps> = ({
  isOpen,
  onClose,
  activeClass,
}) => {
  const [splitMode, setSplitMode] = useState<'BY_COUNT' | 'BY_SIZE'>('BY_COUNT');
  const [groupCount, setGroupCount] = useState<number>(4);
  const [groupSize, setGroupSize] = useState<number>(4);
  const [onlyPresent, setOnlyPresent] = useState<boolean>(true);
  const [balanceGender, setBalanceGender] = useState<boolean>(true);
  const [assignLeader, setAssignLeader] = useState<boolean>(true);
  const [themePreset, setThemePreset] = useState<'NUMBERS' | 'ANIMALS' | 'SCIENTISTS' | 'COLORS'>('ANIMALS');
  const [groups, setGroups] = useState<GeneratedGroup[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const students = activeClass?.students || [];
  const eligibleStudents = onlyPresent ? students.filter((s) => !s.isAbsent) : students;

  // Algorithm to shuffle & partition groups
  const generateGroups = useCallback(() => {
    if (eligibleStudents.length === 0) {
      setGroups([]);
      return;
    }

    setIsGenerating(true);
    soundEngine.playWhoosh();

    // 1. Calculate number of groups
    let targetGroupCount = groupCount;
    if (splitMode === 'BY_SIZE') {
      targetGroupCount = Math.max(1, Math.ceil(eligibleStudents.length / Math.max(1, groupSize)));
    }
    targetGroupCount = Math.min(targetGroupCount, eligibleStudents.length);

    // 2. Prepare buckets
    const resultGroups: GeneratedGroup[] = [];
    const themeList = THEME_NAMES[themePreset] || THEME_NAMES.NUMBERS;

    for (let i = 0; i < targetGroupCount; i++) {
      const name = themeList[i % themeList.length] || `Nhóm ${i + 1}`;
      resultGroups.push({
        id: `group-${i + 1}`,
        name,
        members: [],
        color: GROUP_COLORS[i % GROUP_COLORS.length],
      });
    }

    // 3. Distribute students
    let pool: Student[] = [];

    if (balanceGender) {
      // Split boys and girls
      const boys = eligibleStudents.filter((s) => s.gender === 'nam');
      const girls = eligibleStudents.filter((s) => s.gender === 'nu');
      const others = eligibleStudents.filter((s) => s.gender !== 'nam' && s.gender !== 'nu');

      // Shuffle each
      const shuffle = (arr: Student[]) => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };

      const shufBoys = shuffle(boys);
      const shufGirls = shuffle(girls);
      const shufOthers = shuffle(others);

      // Round-robin assign boys
      shufBoys.forEach((boy, idx) => {
        resultGroups[idx % targetGroupCount].members.push(boy);
      });
      // Round-robin assign girls in reverse to equalize
      shufGirls.forEach((girl, idx) => {
        resultGroups[(targetGroupCount - 1 - (idx % targetGroupCount)) % targetGroupCount].members.push(girl);
      });
      // Round-robin assign others
      shufOthers.forEach((oth, idx) => {
        resultGroups[idx % targetGroupCount].members.push(oth);
      });
    } else {
      // Pure random shuffle
      pool = [...eligibleStudents];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      pool.forEach((student, idx) => {
        resultGroups[idx % targetGroupCount].members.push(student);
      });
    }

    // 4. Assign Leader if requested
    if (assignLeader) {
      resultGroups.forEach((g) => {
        if (g.members.length > 0) {
          const randomLeaderIdx = Math.floor(Math.random() * g.members.length);
          g.leader = g.members[randomLeaderIdx];
        }
      });
    }

    setGroups(resultGroups);

    setTimeout(() => {
      setIsGenerating(false);
      soundEngine.playVictoryFanfare();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }, 400);
  }, [
    eligibleStudents,
    groupCount,
    groupSize,
    splitMode,
    themePreset,
    balanceGender,
    assignLeader,
  ]);

  useEffect(() => {
    if (isOpen && groups.length === 0 && eligibleStudents.length > 0) {
      generateGroups();
    }
  }, [isOpen, generateGroups, groups.length, eligibleStudents.length]);

  if (!isOpen) return null;

  // Copy groups as formatted text
  const handleCopyGroups = () => {
    if (groups.length === 0) return;
    const textLines: string[] = [];
    textLines.push(`📋 DANH SÁCH CHIA NHÓM - LỚP ${activeClass.name}`);
    textLines.push(`📅 Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`);
    textLines.push('----------------------------------------');

    groups.forEach((g, idx) => {
      textLines.push(`\n📌 ${g.name} (${g.members.length} thành viên):`);
      if (g.leader) {
        textLines.push(`  👑 Trưởng nhóm: ${g.leader.name}`);
      }
      g.members.forEach((m, mIdx) => {
        const isLead = g.leader?.id === m.id;
        textLines.push(`  ${mIdx + 1}. ${m.name}${isLead ? ' (Nhóm trưởng 👑)' : ''}`);
      });
    });

    navigator.clipboard.writeText(textLines.join('\n'));
    setIsCopied(true);
    soundEngine.playTick(1.4);
    setTimeout(() => setIsCopied(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 animate-fade-in ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl w-full shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'h-full w-full rounded-none border-none' : 'max-w-5xl max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700/80 p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>👥 Chia Nhóm Ngẫu Nhiên</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  Lớp {activeClass.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tự động chia nhóm thảo luận, bài tập theo số nhóm hoặc số lượng thành viên
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình máy chiếu'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode & Count Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setSplitMode('BY_COUNT')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  splitMode === 'BY_COUNT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Số lượng nhóm
              </button>
              <button
                onClick={() => setSplitMode('BY_SIZE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  splitMode === 'BY_SIZE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Số người / nhóm
              </button>
            </div>

            {splitMode === 'BY_COUNT' ? (
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                <span className="font-semibold text-slate-300">Số nhóm:</span>
                <select
                  value={groupCount}
                  onChange={(e) => setGroupCount(Number(e.target.value))}
                  className="bg-slate-900 text-indigo-300 font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} nhóm
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                <span className="font-semibold text-slate-300">Mỗi nhóm:</span>
                <select
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                  className="bg-slate-900 text-indigo-300 font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} bạn / nhóm
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Theme Preset */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
              <span className="font-semibold text-slate-300">Tên nhóm:</span>
              <select
                value={themePreset}
                onChange={(e) => setThemePreset(e.target.value as any)}
                className="bg-slate-900 text-amber-300 font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none"
              >
                <option value="ANIMALS">🦁 Siêu Thú</option>
                <option value="SCIENTISTS">💡 Nhà Bác Học</option>
                <option value="COLORS">🎨 Sắc Màu</option>
                <option value="NUMBERS">🔢 Số Thứ Tự</option>
              </select>
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white font-medium select-none">
              <input
                type="checkbox"
                checked={balanceGender}
                onChange={(e) => setBalanceGender(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>⚖️ Cân bằng Nam/Nữ</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white font-medium select-none">
              <input
                type="checkbox"
                checked={assignLeader}
                onChange={(e) => setAssignLeader(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>👑 Trưởng nhóm</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white font-medium select-none">
              <input
                type="checkbox"
                checked={onlyPresent}
                onChange={(e) => setOnlyPresent(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>Bỏ qua vắng ({students.filter((s) => s.isAbsent).length})</span>
            </label>
          </div>
        </div>

        {/* Groups Display Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {eligibleStudents.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              Không có học sinh khả dụng để chia nhóm!
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                groups.length <= 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : groups.length <= 4
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}
            >
              {groups.map((group, idx) => (
                <div
                  key={group.id}
                  className={`bg-gradient-to-b ${group.color || GROUP_COLORS[0]} border-2 rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1`}
                >
                  <div>
                    {/* Group Card Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/50">
                      <h3 className="font-black text-base sm:text-lg text-white tracking-wide flex items-center gap-1.5">
                        <span>{group.name}</span>
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-xs font-mono font-bold text-slate-200">
                        {group.members.length} bạn
                      </span>
                    </div>

                    {/* Group Leader Tag */}
                    {group.leader && (
                      <div className="mb-3 p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="truncate">Trưởng nhóm: {group.leader.name}</span>
                      </div>
                    )}

                    {/* Member List */}
                    <ul className="space-y-1.5">
                      {group.members.map((m, mIdx) => {
                        const isLeader = group.leader?.id === m.id;
                        return (
                          <li
                            key={m.id}
                            className={`px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between ${
                              isLeader
                                ? 'bg-amber-950/60 border border-amber-500/40 text-amber-200 font-bold'
                                : 'bg-slate-900/70 border border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-5 text-slate-400 font-mono text-[11px]">
                                {mIdx + 1}.
                              </span>
                              <span className="truncate">{m.name}</span>
                            </div>
                            {isLeader && (
                              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-3 pt-2 text-[10px] text-slate-400 text-right font-mono">
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-800/90 border-t border-slate-700/80 p-3 sm:p-4 px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Tổng cộng: <strong className="text-white">{eligibleStudents.length}</strong> học sinh trong <strong className="text-white">{groups.length}</strong> nhóm</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopyGroups}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Đã sao chép!' : 'Sao chép danh sách'}</span>
            </button>

            {/* Reshuffle Button */}
            <button
              onClick={generateGroups}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
            >
              <Shuffle className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Đang chia...' : '🎲 Chia Lại Nhóm'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
