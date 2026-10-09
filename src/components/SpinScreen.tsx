import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Award,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Undo2,
  ChevronRight,
  Sparkle,
  Mic,
  MicOff,
  Disc,
  Layers,
  LayoutGrid,
  Gift,
  Rocket,
  Sailboat,
  Clock,
  BookOpen,
  Users,
  UserCheck,
  UserX,
  X,
  Play,
  Crown,
  AlertTriangle,
  Sliders,
  Filter,
  Wand2,
} from 'lucide-react';
import {
  ClassRoom,
  HistoryRecord,
  SelectionMode,
  SpinSettings,
  SpinVisualType,
  Student,
  QuestionItem,
  UserSubscription,
  NameDisplayStyle,
  WheelSizeOption,
  CallTargetFilter,
  DisciplineRecord,
  DisciplineViolationType,
} from '../types';
import { chooseMultipleStudents, getEligibleStudents, MultiSelectionResult } from '../utils/fairAlgorithm';
import {
  formatStudentDisplayName,
  getStudentSTT,
  filterStudentsByTarget,
  getSpeechAnnouncementText,
} from '../utils/studentDisplay';
import {
  applyQuickScoreToStudent,
  getScoreFeedbackMessage,
  TxColumn,
} from '../utils/quickScoreHelper';
import { soundEngine } from '../utils/audio';
import { ENABLE_TRIAL_LIMIT, TRIAL_DURATION_DAYS } from '../config/subscriptionConfig';
import { speechEngine } from '../utils/speech';
import { MathRenderer } from './MathRenderer';
import { StudentProfileCard } from './StudentProfileCard';

import { WheelVisual } from './visuals/WheelVisual';
import { SlotVisual } from './visuals/SlotVisual';
import { CardsVisual } from './visuals/CardsVisual';
import { ChestVisual } from './visuals/ChestVisual';
import { BalloonVisual } from './visuals/BalloonVisual';
import { HorseRaceVisual } from './visuals/HorseRaceVisual';
import { BoatRaceVisual } from './visuals/BoatRaceVisual';
import { RocketVisual } from './visuals/RocketVisual';
import { MagicCardVisual } from './visuals/MagicCardVisual';
import { PyramidVisual } from './visuals/PyramidVisual';

const BalloonIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2a7 7 0 0 0-7 7c0 5 4 8 7 8s7-3 7-8a7 7 0 0 0-7-7z" />
    <path d="M10.5 17 12 19l1.5-2" />
    <path d="M12 19v3" />
    <path d="M9.5 6.5A3.5 3.5 0 0 1 13 4" />
  </svg>
);

const HorseIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21H5" />
    <path d="M16 21v-4a5 5 0 0 0-1-3l.5-4a1 1 0 0 0-1.5-1l-3 1.5L9 7a1 1 0 0 0-1.5.5L5.5 11a4 4 0 0 0 0 4l2.5 1.5V21" />
    <circle cx="10" cy="11" r="0.75" fill="currentColor" />
  </svg>
);

interface SpinScreenProps {
  activeClass: ClassRoom;
  selectionMode: SelectionMode;
  onToggleSelectionMode: () => void;
  settings: SpinSettings;
  onStudentSelected: (student: Student, mode: SelectionMode, score?: string, note?: string) => void;
  onBatchStudentsSelected?: (students: Student[], mode: SelectionMode) => void;
  onSaveScoreAndNote?: (
    students: Student[],
    mode: SelectionMode,
    score?: string,
    note?: string
  ) => void;
  onUndoLastSelection?: (recordId: string) => void;
  lastHistoryRecord?: HistoryRecord | null;
  onOpenPresentation: () => void;
  onOpenTimer: () => void;
  onOpenQuestions: () => void;
  onOpenAttendance?: () => void;
  onOpenGroups?: () => void;
  onAwardStars?: (studentId: string, count: number) => void;
  onToggleThemeMode?: () => void;
  onOpenQuestionSpotlight?: (question: QuestionItem) => void;
  activeQuestion?: QuestionItem | null;
  onClearActiveQuestion?: () => void;
  subscription?: UserSubscription | null;
  onOpenUpgradeModal?: () => void;
  onOpenExpiredModal?: () => void;
  onRecordDisciplineFromSpin?: (student: Student, violationTypeId: string, note?: string) => string | void;
  onUndoDisciplineRecord?: (recordId: string) => void;
  disciplineRecords?: DisciplineRecord[];
  disciplineViolationTypes?: DisciplineViolationType[];
}

