import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Award,
  Sparkles,
  Scale,
  Dices,
  Disc,
  Layers,
  LayoutGrid,
  Gift,
  Mic,
  MicOff,
  Users,
  Clock,
  BookOpen,
  Sun,
  Moon,
  Tv,
  Star,
} from 'lucide-react';
import { ClassRoom, SelectionMode, SpinSettings, SpinVisualType, Student, QuestionItem, ThemeMode, UserSubscription } from '../types';
import { chooseMultipleStudents, getEligibleStudents, MultiSelectionResult } from '../utils/fairAlgorithm';
import {
  formatStudentDisplayName,
  getStudentSTT,
  getSpeechAnnouncementText,
} from '../utils/studentDisplay';
import { soundEngine } from '../utils/audio';
import { speechEngine } from '../utils/speech';
import { ENABLE_TRIAL_LIMIT } from '../config/subscriptionConfig';
import { MathRenderer } from './MathRenderer';
import { ClassGoLogo } from './ClassGoLogo';

import { WheelVisual } from './visuals/WheelVisual';
import { SlotVisual } from './visuals/SlotVisual';
import { CardsVisual } from './visuals/CardsVisual';
import { ChestVisual } from './visuals/ChestVisual';

interface PresentationOverlayProps {
  activeClass: ClassRoom;
  selectionMode: SelectionMode;
  onToggleSelectionMode: () => void;
  settings: SpinSettings;
  onStudentSelected: (student: Student, mode: SelectionMode) => void;
  onBatchStudentsSelected?: (students: Student[], mode: SelectionMode) => void;
  onClose: () => void;
  onOpenTimer?: () => void;
  onOpenQuestions?: () => void;
  onAwardStars?: (studentId: string, count: number) => void;
  activeQuestion?: QuestionItem | null;
  subscription?: UserSubscription | null;
  onOpenUpgradeModal?: () => void;
}

