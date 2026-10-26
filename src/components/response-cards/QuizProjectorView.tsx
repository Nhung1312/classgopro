import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Users,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Lock,
  RotateCcw,
  QrCode,
  Smartphone,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizSession, StudentAnswerRecord } from '../../types/responseCardTypes';
import { ClassRoom } from '../../types';
import {
  RESPONSE_REMOTE_SYNC_NOTICE,
  saveActiveQuizSession,
  saveActiveQuizSessionLocally,
  updateSessionControlToCloud,
  subscribeToSessionSync,
} from '../../services/responseCardStorage';
import { soundEngine } from '../../utils/audio';
import QRCode from 'qrcode';

interface QuizProjectorViewProps {
  session: QuizSession;
  currentClass: ClassRoom;
  onClose: () => void;
  onUpdateSession: (updated: QuizSession, options?: { fromSync?: boolean }) => void;
}

export const QuizProjectorView: React.FC<QuizProjectorViewProps> = ({
  session,
  currentClass,
  onClose,
  onUpdateSession,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [activeSession, setActiveSession] = useState<QuizSession>(session);
  const [isCloudOnline, setIsCloudOnline] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Sync state with parent session
  useEffect(() => {
    setActiveSession(session);
  }, [session]);

  // Generate dynamic QR Code for phone scanning
  useEffect(() => {
    if (typeof window !== 'undefined' && activeSession.id) {
      const origin = window.location.origin;
      const url = `${origin}/?tab=RESPONSE_CARDS&mode=SCAN&session=${encodeURIComponent(activeSession.id)}&teacher=${encodeURIComponent(activeSession.teacherId || '')}&token=${encodeURIComponent(activeSession.sessionToken || '')}&pin=${encodeURIComponent(activeSession.sessionPin || '')}`;
      QRCode.toDataURL(url, {
        margin: 1,
        width: 220,
        color: { dark: '#020617', light: '#ffffff' },
      })
        .then((dataUrl) => setQrCodeDataUrl(dataUrl))
        .catch(() => console.error('[ResponseCards] Failed to render QR code'));
    }
  }, [activeSession.id, activeSession.teacherId, activeSession.sessionToken, activeSession.sessionPin]);

  // Listen to cross-tab / phone updates in real-time via BroadcastChannel & Firestore
  useEffect(() => {
    const unsubscribe = subscribeToSessionSync(
      (syncedSession) => {
        if (syncedSession.id === activeSession.id) {
          setActiveSession(syncedSession);
          onUpdateSession(syncedSession, { fromSync: true });
        }
      },
      activeSession.sessionPin,
      activeSession.id,
      activeSession.teacherId,
      (online) => setIsCloudOnline(online)
    );
    return () => {
      unsubscribe();
    };
  }, [activeSession.id, activeSession.sessionPin, activeSession.teacherId, onUpdateSession]);

  const currentQIndex = activeSession.currentQuestionIndex;
  const currentQuestion = activeSession.questions[currentQIndex];
  const currentResult = activeSession.results[currentQIndex];

  const totalStudents = currentClass.students.length;
  const answersMap: Record<string, StudentAnswerRecord> = currentResult?.answers || {};
  const answeredCount = Object.keys(answersMap).length;
  const isRevealed = currentResult?.status === 'revealed';

  // Option distribution counts
  const optionCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    Object.values(answersMap).forEach((ans) => {
      if (counts[ans.selectedOption] !== undefined) {
        counts[ans.selectedOption]++;
      }
    });
    return counts;
  }, [answersMap]);

  // Trigger celebration confetti when answer is revealed
  useEffect(() => {
    if (isRevealed) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isRevealed]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Lock & Reveal answer
  const handleLockAndReveal = () => {
    const updatedResults = [...activeSession.results];
    const endedTime = Date.now();
    updatedResults[currentQIndex] = {
      ...currentResult,
      status: 'revealed',
      endedAt: endedTime,
    };

    const updatedSession: QuizSession = {
      ...activeSession,
      results: updatedResults,
      updatedAt: new Date().toISOString(),
    };

    soundEngine.playSuccess();
    setActiveSession(updatedSession);
    saveActiveQuizSessionLocally(updatedSession);
    onUpdateSession(updatedSession, { fromSync: true });

    if (activeSession.teacherId) {
      updateSessionControlToCloud(activeSession.teacherId, activeSession.id, {
        questionStatus: {
          questionId: currentQuestion.id,
          status: 'revealed',
          endedAt: endedTime,
        },
      });
    }
  };

  // Reopen collection
  const handleReopen = () => {
    const updatedResults = [...activeSession.results];
    updatedResults[currentQIndex] = {
      ...currentResult,
      status: 'collecting',
    };

    const updatedSession: QuizSession = {
      ...activeSession,
      results: updatedResults,
      updatedAt: new Date().toISOString(),
    };

    setActiveSession(updatedSession);
    saveActiveQuizSessionLocally(updatedSession);
    onUpdateSession(updatedSession, { fromSync: true });

    if (activeSession.teacherId) {
      updateSessionControlToCloud(activeSession.teacherId, activeSession.id, {
        questionStatus: {
          questionId: currentQuestion.id,
          status: 'collecting',
        },
      });
    }
  };

  // Navigate question
  const handleNavigate = (idx: number) => {
    if (idx < 0 || idx >= activeSession.questions.length) return;
    const updatedSession: QuizSession = {
      ...activeSession,
      currentQuestionIndex: idx,
      updatedAt: new Date().toISOString(),
    };
    setActiveSession(updatedSession);
    saveActiveQuizSessionLocally(updatedSession);
    onUpdateSession(updatedSession, { fromSync: true });

    if (activeSession.teacherId) {
      updateSessionControlToCloud(activeSession.teacherId, activeSession.id, {
        currentQuestionIndex: idx,
      });
    }
  };

  const optionColors = {
    A: { bg: 'from-amber-600/30 to-amber-950/60', border: 'border-amber-500/50', badge: 'bg-amber-500 text-slate-950' },
    B: { bg: 'from-sky-600/30 to-sky-950/60', border: 'border-sky-500/50', badge: 'bg-sky-500 text-slate-950' },
    C: { bg: 'from-emerald-600/30 to-emerald-950/60', border: 'border-emerald-500/50', badge: 'bg-emerald-500 text-slate-950' },
    D: { bg: 'from-purple-600/30 to-purple-950/60', border: 'border-purple-500/50', badge: 'bg-purple-500 text-slate-950' },
  };

  // Correct answer count
  const correctCount = useMemo(() => {
    return Object.values(answersMap).filter((a) => a.isCorrect).length;
  }, [answersMap]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none">
      {/* TOP BAR */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-md">
            CÂU {currentQIndex + 1} / {activeSession.questions.length}
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <span>LỚP {activeSession.className}</span>
              <span className="text-xs font-normal text-slate-400">• {activeSession.title}</span>
            </h1>
          </div>
        </div>

        {/* Live Reception Progress Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-300">Đã giơ thẻ:</span>
            <span className="font-mono text-base font-black text-emerald-400">
              {answeredCount}/{totalStudents}
            </span>
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden ml-2">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${totalStudents > 0 ? (answeredCount / totalStudents) * 100 : 0}%` }}
              />
            </div>
          </div>

          {activeSession.sessionPin && (
            <button
              onClick={() => setShowPinModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/50 text-xs text-amber-300 font-bold transition-all shadow-md cursor-pointer"
              title="Quét QR hoặc nhập PIN để kết nối điện thoại quét thẻ"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>📱 Quét QR Kết nối ĐT</span>
              <span
                className={`w-2 h-2 rounded-full ${isCloudOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}
                title={isCloudOnline ? 'Đám mây trực tuyến' : 'Ngoại tuyến'}
              />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Bật/Tắt toàn màn hình (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
            title="Đóng trình chiếu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN QUESTION DISPLAY AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 sm:py-8 flex flex-col justify-center space-y-8">
        {/* Large Question Text */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-widest">
            <span>Câu hỏi kiểm tra</span>
            {currentQuestion.subject && <span>Môn: {currentQuestion.subject}</span>}
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-50 leading-snug">
            {currentQuestion.question}
          </h2>
        </div>

        {/* 4 Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {(['A', 'B', 'C', 'D'] as const).map((opt) => {
            const isCorrect = currentQuestion.correctAnswer === opt;
            const style = optionColors[opt];
            const count = optionCounts[opt];
            const percent = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;

            return (
              <div
                key={opt}
                className={`relative rounded-3xl border-2 p-5 sm:p-6 transition-all duration-300 flex items-center justify-between gap-4 ${
                  isRevealed
                    ? isCorrect
                      ? 'bg-gradient-to-r from-emerald-600/40 via-emerald-950/60 to-emerald-900/40 border-emerald-400 shadow-2xl shadow-emerald-500/20 scale-102 ring-2 ring-emerald-400/50'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                    : `bg-gradient-to-br ${style.bg} ${style.border} hover:border-slate-500 shadow-lg`
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <span
                    className={`w-12 h-12 rounded-2xl font-black text-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                      isRevealed && isCorrect
                        ? 'bg-emerald-400 text-slate-950 animate-bounce'
                        : style.badge
                    }`}
                  >
                    {opt}
                  </span>

                  <span className="text-lg sm:text-2xl font-bold text-slate-100 leading-tight">
                    {currentQuestion.options[opt]}
                  </span>
                </div>

                {/* Show Distribution when revealed */}
                {isRevealed && (
                  <div className="text-right flex-shrink-0 space-y-1">
                    <div className="text-base sm:text-xl font-black text-white font-mono">
                      {count} HS ({percent}%)
                    </div>
                    {isCorrect && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        Chính xác ✅
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Revealed Summary Card & Distribution Bar */}
        {isRevealed && (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl font-black">
                🎉
              </div>
              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <span>Đáp án đúng là:</span>
                  <span className="px-3 py-0.5 rounded-xl bg-emerald-500 text-slate-950 text-xl font-black">
                    {currentQuestion.correctAnswer}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Có <strong className="text-emerald-400 font-bold">{correctCount}/{answeredCount}</strong> học sinh trả lời đúng ({answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}% của lớp).
                </p>
              </div>
            </div>

            {currentQuestion.explanation && (
              <div className="text-xs text-slate-300 max-w-md bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <strong>Giải thích:</strong> {currentQuestion.explanation}
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM CONTROLLER BAR */}
      <footer className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNavigate(currentQIndex - 1)}
            disabled={currentQIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-bold text-xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Câu trước</span>
          </button>

          <button
            onClick={() => handleNavigate(currentQIndex + 1)}
            disabled={currentQIndex === activeSession.questions.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-bold text-xs transition-colors"
          >
            <span>Câu tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Reveal / Reopen toggle */}
        <div className="flex items-center gap-3">
          {!isRevealed ? (
            <button
              onClick={handleLockAndReveal}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>KẾT THÚC THU BÀI & CÔNG BỐ ĐÁP ÁN</span>
            </button>
          ) : (
            <button
              onClick={handleReopen}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Mở lại thu bài câu này</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400">
          Nhấn <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300">Esc</kbd> để thoát
        </div>
      </footer>

      {/* Modal Hiển thị mã QR và PIN cho Điện Thoại kết nối */}
      {showPinModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <h3 className="text-lg font-black text-white">KẾT NỐI ĐIỆN THOẠI QUÉT THẺ</h3>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Dùng camera điện thoại của Thầy/Cô để quét thẻ học sinh. Kết quả sẽ tự động đồng bộ theo thời gian thực lên màn chiếu này.
            </p>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl mx-auto w-fit shadow-xl border border-slate-700 flex flex-col items-center">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Mã QR kết nối điện thoại"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  Đang tạo mã QR...
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-700 mt-1">Quét bằng camera điện thoại</span>
            </div>

            {/* PIN Code Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-inner">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Hoặc nhập mã PIN phiên kiểm tra:
              </span>
              <div className="text-4xl sm:text-5xl font-mono font-black text-amber-300 tracking-widest select-all">
                {activeSession.sessionPin}
              </div>
            </div>

            {/* Cloud Status Indicator */}
            <div className="flex items-center justify-center gap-2 text-xs py-1.5 px-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className={`w-2.5 h-2.5 rounded-full ${isCloudOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={isCloudOnline ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                {isCloudOnline
                  ? 'Đồng bộ đám mây Firebase đang hoạt động'
                  : 'Đang kết nối ngoại tuyến / Sẵn sàng đồng bộ lại'}
              </span>
            </div>

            <div className="text-left bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-1.5 text-xs text-slate-300">
              <div className="font-bold text-amber-400">Hướng dẫn nhanh 2 bước:</div>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                <li>Dùng điện thoại quét mã QR ở trên để mở ngay phòng quét thẻ.</li>
                <li>Cầm điện thoại lia qua các thẻ học sinh đang giơ để nhận diện đáp án A, B, C, D.</li>
              </ol>
            </div>

            <button
              onClick={() => setShowPinModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Đã hiểu, quay lại màn chiếu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