export const SpinScreen: React.FC<SpinScreenProps> = ({
  activeClass,
  selectionMode,
  onToggleSelectionMode,
  settings,
  onStudentSelected,
  onBatchStudentsSelected,
  onSaveScoreAndNote,
  onUndoLastSelection,
  lastHistoryRecord,
  onOpenPresentation,
  onOpenTimer,
  onOpenQuestions,
  onOpenAttendance,
  onOpenGroups,
  onAwardStars,
  onToggleThemeMode,
  onOpenQuestionSpotlight,
  activeQuestion,
  onClearActiveQuestion,
  subscription,
  onOpenUpgradeModal,
  onOpenExpiredModal,
  onRecordDisciplineFromSpin,
  onUndoDisciplineRecord,
  disciplineRecords = [],
  disciplineViolationTypes = [],
}) => {
  const [visualType, setVisualType] = useState<SpinVisualType>(
    settings.defaultVisualType || 'WHEEL'
  );
  const [pickCount, setPickCount] = useState<number>(settings.defaultPickCount || 1);
  const [wheelSizeOption, setWheelSizeOption] = useState<WheelSizeOption>(
    settings.wheelSizeOption || 'LARGE'
  );
  const [nameStyle, setNameStyle] = useState<NameDisplayStyle>(
    settings.nameDisplayStyle || 'FULL_NAME'
  );
  const [targetFilter, setTargetFilter] = useState<CallTargetFilter>('ALL');
  const [sttFrom, setSttFrom] = useState<number>(1);
  const [sttTo, setSttTo] = useState<number>(() => Math.max(1, Math.min(15, activeClass?.students?.length || 15)));

  const [selectedProfileStudent, setSelectedProfileStudent] = useState<Student | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayName, setDisplayName] = useState<string>('???');
  const [targetWinner, setTargetWinner] = useState<Student | null>(null);
  const [targetWinners, setTargetWinners] = useState<Student[]>([]);
  const [selectedResult, setSelectedResult] = useState<MultiSelectionResult | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [quickScore, setQuickScore] = useState<string>('');
  const [quickNote, setQuickNote] = useState<string>('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [scoreFeedbackMessage, setScoreFeedbackMessage] = useState<string | null>(null);
  const [assignedTurnSlots, setAssignedTurnSlots] = useState<Record<string, TxColumn | null>>({});
  const [awardedStarsMap, setAwardedStarsMap] = useState<{ [id: string]: number }>({});
  const [selectedDisciplineChoice, setSelectedDisciplineChoice] = useState<string | null>(null);
  const [lastDisciplineRecordId, setLastDisciplineRecordId] = useState<string | null>(null);
  const [disciplineFeedback, setDisciplineFeedback] = useState<string>('');
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused' | 'error'>('idle');
  const [speakingText, setSpeakingText] = useState<string>('');

  // Wheel angle state
  const [wheelAngle, setWheelAngle] = useState(0);

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const students = activeClass?.students || [];
  const eligibleStudents = getEligibleStudents(students);
  const absentStudents = students.filter((s) => s.isAbsent);

  // Auto-sync sttTo if active class changes
  useEffect(() => {
    if (activeClass?.students && activeClass.students.length > 0) {
      if (sttTo > activeClass.students.length) {
        setSttTo(activeClass.students.length);
      }
    }
  }, [activeClass?.id, activeClass?.students?.length]);

  // Target candidates according to current targetFilter
  const targetCandidates = useMemo(() => {
    return filterStudentsByTarget(eligibleStudents, targetFilter, students, sttFrom, sttTo);
  }, [eligibleStudents, targetFilter, students, sttFrom, sttTo]);

  // Target filter stats
  const studentsWithoutTx1 = eligibleStudents.filter(
    (s) => s.scores?.tx1 === null || s.scores?.tx1 === undefined
  );
  const femaleStudents = eligibleStudents.filter((s) => s.gender === 'nu');
  const maleStudents = eligibleStudents.filter((s) => s.gender === 'nam');

  const WHEEL_SIZES: Record<WheelSizeOption, { size: number; label: string; tip: string }> = {
    STANDARD: { size: 380, label: 'Vừa (380px)', tip: 'Kích thước tiêu chuẩn' },
    LARGE: { size: 460, label: 'Lớn (460px)', tip: 'Kích thước lớn - Rõ nét, khuyên dùng' },
    XLARGE: { size: 540, label: 'Cực đại (540px)', tip: 'Kích thước cực đại - Tối ưu Máy chiếu / Tivi' },
  };

  // Subscribe to speech engine updates
  useEffect(() => {
    const unsub = speechEngine.subscribe((state, text) => {
      setSpeechState(state);
      setSpeakingText(text);
    });
    return () => unsub();
  }, []);

  // Update speech engine config when settings change
  useEffect(() => {
    speechEngine.updateConfig({
      enabled: settings.ttsEnabled,
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
      template: settings.ttsTemplate,
      voiceUri: settings.ttsVoiceUri,
      announceCount: settings.ttsAnnounceCount,
    });
  }, [settings]);

  // Calculate current fair group stats according to active targetFilter (fairPool)
  const fairPool = targetFilter === 'ALL' ? eligibleStudents : targetCandidates;
  const minCall = fairPool.length > 0 ? Math.min(...fairPool.map((s) => s.callCount || 0)) : 0;
  const minCandidates = fairPool.length > 0 ? fairPool.filter((s) => (s.callCount || 0) === minCall) : [];

  // Resolve current up-to-date students for winner(s) directly from activeClass.students
  const resolvedSelectedStudents = useMemo(() => {
    if (!selectedResult) return [];
    return selectedResult.selectedStudents.map(
      (oldStudent) => students.find((s) => s.id === oldStudent.id) || oldStudent
    );
  }, [selectedResult, students]);

  const resolvedWinner = useMemo(() => {
    if (resolvedSelectedStudents.length > 0) {
      return resolvedSelectedStudents[0];
    }
    if (targetWinner) {
      return students.find((s) => s.id === targetWinner.id) || targetWinner;
    }
    return null;
  }, [resolvedSelectedStudents, targetWinner, students]);

  const resolvedTargetWinners = useMemo(() => {
    return targetWinners.map(
      (oldStudent) => students.find((s) => s.id === oldStudent.id) || oldStudent
    );
  }, [targetWinners, students]);

  const resolvedVisualSelectedStudents = useMemo(() => {
    return resolvedSelectedStudents.length > 0 ? resolvedSelectedStudents : resolvedTargetWinners;
  }, [resolvedSelectedStudents, resolvedTargetWinners]);

  // Trigger realistic confetti
  const triggerConfetti = useCallback(() => {
    if (!settings.confettiEnabled) return;
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#38bdf8', '#f59e0b', '#10b981', '#ec4899'],
      });
    } catch {
      // ignore
    }
  }, [settings.confettiEnabled]);

  // Main Spin Execution
  const handleStartSpin = useCallback(() => {
    if (ENABLE_TRIAL_LIMIT && subscription?.status === 'EXPIRED') {
      soundEngine.playTick(0.6);
      if (onOpenExpiredModal) {
        onOpenExpiredModal();
      } else if (onOpenUpgradeModal) {
        onOpenUpgradeModal();
      }
      return;
    }

    if (isSpinning || eligibleStudents.length === 0) return;

    // 1. Filter candidates according to selected targetFilter
    const candidatePool = targetFilter === 'ALL' ? eligibleStudents : targetCandidates;
    if (candidatePool.length === 0) return;

    // 2. Run algorithm FIRST to guarantee determinism
    const effectiveCount = Math.min(pickCount, candidatePool.length);
    const result = chooseMultipleStudents(candidatePool, effectiveCount, selectionMode);
    if (!result || result.selectedStudents.length === 0) return;

    setTargetWinner(result.selectedStudents[0]);
    setTargetWinners(result.selectedStudents);
    setIsSpinning(true);
    setHasCompleted(false);
    setSelectedResult(null);
    setFeedbackSaved(false);
    setQuickScore('');
    setQuickNote('');
    setScoreFeedbackMessage(null);
    setAssignedTurnSlots({});
    setSelectedDisciplineChoice(null);
    setLastDisciplineRecordId(null);
    setDisciplineFeedback('');

    // Sound: Start Suspense BGM & whoosh
    soundEngine.playWhoosh();
    speechEngine.unlock();
    speechEngine.stop();
    if (settings.bgmStyle && settings.bgmStyle !== 'OFF') {
      soundEngine.startBGM(settings.bgmStyle, settings.bgmVolume ?? 0.4);
    }

    // 3. Setup animation
    const duration = settings.spinDuration || 3800; // ms
    const startTime = performance.now();
    startTimeRef.current = startTime;

    const namesList = candidatePool.map((s) =>
      formatStudentDisplayName(s, students, nameStyle, false)
    );
    // Shuffle auxiliary names for reel display
    const reelPool = [...namesList];
    for (let i = reelPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reelPool[i], reelPool[j]] = [reelPool[j], reelPool[i]];
    }

    // Target student for visual wheel stop (primary winner)
    const primaryWinner = result.selectedStudents[0];
    const totalVisualStudents = candidatePool.length;
    const maxVisualSlices = Math.min(totalVisualStudents, 36);
    const winnerIdx = candidatePool.findIndex((s) => s.id === primaryWinner.id);
    const sliceAngleDeg = 360 / maxVisualSlices;
    const targetSliceCenterDeg = (winnerIdx % maxVisualSlices) * sliceAngleDeg + sliceAngleDeg / 2;
    const targetAngle = 360 - targetSliceCenterDeg;
    const initialAngle = wheelAngle % 360;
    const totalRotationDegrees = 360 * 6 + targetAngle - initialAngle;

    let lastTickTime = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic curve for natural deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Update Wheel Angle
      const currentWheelRotation = initialAngle + totalRotationDegrees * easeOut;
      setWheelAngle(currentWheelRotation);

      // Interval between name switches increases as we approach 100%
      const switchInterval = 40 + easeOut * 280;

      if (now - lastTickTime > switchInterval) {
        lastTickTime = now;
        if (progress < 0.92) {
          const randomIdx = Math.floor(Math.random() * reelPool.length);
          setDisplayName(reelPool[randomIdx]);
          soundEngine.playTick(1.0 + (1 - progress) * 0.5);
        } else {
          setDisplayName(
            result.selectedStudents.length === 1
              ? formatStudentDisplayName(result.selectedStudents[0], students, nameStyle, false)
              : result.selectedStudents
                  .map((s) => formatStudentDisplayName(s, students, nameStyle, false))
                  .join(' & ')
          );
          soundEngine.playTick(0.85);
        }
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        // FINISHED SPINNING
        setIsSpinning(false);
        setDisplayName(
          result.selectedStudents.length === 1
            ? formatStudentDisplayName(result.selectedStudents[0], students, nameStyle, false)
            : result.selectedStudents
                .map((s) => formatStudentDisplayName(s, students, nameStyle, false))
                .join(' & ')
        );
        setSelectedResult(result);
        setHasCompleted(true);
        setWheelAngle(initialAngle + totalRotationDegrees);

        // Stop BGM before fanfare!
        soundEngine.stopBGM();

        // Sound fanfare & confetti
        soundEngine.playVictoryFanfare();
        triggerConfetti();

        // 4. Text-to-Speech announcement
        if (settings.ttsEnabled) {
          setTimeout(() => {
            if (result.selectedStudents.length === 1) {
              const winnerStudent = result.selectedStudents[0];
              const callCountNext = (winnerStudent.callCount || 0) + 1;
              const speechAnnouncement = getSpeechAnnouncementText(
                winnerStudent,
                students,
                nameStyle,
                settings.ttsTemplate
              );
              speechEngine.speakStudent(winnerStudent.name, callCountNext, speechAnnouncement);
            } else {
              const names = result.selectedStudents.map((s) =>
                formatStudentDisplayName(s, students, nameStyle, false)
              );
              speechEngine.speakMultipleStudents(names);
            }
          }, 350);
        }

        // Increment count and notify parent
        if (result.selectedStudents.length === 1) {
          onStudentSelected(result.selectedStudents[0], selectionMode);
        } else if (onBatchStudentsSelected) {
          onBatchStudentsSelected(result.selectedStudents, selectionMode);
        } else {
          result.selectedStudents.forEach((s) => onStudentSelected(s, selectionMode));
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [
    isSpinning,
    eligibleStudents,
    targetFilter,
    students,
    nameStyle,
    pickCount,
    selectionMode,
    settings.spinDuration,
    settings.bgmStyle,
    settings.bgmVolume,
    settings.ttsEnabled,
    settings.ttsTemplate,
    wheelAngle,
    triggerConfetti,
    onStudentSelected,
    onBatchStudentsSelected,
    subscription,
    onOpenExpiredModal,
    onOpenUpgradeModal,
  ]);

  // Clean up animation & sound on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      soundEngine.stopBGM();
      speechEngine.stop();
    };
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStartSpin();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (!isSpinning) {
          handleStartSpin();
        }
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (onOpenAttendance) onOpenAttendance();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        if (onOpenGroups) onOpenGroups();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onOpenPresentation();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onOpenTimer();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        onOpenQuestions();
      } else if (e.key === 'v' || e.key === 'V') {
        // Replay voice
        if (selectedResult && hasCompleted) {
          handleReplayVoice();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleStartSpin,
    isSpinning,
    onOpenPresentation,
    onOpenTimer,
    onOpenQuestions,
    onOpenAttendance,
    onOpenGroups,
    selectedResult,
    hasCompleted,
  ]);

  const handleSaveScoreAndNote = (scoreVal?: string, noteVal?: string) => {
    const targetStudents =
      resolvedSelectedStudents.length > 0
        ? resolvedSelectedStudents
        : (selectedResult?.selectedStudents || []);
    if (targetStudents.length === 0) return;
    const finalScore = scoreVal !== undefined ? scoreVal : quickScore;
    const finalNote = noteVal !== undefined ? noteVal : quickNote;

    const feedbackMsgs: string[] = [];
    const newAssignedTurnSlots = { ...assignedTurnSlots };

    targetStudents.forEach((st) => {
      const currentSt = activeClass.students.find((s) => s.id === st.id) || st;
      const prevSlot = assignedTurnSlots[st.id];
      const res = applyQuickScoreToStudent(currentSt, finalScore, finalNote, prevSlot);
      if (res.targetSlot) {
        newAssignedTurnSlots[st.id] = res.targetSlot;
      }
      feedbackMsgs.push(getScoreFeedbackMessage(st.name, res.targetSlot, res.isFull, finalScore));
    });

    setAssignedTurnSlots(newAssignedTurnSlots);
    if (feedbackMsgs.length > 0) {
      setScoreFeedbackMessage(feedbackMsgs.join(' | '));
    }

    if (onSaveScoreAndNote) {
      onSaveScoreAndNote(targetStudents, selectionMode, finalScore, finalNote);
    } else {
      targetStudents.forEach((st) => {
        onStudentSelected(st, selectionMode, finalScore, finalNote);
      });
    }
    setFeedbackSaved(true);
  };

  const handleAwardStarBonus = (count: number) => {
    const targetStudents =
      resolvedSelectedStudents.length > 0
        ? resolvedSelectedStudents
        : (selectedResult?.selectedStudents || []);
    if (targetStudents.length === 0 || !onAwardStars) return;
    targetStudents.forEach((st) => {
      onAwardStars(st.id, count);
      setAwardedStarsMap((prev) => ({
        ...prev,
        [st.id]: (prev[st.id] || 0) + count,
      }));
    });
    soundEngine.playStarSound();
    try {
      confetti({
        particleCount: 50 * count,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#f59e0b', '#fde047'],
      });
    } catch {
      // ignore
    }
  };

  const handleUndo = () => {
    if (lastHistoryRecord && onUndoLastSelection) {
      onUndoLastSelection(lastHistoryRecord.id);
      setHasCompleted(false);
      setSelectedResult(null);
      setDisplayName('???');
      setScoreFeedbackMessage(null);
      setAssignedTurnSlots({});
    }
  };

  const handleDisciplineChoice = (choiceId: string) => {
    const targetStudents =
      resolvedSelectedStudents.length > 0
        ? resolvedSelectedStudents
        : (selectedResult?.selectedStudents || []);
    if (targetStudents.length === 0) return;
    const targetStudent = targetStudents[0];

    setSelectedDisciplineChoice(choiceId);

    if (choiceId === 'tra_loi_dung') {
      soundEngine.playVictoryFanfare();
      setDisciplineFeedback(`✅ ${targetStudent.name}: Trả lời đúng (Không ghi lỗi nề nếp)`);
      return;
    }

    if (onRecordDisciplineFromSpin) {
      const recId = onRecordDisciplineFromSpin(targetStudent, choiceId, quickNote || 'Ghi nhận từ vòng Quay tên');
      if (recId && typeof recId === 'string') {
        setLastDisciplineRecordId(recId);
      }
      soundEngine.playTick(1.3);

      const labelMap: Record<string, string> = {
        tra_loi_sai: '❌ Trả lời sai',
        khong_thuoc_bai: '📖 Không thuộc bài',
        khong_lam_bai_tap: '📚 Không làm bài tập',
        noi_chuyen: '🗣️ Nói chuyện',
      };
      setDisciplineFeedback(`📝 Đã ghi nhận nề nếp: +1 ${labelMap[choiceId] || choiceId} cho ${targetStudent.name}`);
    }
  };

  const handleUndoDisciplineFromSpin = () => {
    if (lastDisciplineRecordId && onUndoDisciplineRecord) {
      onUndoDisciplineRecord(lastDisciplineRecordId);
      soundEngine.playTick(0.8);
      setLastDisciplineRecordId(null);
      setSelectedDisciplineChoice(null);
      setDisciplineFeedback('Đã hoàn tác ghi nhận nề nếp.');
    }
  };

  const handleReplayVoice = useCallback(() => {
    speechEngine.unlock();
    if (resolvedSelectedStudents && resolvedSelectedStudents.length > 0) {
      if (resolvedSelectedStudents.length === 1) {
        const winnerStudent = resolvedSelectedStudents[0];
        const speechAnnouncement = getSpeechAnnouncementText(
          winnerStudent,
          students,
          nameStyle,
          settings.ttsTemplate
        );
        speechEngine.speakStudent(
          winnerStudent.name,
          Math.max(1, winnerStudent.callCount ?? 1),
          speechAnnouncement
        );
      } else {
        speechEngine.speakMultipleStudents(
          resolvedSelectedStudents.map((s) =>
            formatStudentDisplayName(s, students, nameStyle, false)
          )
        );
      }
    }
  }, [resolvedSelectedStudents, students, nameStyle, settings.ttsTemplate]);

  const VISUAL_MODES: { id: SpinVisualType; label: string; icon: React.ReactNode }[] = [
    { id: 'WHEEL', label: 'Vòng Quay', icon: <Disc className="w-4 h-4" /> },
    { id: 'SLOT', label: 'Dải Cuộn', icon: <Layers className="w-4 h-4" /> },
    { id: 'CARDS', label: 'Lật Thẻ Bài', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'MAGIC_CARD', label: 'Lá bài ma thuật', icon: <Wand2 className="w-4 h-4 text-purple-400" /> },
    { id: 'CHEST', label: 'Hộp May Mắn', icon: <Gift className="w-4 h-4" /> },
    { id: 'BALLOON', label: 'Bong Bóng', icon: <BalloonIcon className="w-4 h-4" /> },
    { id: 'HORSE_RACE', label: 'Đường đua số', icon: <span className="text-sm">🏁</span> },
    { id: 'BOAT_RACE', label: 'Quay bi xổ số', icon: <span className="text-sm">🎱</span> },
    { id: 'ROCKET', label: 'Tên Lửa', icon: <Rocket className="w-4 h-4" /> },
    { id: 'PYRAMID', label: 'Kim tự tháp bí ẩn', icon: <span className="text-sm">🔺</span> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      
      {/* Expired Subscription Alert Banner */}
      {ENABLE_TRIAL_LIMIT && subscription?.status === 'EXPIRED' && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-amber-950/80 border border-rose-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5 text-xs text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>
              <strong>Gói dùng thử {TRIAL_DURATION_DAYS} ngày đã hết hạn.</strong> Vui lòng nâng cấp CLASSGO PRO (169.000 VNĐ / 12 tháng) để tiếp tục quay gọi tên và bảo toàn dữ liệu.
            </span>
          </div>
          {onOpenUpgradeModal && (
            <button
              onClick={onOpenUpgradeModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Nâng cấp PRO ngay</span>
            </button>
          )}
        </div>
      )}

      {/* Top Banner: Educational header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <span>🏫 KIỂM TRA BÀI CŨ ĐẦU GIỜ</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>LỚP {activeClass?.name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
              <span>🎯 AI SẼ LÊN BẢNG HÔM NAY?</span>
            </h1>
          </div>

          {/* Mode & Tools Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Quick Attendance button */}
            {onOpenAttendance && (
              <button
                onClick={onOpenAttendance}
                className="px-3 py-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 shadow-sm"
                title="Điểm danh nhanh đầu giờ (A)"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Điểm danh (A)</span>
              </button>
            )}

            {/* Random Groups generator quick button */}
            {onOpenGroups && (
              <button
                onClick={onOpenGroups}
                className="px-3 py-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 shadow-sm"
                title="Chia nhóm ngẫu nhiên (G)"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Chia nhóm (G)</span>
              </button>
            )}

            {/* Timer quick button */}
            <button
              onClick={onOpenTimer}
              className="px-3 py-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 shadow-sm"
              title="Mở đồng hồ bấm giờ (T)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Đồng hồ (T)</span>
            </button>

            {/* Questions Bank quick button */}
            <button
              onClick={onOpenQuestions}
              className="px-3 py-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 shadow-sm"
              title="Mở ngân hàng câu hỏi (Q)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Câu hỏi (Q)</span>
            </button>

            {/* Algorithm Mode Tag */}
            <div className="flex items-center gap-1.5">
              {selectionMode === 'FAIR' ? (
                <button
                  onClick={onToggleSelectionMode}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/70 hover:bg-emerald-900/80 px-2.5 py-1.5 rounded-xl border border-emerald-500/40 transition-colors"
                  title="Nhấn để đổi sang chế độ ngẫu nhiên hoàn toàn"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ⚖️ RANDOM CÔNG BẰNG
                </button>
              ) : (
                <button
                  onClick={onToggleSelectionMode}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/70 hover:bg-amber-900/80 px-2.5 py-1.5 rounded-xl border border-amber-500/40 transition-colors"
                  title="Nhấn để đổi sang chế độ công bằng"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  🎲 RANDOM HOÀN TOÀN
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fair Pool Status Information bar & Attendance Alert */}
        <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 flex-wrap">
            {selectionMode === 'FAIR' && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                ⭐ Nhóm ưu tiên: {minCall} lần ({minCandidates.length} bạn)
              </span>
            )}
            <span>
              Có mặt: <strong className="text-emerald-400">{eligibleStudents.length}</strong> / {students.length} học sinh
            </span>
            {absentStudents.length > 0 && (
              <button
                onClick={onOpenAttendance}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold border border-rose-500/30 flex items-center gap-1 transition-colors"
                title="Nhấn để xem hoặc cập nhật điểm danh"
              >
                🔴 {absentStudents.length} bạn vắng
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-400 italic">
            *Tự động bỏ qua học sinh vắng mặt và luân phiên đều
          </div>
        </div>
      </div>

      {/* Active Question Banner (if teacher picked a question) */}
      {activeQuestion && (
        <div className="bg-gradient-to-r from-sky-950/90 via-indigo-950/90 to-slate-900 border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 shadow-lg flex flex-col sm:flex-row items-start justify-between gap-3 animate-fade-in">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-xs border border-sky-500/40 flex items-center gap-1">
                <span>📐 CÂU HỎI KIỂM TRA ({activeQuestion.subject || activeClass.subject || 'Toán học'})</span>
              </span>
              {activeQuestion.level && (
                <span className="text-[10px] text-slate-300 font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  Độ khó: {activeQuestion.level === 'Dễ' ? '🟢 Dễ' : activeQuestion.level === 'Trung bình' ? '🟡 Trung bình' : '🔴 Khó'}
                </span>
              )}
            </div>
            <div className="text-sm sm:text-base font-bold text-white leading-snug">
              <MathRenderer text={activeQuestion.content} />
            </div>
            {activeQuestion.imageUrl && (
              <div className="mt-2 max-h-32 max-w-xs overflow-hidden rounded-lg border border-slate-700">
                <img src={activeQuestion.imageUrl} alt="Hình vẽ đề bài" className="w-full h-auto object-contain" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
            {onOpenQuestionSpotlight && (
              <button
                onClick={() => onOpenQuestionSpotlight(activeQuestion)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 border border-indigo-400/40 shadow-sm transition-all"
                title="Phóng to toàn màn hình máy chiếu"
              >
                <span>🔍 Phóng To</span>
              </button>
            )}
            {onClearActiveQuestion && (
              <button
                onClick={onClearActiveQuestion}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Đóng câu hỏi này"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Visual Spin Styles Tab Selector & Multi-Pick Controls */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-2">
          {/* Visual Styles */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-slate-400 px-1 hidden sm:inline">Kiểu quay:</span>
            {VISUAL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setVisualType(mode.id);
                  soundEngine.playTick(1.2);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  visualType === mode.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80'
                }`}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Multi-Pick Count (Số lượng học sinh) */}
          <div className="flex items-center gap-2 px-2 text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gọi:</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700">
              {[1, 2, 3, 4, 5].map((countNum) => (
                <button
                  key={countNum}
                  onClick={() => {
                    setPickCount(countNum);
                    soundEngine.playTick(1.3);
                  }}
                  disabled={isSpinning}
                  className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                    pickCount === countNum
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title={`Gọi ${countNum} học sinh`}
                >
                  {countNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Toolbar: Wheel Size, Name Display Style & Target Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-3 py-2 text-xs">
          {/* Wheel Size Selector (Only visible for Wheel visual) */}
          {visualType === 'WHEEL' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Cỡ vòng:</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/70">
                {(['STANDARD', 'LARGE', 'XLARGE'] as WheelSizeOption[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setWheelSizeOption(sz);
                      soundEngine.playTick(1.2);
                    }}
                    disabled={isSpinning}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      wheelSizeOption === sz
                        ? 'bg-sky-500 text-slate-950 shadow-sm font-extrabold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                    }`}
                    title={WHEEL_SIZES[sz].tip}
                  >
                    {WHEEL_SIZES[sz].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name Display Style Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Hiển thị:</span>
            <select
              value={nameStyle}
              onChange={(e) => {
                setNameStyle(e.target.value as NameDisplayStyle);
                soundEngine.playTick(1.1);
              }}
              disabled={isSpinning}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              title="Chọn cách hiển thị tên/STT khi quay và gọi tên"
            >
              <option value="FULL_NAME">Họ và tên đầy đủ</option>
              <option value="STT_NAME">Số thứ tự + Tên (STT 01 - ...)</option>
              <option value="ONLY_STT">Chỉ hiện STT (Bí mật tên)</option>
              <option value="FIRST_NAME_ONLY">Tên gọi (Gọn gàng)</option>
              <option value="CODE_NAME">Tên + Mã học sinh</option>
            </select>
          </div>

          {/* Call Target Filter - quick chips for classroom use */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Đối tượng:</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/70 flex-wrap">
              {[
                { id: 'ALL' as CallTargetFilter, label: `Tất cả (${eligibleStudents.length})` },
                { id: 'MALE_ONLY' as CallTargetFilter, label: `👦 Nam (${maleStudents.length})` },
                { id: 'FEMALE_ONLY' as CallTargetFilter, label: `👧 Nữ (${femaleStudents.length})` },
                { id: 'NO_SCORE_TX1' as CallTargetFilter, label: `📝 Chưa TX1 (${studentsWithoutTx1.length})` },
                { id: 'STT_RANGE' as CallTargetFilter, label: '🔢 Theo STT' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTargetFilter(item.id);
                    soundEngine.playTick(1.1);
                  }}
                  disabled={isSpinning}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                    targetFilter === item.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
                  } disabled:opacity-50 disabled:pointer-events-none`}
                  title={
                    item.id === 'MALE_ONLY'
                      ? 'Chỉ quay trong nhóm học sinh Nam đã có thông tin giới tính'
                      : item.id === 'FEMALE_ONLY'
                      ? 'Chỉ quay trong nhóm học sinh Nữ đã có thông tin giới tính'
                      : item.id === 'STT_RANGE'
                      ? 'Chọn học sinh theo khoảng số thứ tự'
                      : 'Lọc nhóm học sinh ưu tiên kiểm tra'
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STT Range Sub-Bar (Appears when STT_RANGE filter is selected) */}
        {targetFilter === 'STT_RANGE' && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 border border-amber-500/40 rounded-2xl px-3 py-2 text-xs shadow-md animate-fade-in">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-amber-300 font-extrabold flex items-center gap-1.5 text-xs">
                <span>🔢 Khoảng STT</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Từ</span>
                <input
                  type="number"
                  min={1}
                  max={students.length || 1}
                  value={sttFrom}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    const clamped = isNaN(val) ? 1 : Math.max(1, Math.min(val, students.length || 1));
                    setSttFrom(clamped);
                    if (clamped > sttTo) {
                      setSttTo(clamped);
                    }
                  }}
                  disabled={isSpinning}
                  className="w-14 bg-slate-950 border border-amber-500/60 rounded-xl px-2 py-1 text-center font-mono font-black text-amber-200 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none shadow-inner"
                />
                <span className="text-slate-500 font-black">→</span>
                <input
                  type="number"
                  min={sttFrom}
                  max={students.length || 1}
                  value={sttTo}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    const clamped = isNaN(val) ? (students.length || 1) : Math.max(1, Math.min(val, students.length || 1));
                    setSttTo(clamped);
                    if (clamped < sttFrom) {
                      setSttFrom(clamped);
                    }
                  }}
                  disabled={isSpinning}
                  className="w-14 bg-slate-950 border border-amber-500/60 rounded-xl px-2 py-1 text-center font-mono font-black text-amber-200 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none shadow-inner"
                />
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 font-mono text-[11px]">
                  {targetCandidates.length} bạn đủ điều kiện
                </span>
              </div>
            </div>

            {/* Quick Presets for Teams / Groups in Vietnam (Tổ 1, Tổ 2, Tổ 3, Tổ 4) */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium mr-0.5 hidden sm:inline">Chọn nhanh:</span>
              {[
                { label: 'Tổ 1 (1-10)', from: 1, to: 10 },
                { label: 'Tổ 2 (11-20)', from: 11, to: 20 },
                { label: 'Tổ 3 (21-30)', from: 21, to: 30 },
                { label: 'Tổ 4 (31+)', from: 31, to: Math.max(31, students.length) },
              ].map((preset) => {
                const isSelected = sttFrom === preset.from && sttTo === Math.min(preset.to, students.length || preset.to);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSttFrom(preset.from);
                      setSttTo(Math.min(preset.to, students.length || preset.to));
                      soundEngine.playTick(1.2);
                    }}
                    disabled={isSpinning || students.length < preset.from}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                    } disabled:opacity-30 disabled:pointer-events-none`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Spinning Arena */}
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-2 border-indigo-500/30 rounded-3xl p-4 sm:p-8 shadow-2xl overflow-hidden min-h-[400px] sm:min-h-[460px] flex flex-col items-center justify-center text-center">
        {/* Glow ambient background lights */}
        <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
            isSpinning
              ? 'bg-indigo-500/25 opacity-100'
              : hasCompleted
              ? 'bg-emerald-500/20 opacity-100'
              : 'bg-slate-700/15 opacity-50'
          }`}
        />

        {/* Spinning Status Tag */}
        <div className="mb-2">
          {isSpinning ? (
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs sm:text-sm font-bold animate-pulse">
              <Sparkle className="w-4 h-4 text-indigo-400 animate-spin" />
              Đang quay chọn {pickCount > 1 ? `${pickCount} bạn` : 'học sinh'}...
            </span>
          ) : hasCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Đã chọn xong học sinh lên bảng!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Sẵn sàng kiểm tra bài cũ ({pickCount > 1 ? `Gọi ${pickCount} bạn` : 'Gọi 1 bạn'})
            </span>
          )}
        </div>

        {/* Active Visual Component */}
        <div className="w-full flex items-center justify-center my-2">
          {visualType === 'WHEEL' && (
            <div className="flex flex-col items-center">
              <WheelVisual
                students={targetCandidates.length > 0 ? targetCandidates : eligibleStudents}
                isSpinning={isSpinning}
                hasCompleted={hasCompleted}
                winner={resolvedWinner}
                currentAngle={wheelAngle}
                size={WHEEL_SIZES[wheelSizeOption].size}
                nameStyle={nameStyle}
                allClassStudents={students}
              />
              {/* Winner Display below wheel */}
              {hasCompleted && resolvedSelectedStudents.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 animate-scale-in">
                  {resolvedSelectedStudents.map((winner, idx) => {
                    const stt = getStudentSTT(winner, students);
                    const displayWinnerName = formatStudentDisplayName(winner, students, nameStyle, false);
                    return (
                      <div
                        key={winner.id}
                        className="py-2.5 px-5 sm:px-6 rounded-2xl bg-slate-900/95 border-2 border-amber-400 text-amber-300 font-black text-xl sm:text-2xl md:text-3xl shadow-xl flex items-center gap-2.5 flex-wrap justify-center"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedProfileStudent(winner)}
                          className="hover:underline underline-offset-4 hover:text-white transition-colors cursor-pointer text-left"
                          title="Bấm vào tên để xem Thẻ học sinh"
                        >
                          🎉 {displayWinnerName}
                        </button>
                        {nameStyle === 'ONLY_STT' && (
                          <button
                            type="button"
                            onClick={() => setSelectedProfileStudent(winner)}
                            className="text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-700 transition-colors"
                            title="Bấm vào tên để xem Thẻ học sinh"
                          >
                            ({winner.name})
                          </button>
                        )}
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40 font-mono">
                          STT {stt}
                        </span>
                        {resolvedSelectedStudents.length > 1 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 font-mono">
                            #{idx + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {visualType === 'SLOT' && (
            <div className="flex flex-col items-center">
              <SlotVisual
                displayName={displayName}
                isSpinning={isSpinning}
                hasCompleted={hasCompleted}
                winner={resolvedWinner}
                reelNames={(targetCandidates.length > 0 ? targetCandidates : eligibleStudents).map((s) =>
                  formatStudentDisplayName(s, students, nameStyle, false)
                )}
              />
              {hasCompleted && resolvedSelectedStudents.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 animate-scale-in">
                  {resolvedSelectedStudents.map((winner, idx) => (
                    <button
                      key={winner.id}
                      type="button"
                      onClick={() => setSelectedProfileStudent(winner)}
                      className="py-1.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-amber-400 text-amber-300 hover:text-white font-bold text-sm sm:text-base shadow-md flex items-center gap-2 transition-all hover:scale-105"
                      title="Bấm vào tên để xem Thẻ học sinh"
                    >
                      <span className="hover:underline underline-offset-2">#{idx + 1} {formatStudentDisplayName(winner, students, nameStyle, false)}</span>
                      <span className="text-xs font-mono text-amber-400/80 bg-amber-950/50 px-1.5 py-0.5 rounded">
                        STT {getStudentSTT(winner, students)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {visualType === 'CARDS' && (
            <CardsVisual
              students={targetCandidates.length > 0 ? targetCandidates : eligibleStudents}
              displayName={displayName}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={resolvedWinner}
              onSelectStudentProfile={setSelectedProfileStudent}
            />
          )}

          {visualType === 'CHEST' && (
            <ChestVisual
              displayName={displayName}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={resolvedWinner}
              onSelectStudentProfile={setSelectedProfileStudent}
            />
          )}
          {visualType === 'BALLOON' && (
            <BalloonVisual
              students={targetFilter === 'ALL' ? eligibleStudents : targetCandidates}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={resolvedWinner}
              selectedStudents={resolvedVisualSelectedStudents}
              duration={settings.spinDuration || 3800}
              allClassStudents={students}
              onSelectStudentProfile={setSelectedProfileStudent}
            />
          )}
          {visualType === 'HORSE_RACE' && (
            <HorseRaceVisual
              students={targetFilter === 'ALL' ? eligibleStudents : targetCandidates}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={resolvedWinner}
              selectedStudents={resolvedVisualSelectedStudents}
              duration={settings.spinDuration || 3800}
              allClassStudents={students}
              onSelectStudentProfile={setSelectedProfileStudent}
            />
          )}
          {(visualType === 'BOAT_RACE' || (visualType as string) === 'DUCK_RACE') && (
            <BoatRaceVisual
              students={targetFilter === 'ALL' ? eligibleStudents : targetCandidates}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={resolvedWinner}
              selectedStudents={resolvedVisualSelectedStudents}
              duration={settings.spinDuration || 3800}
              allClassStudents={students}
              onSelectStudentProfile={setSelectedProfileStudent}
            />
          )}
          {visualType === 'ROCKET' && (
            <RocketVisual
              students={targetFilter === 'ALL' ? eligibleStudents : targetCandidates}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={resolvedWinner}
              selectedStudents={resolvedVisualSelectedStudents}
              duration={settings.spinDuration || 3800}
              allClassStudents={students}
              onSelectStudentProfile={setSelectedProfileStudent}
            />
          )}
          {visualType === 'MAGIC_CARD' && (
            <MagicCardVisual
              students={targetFilter === 'ALL' ? eligibleStudents : targetCandidates}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={resolvedWinner}
              selectedStudents={resolvedVisualSelectedStudents}
              duration={settings.spinDuration || 3800}
              allClassStudents={students}
              onSelectStudentProfile={setSelectedProfileStudent}
            />
          )}
          {visualType === 'PYRAMID' && (
            <PyramidVisual
              students={targetFilter === 'ALL' ? eligibleStudents : targetCandidates}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={resolvedWinner}
              selectedStudents={resolvedVisualSelectedStudents}
              duration={settings.spinDuration || 3800}
              allClassStudents={students}
              onSelectStudentProfile={setSelectedProfileStudent}
            />
          )}
        </div>

        {/* Replay Voice Speaker Button & Live Speaking Indicator if completed */}
        {hasCompleted && selectedResult && settings.ttsEnabled && (
          <div className="mt-2 mb-2 flex flex-wrap items-center justify-center gap-2 animate-fade-in">
            {speechState === 'speaking' ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-lg animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span>Đang đọc: {speakingText ? `"${speakingText}"` : 'Tên học sinh...'}</span>
              </div>
            ) : (
              <button
                onClick={handleReplayVoice}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/40 hover:bg-indigo-600 border border-indigo-400/50 text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:scale-105 active:scale-95"
                title="Bấm hoặc nhấn phím V để đọc lại"
              >
                <Volume2 className="w-4 h-4 text-indigo-300" />
                <span>🔊 Đọc Lại Tên Học Sinh (Phím V)</span>
              </button>
            )}
          </div>
        )}

        {/* Primary Action Button: 🎲 QUAY TÊN */}
        <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            id="spin-trigger-btn"
            disabled={isSpinning || eligibleStudents.length === 0}
            onClick={handleStartSpin}
            className={`group relative px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl text-lg sm:text-xl font-black tracking-wide shadow-xl transition-all duration-200 flex items-center gap-3 select-none ${
              isSpinning
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : eligibleStudents.length === 0
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600 hover:from-indigo-600 hover:to-sky-600 text-white shadow-indigo-500/30 hover:scale-105 active:scale-98'
            }`}
          >
            <span className="text-2xl group-hover:rotate-45 transition-transform duration-300">🎲</span>
            <span>
              {isSpinning
                ? 'ĐANG QUAY...'
                : hasCompleted
                ? 'QUAY LƯỢT TIẾP THEO'
                : pickCount > 1
                ? `QUAY ${pickCount} BẠN (SPACE)`
                : 'QUAY TÊN (SPACE)'}
            </span>
          </button>
        </div>

        {/* Empty student warning if class has 0 eligible students */}
        {eligibleStudents.length === 0 && (
          <div className="mt-4 p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {students.length === 0
                ? 'Lớp này chưa có học sinh nào. Vui lòng thêm học sinh hoặc nhập danh sách Excel.'
                : 'Tất cả học sinh trong lớp hiện đang được đánh dấu vắng mặt!'}
            </span>
          </div>
        )}
      </div>

      {/* Post-Spin Evaluation & Quick Actions Box */}
      {hasCompleted && selectedResult && (
        <div className="bg-slate-800/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-emerald-400 font-bold text-sm">📝 Đánh giá nhanh kết quả:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(resolvedSelectedStudents.length > 0 ? resolvedSelectedStudents : selectedResult.selectedStudents).map((s, idx, arr) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedProfileStudent(s)}
                    className="text-xs text-sky-300 hover:text-white font-bold bg-slate-900/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-sky-400/50 transition-all flex items-center gap-1 group/btn shadow-sm"
                    title="Bấm để xem Thẻ học sinh (Hồ sơ, điểm số, nề nếp)"
                  >
                    <span className="group-hover/btn:underline underline-offset-2">{s.name}</span>
                    {idx < arr.length - 1 && (
                      <span className="text-slate-600 font-normal">,</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* Absent / Cancel roll button */}
            <button
              onClick={handleUndo}
              className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 px-3 py-1.5 rounded-lg transition-colors font-medium self-start sm:self-auto"
              title="Nhấn nếu học sinh vắng mặt để không tính lượt này"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Học sinh vắng mặt (Hủy lượt này)</span>
            </button>
          </div>

          {/* Quick Score Buttons & Star Rewards */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/50">
            {/* Score presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1">Chấm điểm:</span>
              {['10', '9', '8', '7', '6', '5', 'Đạt', 'Chưa đạt'].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setQuickScore(val);
                    handleSaveScoreAndNote(val, quickNote);
                    soundEngine.playTick(1.4);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    quickScore === val
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                  }`}
                >
                  {val}
                </button>
              ))}

              {/* Custom score input */}
              <input
                type="text"
                placeholder="Khác..."
                value={!['10', '9', '8', '7', '6', '5', 'Đạt', 'Chưa đạt'].includes(quickScore) ? quickScore : ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4);
                  setQuickScore(val);
                }}
                onBlur={() => {
                  if (quickScore && !['10', '9', '8', '7', '6', '5', 'Đạt', 'Chưa đạt'].includes(quickScore)) {
                    handleSaveScoreAndNote(quickScore, quickNote);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickScore) {
                    handleSaveScoreAndNote(quickScore, quickNote);
                  }
                }}
                className="w-16 bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1 text-xs text-amber-200 placeholder-slate-500 text-center font-bold outline-none"
                title="Nhập điểm số tùy chọn (vd: 8.5)"
              />
            </div>

            {/* Gamification: Bonus Stars / Badges */}
            {onAwardStars && (
              <div className="flex items-center gap-1.5 bg-amber-950/40 p-1 rounded-xl border border-amber-500/30">
                <span className="text-xs text-amber-300 font-bold px-1.5 flex items-center gap-1">
                  <span>⭐ Khen thưởng:</span>
                </span>
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    onClick={() => handleAwardStarBonus(count)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-black text-xs border border-amber-500/40 transition-all hover:scale-105 active:scale-95 shadow-sm"
                    title={`Tặng +${count} sao khen thưởng`}
                  >
                    +{count} ⭐
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Discipline Tracking: Quick Evaluation */}
          <div className="pt-2 border-t border-slate-700/50 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-amber-300 font-bold mr-1 flex items-center gap-1">
                  <span>📋 Nề nếp / Đánh giá:</span>
                </span>

                {/* Trả lời đúng (Không ghi lỗi) */}
                <button
                  onClick={() => handleDisciplineChoice('tra_loi_dung')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    selectedDisciplineChoice === 'tra_loi_dung'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm ring-2 ring-emerald-400/40'
                      : 'bg-slate-700/90 hover:bg-slate-700 text-emerald-300 border-slate-600'
                  }`}
                  title="Học sinh trả lời tốt - Không ghi lỗi nề nếp"
                >
                  ✅ Trả lời đúng
                </button>

                {/* 4 Default Violation Types */}
                <button
                  onClick={() => handleDisciplineChoice('tra_loi_sai')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    selectedDisciplineChoice === 'tra_loi_sai'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-sm ring-2 ring-rose-400/40'
                      : 'bg-slate-700/90 hover:bg-slate-700 text-rose-300 border-slate-600'
                  }`}
                  title="Ghi nhận vào nề nếp: +1 Trả lời sai"
                >
                  ❌ Trả lời sai
                </button>

                <button
                  onClick={() => handleDisciplineChoice('khong_thuoc_bai')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    selectedDisciplineChoice === 'khong_thuoc_bai'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-sm ring-2 ring-amber-400/40'
                      : 'bg-slate-700/90 hover:bg-slate-700 text-amber-300 border-slate-600'
                  }`}
                  title="Ghi nhận vào nề nếp: +1 Không thuộc bài"
                >
                  📖 Không thuộc bài
                </button>

                <button
                  onClick={() => handleDisciplineChoice('khong_lam_bai_tap')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    selectedDisciplineChoice === 'khong_lam_bai_tap'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-sm ring-2 ring-purple-400/40'
                      : 'bg-slate-700/90 hover:bg-slate-700 text-purple-300 border-slate-600'
                  }`}
                  title="Ghi nhận vào nề nếp: +1 Không làm bài tập"
                >
                  📚 Không làm bài tập
                </button>

                <button
                  onClick={() => handleDisciplineChoice('noi_chuyen')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    selectedDisciplineChoice === 'noi_chuyen'
                      ? 'bg-sky-600 text-white border-sky-400 shadow-sm ring-2 ring-sky-400/40'
                      : 'bg-slate-700/90 hover:bg-slate-700 text-sky-300 border-slate-600'
                  }`}
                  title="Ghi nhận vào nề nếp: +1 Nói chuyện"
                >
                  🗣️ Nói chuyện
                </button>
              </div>

              {/* Undo discipline button */}
              {lastDisciplineRecordId && (
                <button
                  onClick={handleUndoDisciplineFromSpin}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-sm"
                  title="Hoàn tác lần ghi nhận nề nếp vừa chọn"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Hoàn tác nề nếp</span>
                </button>
              )}
            </div>

            {/* Discipline Feedback text message */}
            {disciplineFeedback && (
              <div className="text-xs text-amber-200 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-amber-500/20 flex items-center justify-between">
                <span>{disciplineFeedback}</span>
              </div>
            )}
          </div>

          {/* Quick Note input */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Ghi chú thêm (vd: Thuộc bài tốt, trả lời lưu loát...)"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              onBlur={() => handleSaveScoreAndNote(quickScore, quickNote)}
              className="w-full sm:flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleSaveScoreAndNote(quickScore, quickNote)}
              className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{feedbackSaved ? 'Đã lưu' : 'Lưu ghi chú'}</span>
            </button>
          </div>

          {/* Status feedback message when score or note is saved */}
          {scoreFeedbackMessage && (
            <div className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-1.5 ${
              scoreFeedbackMessage.includes('⚠️')
                ? 'bg-amber-950/70 text-amber-200 border-amber-500/40'
                : 'bg-emerald-950/70 text-emerald-200 border-emerald-500/40'
            }`}>
              <span>{scoreFeedbackMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Guide Footer */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-300">⌨️ Phím tắt:</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-[11px]">
              Space
            </kbd>
            <span>: Quay tên</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-mono text-[11px]">
              A
            </kbd>
            <span>: Điểm danh</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-purple-300 font-mono text-[11px]">
              G
            </kbd>
            <span>: Chia nhóm</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[11px]">
              T
            </kbd>
            <span>: Bấm giờ</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-mono text-[11px]">
              Q
            </kbd>
            <span>: Câu hỏi</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-rose-300 font-mono text-[11px]">
              F
            </kbd>
            <span>: Máy chiếu</span>
          </span>
        </div>

        <button
          onClick={onOpenPresentation}
          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
        >
          <span>Mở chế độ máy chiếu</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Student Profile Card Modal */}
      {selectedProfileStudent && (
        <StudentProfileCard
          student={selectedProfileStudent}
          className={activeClass?.name}
          disciplineRecords={disciplineRecords}
          disciplineViolationTypes={disciplineViolationTypes}
          onClose={() => setSelectedProfileStudent(null)}
        />
      )}
    </div>
  );
};