export const PresentationOverlay: React.FC<PresentationOverlayProps> = ({
  activeClass,
  selectionMode,
  onToggleSelectionMode,
  settings,
  onStudentSelected,
  onBatchStudentsSelected,
  onClose,
  onOpenTimer,
  onOpenQuestions,
  onAwardStars,
  activeQuestion,
  subscription,
  onOpenUpgradeModal,
}) => {
  const [visualType, setVisualType] = useState<SpinVisualType>(
    settings.defaultVisualType || 'WHEEL'
  );
  const [pickCount, setPickCount] = useState<number>(settings.defaultPickCount || 1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayName, setDisplayName] = useState<string>('???');
  const [selectedResult, setSelectedResult] = useState<MultiSelectionResult | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [soundMuted, setSoundMuted] = useState(!settings.soundEnabled);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(settings.themeMode || 'dark');
  const [awardedStars, setAwardedStars] = useState<{ [id: string]: number }>({});

  const animationFrameRef = useRef<number | null>(null);
  const students = activeClass?.students || [];
  const eligibleStudents = getEligibleStudents(students);

  // Toggle browser native fullscreen
  const toggleNativeFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsNativeFullscreen(true);
        }).catch(() => {});
      } else {
        document.exitFullscreen().then(() => {
          setIsNativeFullscreen(false);
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Sync speech engine config
  useEffect(() => {
    speechEngine.updateConfig({
      enabled: settings.ttsEnabled,
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
      volume: settings.volume,
      template: settings.ttsTemplate,
      voiceUri: settings.ttsVoiceUri,
      announceCount: settings.ttsAnnounceCount,
    });
  }, [settings]);

  const triggerConfetti = useCallback(() => {
    if (!settings.confettiEnabled) return;
    try {
      confetti({
        particleCount: 140,
        spread: 95,
        origin: { y: 0.55 },
        colors: ['#6366f1', '#38bdf8', '#fbbf24', '#34d399', '#f43f5e'],
      });
    } catch {
      // ignore
    }
  }, [settings.confettiEnabled]);

  const handleStarBonus = (studentId: string, count: number = 1) => {
    if (onAwardStars) {
      onAwardStars(studentId, count);
      setAwardedStars((prev) => ({
        ...prev,
        [studentId]: (prev[studentId] || 0) + count,
      }));
      soundEngine.playStarSound();
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#fde047'],
        });
      } catch {
        // ignore
      }
    }
  };

  const handleReplayVoice = () => {
    speechEngine.unlock();
    if (selectedResult && selectedResult.selectedStudents.length > 0) {
      if (selectedResult.selectedStudents.length === 1) {
        speechEngine.speakStudent(
          selectedResult.selectedStudents[0].name,
          selectedResult.selectedStudents[0].callCount
        );
      } else {
        speechEngine.speakMultipleStudents(
          selectedResult.selectedStudents.map((s) => s.name)
        );
      }
    }
  };

  const handleStartSpin = useCallback(() => {
    if (ENABLE_TRIAL_LIMIT && subscription?.status === 'EXPIRED') {
      soundEngine.playTick(0.6);
      if (onOpenUpgradeModal) onOpenUpgradeModal();
      return;
    }

    if (isSpinning || eligibleStudents.length === 0) return;

    const effectiveCount = Math.min(pickCount, eligibleStudents.length);
    const result = chooseMultipleStudents(eligibleStudents, effectiveCount, selectionMode);
    if (!result || result.selectedStudents.length === 0) return;

    setIsSpinning(true);
    setHasCompleted(false);
    setSelectedResult(null);

    soundEngine.playWhoosh();
    speechEngine.unlock();
    speechEngine.stop();
    if (!soundMuted && settings.bgmStyle && settings.bgmStyle !== 'OFF') {
      soundEngine.startBGM(settings.bgmStyle, settings.bgmVolume ?? 0.4);
    }

    const duration = settings.spinDuration || 3800;
    const startTime = performance.now();

    const nameStyle = settings.nameDisplayStyle || 'FULL_NAME';
    const namesList = eligibleStudents.map((s) =>
      formatStudentDisplayName(s, students, nameStyle, false)
    );
    const reelPool = [...namesList];
    for (let i = reelPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reelPool[i], reelPool[j]] = [reelPool[j], reelPool[i]];
    }

    // Wheel angle calculations
    const primaryWinner = result.selectedStudents[0];
    const totalVisualStudents = eligibleStudents.length;
    const maxVisualSlices = Math.min(totalVisualStudents, 36);
    const winnerIdx = eligibleStudents.findIndex((s) => s.id === primaryWinner.id);
    const sliceAngleDeg = 360 / maxVisualSlices;
    const targetSliceCenterDeg = (winnerIdx % maxVisualSlices) * sliceAngleDeg + sliceAngleDeg / 2;
    const targetAngle = 360 - targetSliceCenterDeg;
    const initialAngle = wheelAngle % 360;
    const totalRotationDegrees = 360 * 6 + targetAngle - initialAngle;

    let lastTickTime = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentWheelRotation = initialAngle + totalRotationDegrees * easeOut;
      setWheelAngle(currentWheelRotation);

      const switchInterval = 40 + easeOut * 280;

      if (now - lastTickTime > switchInterval) {
        lastTickTime = now;
        if (progress < 0.92) {
          const randomIdx = Math.floor(Math.random() * reelPool.length);
          setDisplayName(reelPool[randomIdx]);
          if (!soundMuted) soundEngine.playTick(1.0 + (1 - progress) * 0.5);
        } else {
          setDisplayName(
            result.selectedStudents.length === 1
              ? formatStudentDisplayName(result.selectedStudents[0], students, nameStyle, false)
              : result.selectedStudents
                  .map((s) => formatStudentDisplayName(s, students, nameStyle, false))
                  .join(' & ')
          );
          if (!soundMuted) soundEngine.playTick(0.85);
        }
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
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

        soundEngine.stopBGM();
        if (!soundMuted) soundEngine.playVictoryFanfare();
        triggerConfetti();

        if (settings.ttsEnabled && !soundMuted) {
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
    pickCount,
    selectionMode,
    settings.spinDuration,
    settings.bgmStyle,
    settings.bgmVolume,
    settings.ttsEnabled,
    soundMuted,
    wheelAngle,
    triggerConfetti,
    onStudentSelected,
    onBatchStudentsSelected,
    subscription,
    onOpenUpgradeModal,
  ]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      soundEngine.stopBGM();
      speechEngine.stop();
    };
  }, []);

  // Keyboard shortcuts in presentation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStartSpin();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setSoundMuted((prev) => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handleReplayVoice();
      } else if (e.key === 't' || e.key === 'T') {
        if (onOpenTimer) {
          e.preventDefault();
          onOpenTimer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartSpin, onClose, onOpenTimer, handleReplayVoice]);

  const VISUAL_MODES: { id: SpinVisualType; label: string; icon: React.ReactNode }[] = [
    { id: 'WHEEL', label: 'Vòng Quay', icon: <Disc className="w-4 h-4" /> },
    { id: 'SLOT', label: 'Dải Cuộn', icon: <Layers className="w-4 h-4" /> },
    { id: 'CARDS', label: 'Thẻ Bài', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'CHEST', label: 'Hộp Quà', icon: <Gift className="w-4 h-4" /> },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-fade-in select-none transition-colors duration-300 ${
        themeMode === 'light'
          ? 'bg-slate-100 text-slate-900'
          : themeMode === 'projector'
          ? 'bg-white text-black font-semibold'
          : 'bg-slate-950/95 text-slate-100'
      }`}
    >
      {/* Top Presentation Bar */}
      <div className="flex items-center justify-between gap-4">
        {/* Class Name & Mode Tag */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ClassGoLogo size="sm" showTagline={false} />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                themeMode === 'projector' ? 'text-slate-950' : themeMode === 'light' ? 'text-indigo-900' : 'text-white'
              }`}
            >
              📚 Lớp {activeClass.name}
            </span>
          </div>

          <button
            onClick={onToggleSelectionMode}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              selectionMode === 'FAIR'
                ? themeMode === 'projector'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : themeMode === 'projector'
                ? 'bg-amber-100 text-amber-900 border-amber-500'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
            }`}
          >
            {selectionMode === 'FAIR' ? <Scale className="w-3.5 h-3.5" /> : <Dices className="w-3.5 h-3.5" />}
            <span>{selectionMode === 'FAIR' ? 'Công Bằng' : 'Ngẫu Nhiên'}</span>
          </button>
        </div>

        {/* Visual Switcher & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multi-Pick count in projector */}
          <div
            className={`flex items-center gap-1 rounded-xl p-1 border ${
              themeMode === 'projector' || themeMode === 'light'
                ? 'bg-slate-200 border-slate-300'
                : 'bg-slate-900/90 border-slate-700'
            }`}
          >
            {[1, 2, 3, 4, 5].map((cnt) => (
              <button
                key={cnt}
                onClick={() => setPickCount(cnt)}
                disabled={isSpinning}
                className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                  pickCount === cnt
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : themeMode === 'projector' || themeMode === 'light'
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Gọi ${cnt} học sinh`}
              >
                {cnt}
              </button>
            ))}
          </div>

          {/* Theme Selector Mode */}
          <div
            className={`flex items-center gap-1 rounded-xl p-1 border ${
              themeMode === 'projector' || themeMode === 'light'
                ? 'bg-slate-200 border-slate-300'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <button
              onClick={() => setThemeMode('dark')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                themeMode === 'dark' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Chế độ Tối"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setThemeMode('light')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                themeMode === 'light' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Chế độ Sáng"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setThemeMode('projector')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                themeMode === 'projector' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-amber-500'
              }`}
              title="Chế độ Máy Chiếu Tương Phản Cao"
            >
              <Tv className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Style pills */}
          <div
            className={`hidden md:flex items-center gap-1 rounded-xl p-1 border ${
              themeMode === 'projector' || themeMode === 'light'
                ? 'bg-slate-200 border-slate-300'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            {VISUAL_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setVisualType(mode.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  visualType === mode.id
                    ? 'bg-indigo-600 text-white'
                    : themeMode === 'projector' || themeMode === 'light'
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Timer button */}
          {onOpenTimer && (
            <button
              onClick={onOpenTimer}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-colors"
              title="Đồng hồ bấm giờ (T)"
            >
              <Clock className="w-5 h-5" />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Bật/Tắt âm thanh (M)"
          >
            {soundMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Fullscreen API Native Trigger */}
          <button
            onClick={toggleNativeFullscreen}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
            title={isNativeFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình duyệt (F11)'}
          >
            {isNativeFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Exit Presentation */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition-all"
            title="Thoát chế độ máy chiếu (ESC)"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Thoát (ESC)</span>
          </button>
        </div>
      </div>

      {/* Active Question Banner if available */}
      {activeQuestion && (
        <div
          className={`max-w-4xl mx-auto w-full rounded-2xl p-4 sm:p-5 shadow-xl text-center animate-fade-in border ${
            themeMode === 'projector'
              ? 'bg-slate-100 border-sky-600 text-slate-950'
              : themeMode === 'light'
              ? 'bg-white border-sky-400 text-slate-900'
              : 'bg-slate-900/90 border-sky-500/40 text-white'
          }`}
        >
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block mb-1">
            📐 CÂU HỎI KIỂM TRA BÀI CŨ
          </span>
          <div className="text-lg sm:text-2xl font-black">
            <MathRenderer text={activeQuestion.content} />
          </div>
          {activeQuestion.imageUrl && (
            <div className="mt-3 max-h-48 overflow-hidden rounded-xl border border-slate-700 mx-auto max-w-sm">
              <img
                src={activeQuestion.imageUrl}
                alt="Hình vẽ đề bài"
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* Center Arena */}
      <div className="flex-1 flex flex-col items-center justify-center py-4">
        {visualType === 'WHEEL' && (
          <div className="flex flex-col items-center">
            <WheelVisual
              students={eligibleStudents}
              isSpinning={isSpinning}
              hasCompleted={hasCompleted}
              winner={selectedResult ? selectedResult.selectedStudents[0] : null}
              currentAngle={wheelAngle}
              size={
                settings.wheelSizeOption === 'XLARGE'
                  ? Math.min(window.innerHeight * 0.65, 540)
                  : settings.wheelSizeOption === 'STANDARD'
                  ? Math.min(window.innerHeight * 0.44, 380)
                  : Math.min(window.innerHeight * 0.55, 460)
              }
              nameStyle={settings.nameDisplayStyle || 'FULL_NAME'}
              allClassStudents={students}
            />
            {hasCompleted && selectedResult && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 animate-scale-in">
                {selectedResult.selectedStudents.map((w) => {
                  const stt = getStudentSTT(w, students);
                  const formattedWinner = formatStudentDisplayName(
                    w,
                    students,
                    settings.nameDisplayStyle || 'FULL_NAME',
                    false
                  );
                  return (
                    <div
                      key={w.id}
                      className="flex items-center gap-3 py-3 px-8 rounded-3xl bg-slate-900/95 border-2 border-amber-400 text-amber-300 font-black text-2xl sm:text-5xl shadow-2xl animate-pulse flex-wrap justify-center"
                    >
                      <span>🎉 {formattedWinner}</span>
                      {settings.nameDisplayStyle === 'ONLY_STT' && (
                        <span className="text-xl sm:text-2xl font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                          ({w.name})
                        </span>
                      )}
                      <span className="text-sm sm:text-base font-mono px-3 py-1 rounded-full bg-amber-500/25 text-amber-200 border border-amber-500/50">
                        STT {stt}
                      </span>
                      {onAwardStars && (
                        <button
                          onClick={() => handleStarBonus(w.id, 1)}
                          className="ml-2 px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-base sm:text-xl font-bold shadow-lg transition-transform hover:scale-110 active:scale-95"
                          title="Tặng 1 sao khen thưởng"
                        >
                          ⭐ +1
                        </button>
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
              winner={selectedResult ? selectedResult.selectedStudents[0] : null}
              reelNames={eligibleStudents.map((s) =>
                formatStudentDisplayName(s, students, settings.nameDisplayStyle || 'FULL_NAME', false)
              )}
            />
            {hasCompleted && selectedResult && selectedResult.selectedStudents.length > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 animate-scale-in">
                {selectedResult.selectedStudents.map((w, idx) => (
                  <span
                    key={w.id}
                    className="py-2 px-5 rounded-2xl bg-slate-900/90 border border-amber-400 text-amber-300 font-black text-xl sm:text-3xl shadow-xl flex items-center gap-2"
                  >
                    <span>
                      #{idx + 1}{' '}
                      {formatStudentDisplayName(
                        w,
                        students,
                        settings.nameDisplayStyle || 'FULL_NAME',
                        false
                      )}
                    </span>
                    <span className="text-xs font-mono text-amber-300/80 bg-amber-950/60 px-2 py-0.5 rounded-full">
                      STT {getStudentSTT(w, students)}
                    </span>
                    {onAwardStars && (
                      <button
                        onClick={() => handleStarBonus(w.id, 1)}
                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition-transform hover:scale-105"
                      >
                        ⭐+1
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {visualType === 'CARDS' && (
          <CardsVisual
            students={eligibleStudents}
            displayName={displayName}
            isSpinning={isSpinning}
            hasCompleted={hasCompleted}
            winner={selectedResult ? selectedResult.selectedStudents[0] : null}
          />
        )}

        {visualType === 'CHEST' && (
          <ChestVisual
            displayName={displayName}
            isSpinning={isSpinning}
            hasCompleted={hasCompleted}
            winner={selectedResult ? selectedResult.selectedStudents[0] : null}
          />
        )}
      </div>

      {/* Bottom Center Big Button */}
      <div className="flex flex-col items-center gap-2">
        {hasCompleted && selectedResult && settings.ttsEnabled && (
          <button
            onClick={handleReplayVoice}
            className="mb-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-sm shadow-lg transition-transform hover:scale-105 active:scale-95"
            title="Bấm hoặc nhấn phím V để đọc lại tên"
          >
            <Volume2 className="w-4 h-4" />
            <span>🔊 Đọc Lại Tên (Phím V)</span>
          </button>
        )}

        <button
          disabled={isSpinning || eligibleStudents.length === 0}
          onClick={handleStartSpin}
          className={`px-12 sm:px-20 py-4 sm:py-5 rounded-3xl text-xl sm:text-3xl font-black shadow-2xl transition-all duration-200 transform ${
            isSpinning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 hover:scale-105 active:scale-95'
          }`}
        >
          {isSpinning
            ? 'ĐANG QUAY...'
            : hasCompleted
            ? 'QUAY TIẾP (SPACE)'
            : pickCount > 1
            ? `QUAY ${pickCount} BẠN (SPACE)`
            : 'QUAY TÊN (SPACE)'}
        </button>
        <span
          className={`text-xs ${
            themeMode === 'projector' || themeMode === 'light' ? 'text-slate-600' : 'text-slate-500'
          }`}
        >
          Nhấn phím [Space] để quay • [V] để đọc lại • [ESC] để đóng
        </span>
      </div>
    </div>
  );
};
