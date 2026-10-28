import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Trophy,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Eye,
  Maximize2,
  Minimize2,
  X,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Sparkles,
} from 'lucide-react';
import {
  ArenaQuestion,
  ArenaMatchSettings,
  ArenaTeamState,
  MascotMood,
} from '../../types/arenaTypes';
import { ArenaMascot } from './ArenaMascot';
import { MathRenderer } from '../MathRenderer';
import { soundEngine } from '../../utils/audio';

interface ClassGoArenaGameProps {
  questions: ArenaQuestion[];
  team1Config: { name: string; mascotId: string; color: string };
  team2Config: { name: string; mascotId: string; color: string };
  settings: ArenaMatchSettings;
  onFinishMatch: (team1: ArenaTeamState, team2: ArenaTeamState) => void;
  onExitGame: () => void;
}

export const ClassGoArenaGame: React.FC<ClassGoArenaGameProps> = ({
  questions,
  team1Config,
  team2Config,
  settings,
  onFinishMatch,
  onExitGame,
}) => {
  // Current question index (0-based)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Turn state: 'QUESTION' (answering) | 'REVEAL' (answer shown)
  const [turnState, setTurnState] = useState<'QUESTION' | 'REVEAL'>('QUESTION');

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(settings.timePerQuestion);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const questionStartTimeRef = useRef<number>(performance.now());
  const timerIntervalRef = useRef<number | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sound & Motion state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(settings.soundEnabled);

  // Confirm dialogs for teacher controls
  const [confirmModal, setConfirmModal] = useState<{
    type: 'REPLAY' | 'FINISH_EARLY' | 'EXIT';
    title: string;
    message: string;
  } | null>(null);

  // Current Question
  const currentQuestion: ArenaQuestion = questions[currentIndex] || questions[0];
  const isFinalQuestion = currentIndex === questions.length - 1;
  const isDoublePoints = settings.doubleFinalQuestion && isFinalQuestion;
  const currentBasePoints = isDoublePoints ? settings.basePoints * 2 : settings.basePoints;

  // Team 1 State
  const [team1, setTeam1] = useState<ArenaTeamState>({
    id: 'team1',
    name: team1Config.name,
    mascotId: team1Config.mascotId,
    color: team1Config.color,
    score: 0,
    selectedOption: null,
    lockedAt: null,
    isLocked: false,
    isCorrect: null,
    speedBonusEarned: false,
    history: [],
  });

  // Team 2 State
  const [team2, setTeam2] = useState<ArenaTeamState>({
    id: 'team2',
    name: team2Config.name,
    mascotId: team2Config.mascotId,
    color: team2Config.color,
    score: 0,
    selectedOption: null,
    lockedAt: null,
    isLocked: false,
    isCorrect: null,
    speedBonusEarned: false,
    history: [],
  });

  // Keep refs in sync to prevent stale closures during rapid touches or auto-reveal timeouts
  const team1Ref = useRef(team1);
  const team2Ref = useRef(team2);
  team1Ref.current = team1;
  team2Ref.current = team2;

  // Track if scores for the current turn have been tallied
  const turnProcessedRef = useRef<boolean>(false);

  // --- AUDIO HELPER ---
  const playSound = useCallback((fn: () => void) => {
    if (soundEnabled) {
      try {
        fn();
      } catch {
        // ignore
      }
    }
  }, [soundEnabled]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // --- QUESTION SETUP & TIMER ---
  const startQuestionTurn = useCallback((index: number) => {
    setCurrentIndex(index);
    setTurnState('QUESTION');
    setTimeLeft(settings.timePerQuestion);
    setIsPaused(false);
    turnProcessedRef.current = false;
    questionStartTimeRef.current = performance.now();

    // Reset team turn inputs
    setTeam1((prev) => ({
      ...prev,
      selectedOption: null,
      lockedAt: null,
      isLocked: false,
      isCorrect: null,
      speedBonusEarned: false,
    }));

    setTeam2((prev) => ({
      ...prev,
      selectedOption: null,
      lockedAt: null,
      isLocked: false,
      isCorrect: null,
      speedBonusEarned: false,
    }));

    playSound(() => soundEngine.playWhoosh());
  }, [settings.timePerQuestion, playSound]);

  // Handle countdown interval
  useEffect(() => {
    if (turnState !== 'QUESTION' || isPaused || settings.timePerQuestion === 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleTimeExpired();
          return 0;
        }
        // Audible ticks in final 5 seconds
        if (prev <= 6) {
          playSound(() => soundEngine.playPip(prev <= 3));
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [turnState, isPaused, settings.timePerQuestion, playSound]);

  // --- REVEAL ANSWERS & SCORING ---
  const processTurnResults = useCallback(() => {
    if (turnProcessedRef.current) return;
    turnProcessedRef.current = true;
    setTurnState('REVEAL');

    const correctKey = currentQuestion.correctKey;
    const t1 = team1Ref.current;
    const t2 = team2Ref.current;
    const t1Selected = t1.selectedOption;
    const t2Selected = t2.selectedOption;

    const t1Correct = t1Selected === correctKey;
    const t2Correct = t2Selected === correctKey;

    let t1Points = t1Correct ? currentBasePoints : 0;
    let t2Points = t2Correct ? currentBasePoints : 0;

    let t1SpeedBonus = false;
    let t2SpeedBonus = false;

    // Speed bonus calculation (only if both are correct, faster by >= 100ms)
    if (settings.speedBonus && t1Correct && t2Correct && t1.lockedAt && t2.lockedAt) {
      const delta = t2.lockedAt - t1.lockedAt;
      if (delta >= 100) {
        t1SpeedBonus = true;
        t1Points += settings.speedBonusPoints;
      } else if (delta <= -100) {
        t2SpeedBonus = true;
        t2Points += settings.speedBonusPoints;
      }
    }

    // Audio cue
    playSound(() => {
      if (t1Correct || t2Correct) {
        soundEngine.playSuccess();
      } else {
        soundEngine.playError();
      }
    });

    // Update teams with final points & history
    const t1ResponseTime = t1.lockedAt ? Math.round(t1.lockedAt - questionStartTimeRef.current) : null;
    const t2ResponseTime = t2.lockedAt ? Math.round(t2.lockedAt - questionStartTimeRef.current) : null;

    setTeam1((prev) => ({
      ...prev,
      isCorrect: t1Correct,
      speedBonusEarned: t1SpeedBonus,
      score: prev.score + t1Points,
      history: [
        ...prev.history,
        {
          questionId: currentQuestion.id,
          selectedOption: t1Selected,
          isCorrect: t1Correct,
          pointsAwarded: t1Points,
          responseTimeMs: t1ResponseTime,
        },
      ],
    }));

    setTeam2((prev) => ({
      ...prev,
      isCorrect: t2Correct,
      speedBonusEarned: t2SpeedBonus,
      score: prev.score + t2Points,
      history: [
        ...prev.history,
        {
          questionId: currentQuestion.id,
          selectedOption: t2Selected,
          isCorrect: t2Correct,
          pointsAwarded: t2Points,
          responseTimeMs: t2ResponseTime,
        },
      ],
    }));
  }, [
    currentQuestion,
    currentBasePoints,
    settings.speedBonus,
    settings.speedBonusPoints,
    playSound,
  ]);

  // Handle when time runs out
  const handleTimeExpired = useCallback(() => {
    playSound(() => soundEngine.playTimerAlarm());
    // Auto-lock any team that hasn't locked
    setTeam1((prev) => ({ ...prev, isLocked: true }));
    setTeam2((prev) => ({ ...prev, isLocked: true }));
    processTurnResults();
  }, [playSound, processTurnResults]);

  // Auto-reveal if both teams locked
  useEffect(() => {
    if (turnState === 'QUESTION' && team1.isLocked && team2.isLocked && settings.autoReveal) {
      const timer = setTimeout(() => {
        processTurnResults();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [turnState, team1.isLocked, team2.isLocked, settings.autoReveal, processTurnResults]);

  // --- DUAL MULTI-TOUCH BUTTON HANDLER ---
  // Uses onPointerDown with timestamp capture, prevents double taps and event bleeding
  const handleTeamSelect = useCallback((teamId: 'team1' | 'team2', key: 'A' | 'B' | 'C' | 'D') => {
    if (turnState !== 'QUESTION') return;
    const now = performance.now();

    if (teamId === 'team1') {
      if (team1Ref.current.isLocked) return;
      playSound(() => soundEngine.playTick(1.4));
      setTeam1((prev) => {
        if (prev.isLocked) return prev;
        return {
          ...prev,
          selectedOption: key,
          lockedAt: now,
          isLocked: true,
        };
      });
    } else {
      if (team2Ref.current.isLocked) return;
      playSound(() => soundEngine.playTick(1.8));
      setTeam2((prev) => {
        if (prev.isLocked) return prev;
        return {
          ...prev,
          selectedOption: key,
          lockedAt: now,
          isLocked: true,
        };
      });
    }
  }, [turnState, playSound]);

  // Next question or finish match
  const handleNextQuestionOrFinish = () => {
    if (currentIndex < questions.length - 1) {
      startQuestionTurn(currentIndex + 1);
    } else {
      // Game over, announce victory
      playSound(() => soundEngine.playVictoryFanfare());
      onFinishMatch(team1, team2);
    }
  };

  // Replay question safely without duplicate scoring
  const handleReplayQuestion = () => {
    // If the turn was already processed/scored, rollback the points and history for this question
    if (turnProcessedRef.current) {
      setTeam1((prev) => {
        const lastHist = prev.history[prev.history.length - 1];
        if (lastHist && lastHist.questionId === currentQuestion.id) {
          return {
            ...prev,
            score: Math.max(0, prev.score - (lastHist.pointsAwarded || 0)),
            history: prev.history.slice(0, -1),
          };
        }
        return prev;
      });

      setTeam2((prev) => {
        const lastHist = prev.history[prev.history.length - 1];
        if (lastHist && lastHist.questionId === currentQuestion.id) {
          return {
            ...prev,
            score: Math.max(0, prev.score - (lastHist.pointsAwarded || 0)),
            history: prev.history.slice(0, -1),
          };
        }
        return prev;
      });
    }

    startQuestionTurn(currentIndex);
    setConfirmModal(null);
  };

  // Finish match early
  const handleConfirmFinishEarly = () => {
    setConfirmModal(null);
    onFinishMatch(team1, team2);
  };

  // Compute mascot moods
  const team1MascotMood: MascotMood = useMemo(() => {
    if (turnState === 'REVEAL') {
      return team1.isCorrect ? 'correct' : 'wrong';
    }
    return team1.isLocked ? 'locked' : 'idle';
  }, [turnState, team1.isCorrect, team1.isLocked]);

  const team2MascotMood: MascotMood = useMemo(() => {
    if (turnState === 'REVEAL') {
      return team2.isCorrect ? 'correct' : 'wrong';
    }
    return team2.isLocked ? 'locked' : 'idle';
  }, [turnState, team2.isCorrect, team2.isLocked]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden font-sans">
      {/* Background Arena Ambient Glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* =========================================================
          TOP STAGE BAR: Scores, Arena Title, Timer & Mascots
         ========================================================= */}
      <header className="relative z-20 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between shadow-xl flex-shrink-0">
        {/* Team 1 Score Card (Left) */}
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          {settings.showMascots && (
            <ArenaMascot
              mascotId={team1.mascotId}
              mood={team1MascotMood}
              size="md"
              showBadge={false}
              animate={!settings.reducedMotion}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <h3 className="text-xs sm:text-base font-black text-orange-400 uppercase tracking-tight truncate">
                {team1.name}
              </h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-3xl font-black text-white tracking-tighter drop-shadow-md">
                {team1.score}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">điểm</span>
              {team1.isLocked && turnState === 'QUESTION' && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                  🔒 ĐÃ KHÓA
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Arena Status: Question Number & Timer Clock */}
        <div className="flex flex-col items-center justify-center text-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              CÂU {currentIndex + 1} / {questions.length}
            </span>
            {isDoublePoints && (
              <span className="text-[10px] font-black uppercase text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1 animate-pulse">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>x2 ĐIỂM</span>
              </span>
            )}
          </div>

          {/* Big Digital Countdown Clock */}
          {settings.timePerQuestion > 0 ? (
            <div
              className={`mt-1 font-mono font-black text-2xl sm:text-4xl tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                timeLeft <= 5 && turnState === 'QUESTION'
                  ? 'text-rose-400 animate-pulse scale-110 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              }`}
            >
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              <span>{String(timeLeft).padStart(2, '0')}s</span>
            </div>
          ) : (
            <div className="mt-1 font-bold text-slate-400 text-xs sm:text-sm">
              Không giới hạn thời gian
            </div>
          )}
        </div>

        {/* Team 2 Score Card (Right) */}
        <div className="flex items-center justify-end gap-3 w-1/3 min-w-0 text-right">
          <div className="min-w-0">
            <div className="flex items-center justify-end gap-1.5">
              <h3 className="text-xs sm:text-base font-black text-cyan-400 uppercase tracking-tight truncate">
                {team2.name}
              </h3>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <div className="flex items-baseline justify-end gap-2">
              {team2.isLocked && turnState === 'QUESTION' && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                  🔒 ĐÃ KHÓA
                </span>
              )}
              <span className="text-xl sm:text-3xl font-black text-white tracking-tighter drop-shadow-md">
                {team2.score}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">điểm</span>
            </div>
          </div>
          {settings.showMascots && (
            <ArenaMascot
              mascotId={team2.mascotId}
              mood={team2MascotMood}
              size="md"
              showBadge={false}
              animate={!settings.reducedMotion}
            />
          )}
        </div>
      </header>

      {/* =========================================================
          MIDDLE STAGE: UNIFIED ARENA QUESTION CARD (Shared)
         ========================================================= */}
      <section className="relative z-10 px-4 sm:px-8 py-3 sm:py-5 flex-1 flex flex-col justify-center items-center max-w-5xl mx-auto w-full">
        {/* Double points indicator ribbon on final question */}
        {isDoublePoints && (
          <div className="mb-2 px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/30 flex items-center gap-1.5 animate-pulse">
            <Flame className="w-4 h-4 text-slate-950 fill-current" />
            <span>CÂU HỎI QUYẾT ĐỊNH – NHÂN ĐÔI ĐIỂM SỐ (+{currentBasePoints} ĐIỂM)</span>
            <Flame className="w-4 h-4 text-slate-950 fill-current" />
          </div>
        )}

        <div className="w-full bg-slate-900/90 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Subtle top indicator bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400/90">
              {currentQuestion.lessonName ? `Bài học: ${currentQuestion.lessonName}` : 'Câu hỏi thi đấu'}
            </span>
            <span className="font-mono text-slate-400">
              Giá trị câu hỏi: <strong className="text-emerald-400 font-black">+{currentBasePoints} điểm</strong>
              {settings.speedBonus && ' (Thưởng tốc độ +5đ)'}
            </span>
          </div>

          {/* Question Stem Text (Large & Clear for Smartboard) */}
          <div className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white text-center leading-snug tracking-tight my-2">
            <MathRenderer text={currentQuestion.stem} />
          </div>

          {/* Optional Question Image */}
          {currentQuestion.imageUrl && (
            <div className="mt-3 flex justify-center max-h-48">
              <img
                src={currentQuestion.imageUrl}
                alt="Hình minh họa"
                className="max-h-48 object-contain rounded-xl border border-slate-700 shadow-md"
              />
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          BOTTOM STAGE: DUAL TOUCH PODS (TEAM 1 VS TEAM 2)
         ========================================================= */}
      <main className="relative z-20 px-3 sm:px-6 pb-14 sm:pb-16 flex-1 flex flex-col justify-end max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 gap-3 sm:gap-6 relative">
          {/* Flaming VS Emblem in center divider */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-rose-600 border-2 sm:border-4 border-slate-950 flex items-center justify-center text-white font-black text-xs sm:text-base shadow-2xl shadow-orange-500/40">
              VS
            </div>
          </div>

          {/* =======================
              TEAM 1 POD (LEFT)
             ======================= */}
          <div className="relative bg-gradient-to-br from-orange-950/40 via-slate-900/95 to-slate-950 border-2 border-orange-500/50 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col justify-between">
            {/* Pod Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-orange-500/30">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                <span className="font-black text-xs sm:text-sm text-orange-400 uppercase tracking-tight">
                  {team1.name}
                </span>
              </div>
              <span className="text-[10px] font-bold text-orange-300/80 uppercase">
                {team1.isLocked ? '🔒 ĐÃ CHỐT' : 'CHẠM ĐỂ CHỌN'}
              </span>
            </div>

            {/* Answer Options Grid (A, B, C, D) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 relative">
              {currentQuestion.options.map((opt) => {
                const isSelected = team1.selectedOption === opt.key;
                const isCorrectAnswer = opt.key === currentQuestion.correctKey;
                const isReveal = turnState === 'REVEAL';

                let btnStyle = 'bg-slate-900/90 border-slate-700/80 text-slate-100 hover:border-orange-400 active:scale-95';

                if (isReveal) {
                  if (isCorrectAnswer) {
                    btnStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/30';
                  } else if (isSelected && !isCorrectAnswer) {
                    btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 line-through opacity-85';
                  } else {
                    btnStyle = 'bg-slate-950/60 border-slate-800 text-slate-500';
                  }
                }

                return (
                  <button
                    key={`t1-${opt.key}`}
                    type="button"
                    disabled={team1.isLocked || turnState !== 'QUESTION'}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleTeamSelect('team1', opt.key);
                    }}
                    style={{ touchAction: 'manipulation' }}
                    className={`min-h-[56px] sm:min-h-[72px] p-2.5 sm:p-3 rounded-2xl border-2 font-bold transition-all flex items-center gap-2.5 text-left cursor-pointer disabled:cursor-default ${btnStyle}`}
                  >
                    <span
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl font-black text-sm sm:text-base flex items-center justify-center shrink-0 border shadow-inner ${
                        isReveal && isCorrectAnswer
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                          : isReveal && isSelected && !isCorrectAnswer
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold truncate flex-1">
                      <MathRenderer text={opt.text} />
                    </span>
                  </button>
                );
              })}

              {/* Secret Lock Overlay (During QUESTION phase: hides chosen option from opponent) */}
              {team1.isLocked && turnState === 'QUESTION' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl border-2 border-orange-500/70 flex flex-col items-center justify-center p-3 text-center z-20 animate-scale-in">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center text-xl mb-1 shadow-lg shadow-orange-500/20">
                    🔒
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-orange-300 uppercase tracking-tight">
                    ĐÃ KHÓA CÂU TRẢ LỜI!
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Bảo mật đáp án trước đối thủ • Chờ công bố
                  </p>
                </div>
              )}
            </div>

            {/* Turn Reveal Feedback Banner for Team 1 */}
            {turnState === 'REVEAL' && (
              <div
                className={`mt-2 p-2 rounded-xl border flex items-center justify-between text-xs font-bold animate-fade-in ${
                  team1.isCorrect
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {team1.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    {team1.selectedOption
                      ? `Đã chọn ${team1.selectedOption}: ${team1.isCorrect ? `CHÍNH XÁC (+${team1.history[team1.history.length - 1]?.pointsAwarded ?? currentBasePoints}đ)` : 'CHƯA ĐÚNG (0đ)'}`
                      : 'Hết giờ (Không trả lời)'}
                  </span>
                </div>
                {team1.speedBonusEarned && (
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-sm">
                    <Zap className="w-3 h-3" />
                    <span>GỒM +{settings.speedBonusPoints}đ TỐC ĐỘ</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* =======================
              TEAM 2 POD (RIGHT)
             ======================= */}
          <div className="relative bg-gradient-to-br from-cyan-950/40 via-slate-900/95 to-slate-950 border-2 border-cyan-500/50 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col justify-between">
            {/* Pod Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/30">
              <span className="text-[10px] font-bold text-cyan-300/80 uppercase">
                {team2.isLocked ? '🔒 ĐÃ CHỐT' : 'CHẠM ĐỂ CHỌN'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs sm:text-sm text-cyan-400 uppercase tracking-tight">
                  {team2.name}
                </span>
                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
              </div>
            </div>

            {/* Answer Options Grid (A, B, C, D) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 relative">
              {currentQuestion.options.map((opt) => {
                const isSelected = team2.selectedOption === opt.key;
                const isCorrectAnswer = opt.key === currentQuestion.correctKey;
                const isReveal = turnState === 'REVEAL';

                let btnStyle = 'bg-slate-900/90 border-slate-700/80 text-slate-100 hover:border-cyan-400 active:scale-95';

                if (isReveal) {
                  if (isCorrectAnswer) {
                    btnStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/30';
                  } else if (isSelected && !isCorrectAnswer) {
                    btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 line-through opacity-85';
                  } else {
                    btnStyle = 'bg-slate-950/60 border-slate-800 text-slate-500';
                  }
                }

                return (
                  <button
                    key={`t2-${opt.key}`}
                    type="button"
                    disabled={team2.isLocked || turnState !== 'QUESTION'}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleTeamSelect('team2', opt.key);
                    }}
                    style={{ touchAction: 'manipulation' }}
                    className={`min-h-[56px] sm:min-h-[72px] p-2.5 sm:p-3 rounded-2xl border-2 font-bold transition-all flex items-center gap-2.5 text-left cursor-pointer disabled:cursor-default ${btnStyle}`}
                  >
                    <span
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl font-black text-sm sm:text-base flex items-center justify-center shrink-0 border shadow-inner ${
                        isReveal && isCorrectAnswer
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                          : isReveal && isSelected && !isCorrectAnswer
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      }`}
                    >
                      {opt.key}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold truncate flex-1">
                      <MathRenderer text={opt.text} />
                    </span>
                  </button>
                );
              })}

              {/* Secret Lock Overlay (During QUESTION phase) */}
              {team2.isLocked && turnState === 'QUESTION' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl border-2 border-cyan-500/70 flex flex-col items-center justify-center p-3 text-center z-20 animate-scale-in">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-xl mb-1 shadow-lg shadow-cyan-500/20">
                    🔒
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-cyan-300 uppercase tracking-tight">
                    ĐÃ KHÓA CÂU TRẢ LỜI!
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Bảo mật đáp án trước đối thủ • Chờ công bố
                  </p>
                </div>
              )}
            </div>

            {/* Turn Reveal Feedback Banner for Team 2 */}
            {turnState === 'REVEAL' && (
              <div
                className={`mt-2 p-2 rounded-xl border flex items-center justify-between text-xs font-bold animate-fade-in ${
                  team2.isCorrect
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {team2.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    {team2.selectedOption
                      ? `Đã chọn ${team2.selectedOption}: ${team2.isCorrect ? `CHÍNH XÁC (+${team2.history[team2.history.length - 1]?.pointsAwarded ?? currentBasePoints}đ)` : 'CHƯA ĐÚNG (0đ)'}`
                      : 'Hết giờ (Không trả lời)'}
                  </span>
                </div>
                {team2.speedBonusEarned && (
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-sm">
                    <Zap className="w-3 h-3" />
                    <span>GỒM +{settings.speedBonusPoints}đ TỐC ĐỘ</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button: Next Question or Finish Match (Appears in REVEAL state) */}
        {turnState === 'REVEAL' && (
          <div className="mt-3 flex justify-center animate-fade-in">
            <button
              type="button"
              onClick={handleNextQuestionOrFinish}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-sm sm:text-base shadow-2xl shadow-orange-500/40 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <span>{isFinalQuestion ? '🏆 XEM KẾT QUẢ CHUNG CUỘC' : 'CÂU TIẾP THEO'}</span>
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>
        )}
      </main>

      {/* =========================================================
          DISCRETE FLOATING TEACHER CONTROL BAR (Fixed at bottom)
         ========================================================= */}
      <footer className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3 py-1.5 shadow-2xl backdrop-blur-md flex items-center gap-1.5 sm:gap-2 text-xs">
        {/* Pause / Resume */}
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={isPaused ? 'Tiếp tục đồng hồ' : 'Tạm dừng đồng hồ'}
        >
          {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Reveal Answer Immediately */}
        {turnState === 'QUESTION' && (
          <button
            type="button"
            onClick={processTurnResults}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Công bố đáp án ngay lập tức"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Công bố</span>
          </button>
        )}

        {/* Replay Question */}
        <button
          type="button"
          onClick={() =>
            setConfirmModal({
              type: 'REPLAY',
              title: 'Chơi lại câu hỏi này?',
              message: 'Điểm số của câu hiện tại sẽ được đặt lại cho cả hai đội.',
            })
          }
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Chơi lại câu này"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình bảng tương tác'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-sky-400" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Finish Early */}
        <button
          type="button"
          onClick={() =>
            setConfirmModal({
              type: 'FINISH_EARLY',
              title: 'Kết thúc trận đấu sớm?',
              message: 'Hệ thống sẽ tổng kết điểm số hiện tại và trao cúp vô địch.',
            })
          }
          className="px-2 py-1 rounded-lg text-amber-300 hover:bg-slate-800 font-bold transition-colors cursor-pointer"
          title="Kết thúc trận đấu sớm"
        >
          <span>Kết thúc</span>
        </button>

        {/* Exit Game */}
        <button
          type="button"
          onClick={() =>
            setConfirmModal({
              type: 'EXIT',
              title: 'Thoát Đấu Trường Kiến Thức?',
              message: 'Trận đấu đang diễn ra sẽ bị hủy và trở về ClassGo.',
            })
          }
          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition-colors cursor-pointer"
          title="Thoát trò chơi"
        >
          <X className="w-4 h-4" />
        </button>
      </footer>

      {/* Confirmation Dialog Modal for Teacher Actions */}
      {confirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-center">
            <h4 className="font-black text-base text-white">{confirmModal.title}</h4>
            <p className="text-xs text-slate-400">{confirmModal.message}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === 'REPLAY') handleReplayQuestion();
                  else if (confirmModal.type === 'FINISH_EARLY') handleConfirmFinishEarly();
                  else if (confirmModal.type === 'EXIT') onExitGame();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
