import { MathRenderer } from '../MathRenderer';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  FlipHorizontal,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronRight,
  ChevronLeft,
  X,
  Volume2,
  VolumeX,
  Edit2,
  Check,
  Sparkles,
  Lock,
  Eye,
  Maximize2,
  ArrowRight,
} from 'lucide-react';
import { ClassRoom } from '../../types';
import {
  QuizSession,
  CardOrientationAnswer,
  DetectedMarker,
  StudentAnswerRecord,
} from '../../types/responseCardTypes';
import {
  detectMarkersInCanvas,
  MarkerTemporalTracker,
} from '../../services/arucoService';
import {
  saveActiveQuizSession,
  saveActiveQuizSessionLocally,
  batchRecordStudentAnswersToCloud,
  recordStudentAnswerToCloud,
  updateSessionControlToCloud,
  getOrInitClassCardConfig,
  subscribeToSessionSync,
  loadOfflineAnswerQueue,
  saveOfflineAnswerQueue,
  enqueueOfflineAnswer,
  removeConfirmedOfflineAnswers,
  QueuedOfflineAnswer,
} from '../../services/responseCardStorage';
import { soundEngine } from '../../utils/audio';

interface CameraScannerScreenProps {
  session: QuizSession;
  currentClass: ClassRoom;
  onUpdateSession: (updated: QuizSession, options?: { fromSync?: boolean }) => void;
  onOpenProjector: () => void;
  onFinishSession: () => void;
}

export const CameraScannerScreen: React.FC<CameraScannerScreenProps> = ({
  session,
  currentClass,
  onUpdateSession,
  onOpenProjector,
  onFinishSession,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  // Own the live track across rerenders, camera flips and pending permission requests.
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isCloudOnline, setIsCloudOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Persistent Offline Queue & Rejected Answers state
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(() => {
    return loadOfflineAnswerQueue(session.id).filter((q) => q.status === 'pending').length;
  });
  const [rejectedAnswers, setRejectedAnswers] = useState<QueuedOfflineAnswer[]>(() => {
    return loadOfflineAnswerQueue(session.id).filter((q) => q.status === 'rejected_locked');
  });
  const [showRejectedModal, setShowRejectedModal] = useState<boolean>(false);
  const isFlushingRef = useRef<boolean>(false);
  // Firestore may report a cached snapshot even while the device has internet.
  // Do not use this snapshot flag as a gate for attempting queued writes.
  const lastAutoFlushAtRef = useRef<number>(0);
  const [cloudSaveError, setCloudSaveError] = useState<string | null>(null);

  // Manual input drawer
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedStudentForManual, setSelectedStudentForManual] = useState<string | null>(null);

  // Class Card Mappings: prioritize session snapshot for zero-setup phone scanning
  const cardConfig = useMemo(() => {
    return getOrInitClassCardConfig(currentClass);
  }, [currentClass]);

  const effectiveMappings = useMemo(() => {
    if (session.cardMappings && session.cardMappings.length > 0) {
      return session.cardMappings;
    }
    return cardConfig.mappings;
  }, [session.cardMappings, cardConfig]);

  // Map cardId -> Student
  const cardIdToStudentMap = useMemo(() => {
    const map = new Map<number, { studentId: string; name: string; code?: string; isSpare?: boolean }>();
    for (const m of effectiveMappings) {
      map.set(m.cardId, {
        studentId: m.studentId,
        name: m.studentName,
        code: m.studentCode,
        isSpare: m.isSpare,
      });
    }
    return map;
  }, [effectiveMappings]);

  // Current Question
  const currentQIndex = session.currentQuestionIndex;
  const currentQuestion = session.questions[currentQIndex];
  const currentResult = session.results[currentQIndex];

  // Flush persistent offline queue safely - NEVER delete before Firestore confirms success!
  const flushOfflineQueue = useCallback(async () => {
    if (!session.teacherId || isFlushingRef.current) return;
    const currentQueue = loadOfflineAnswerQueue(session.id);
    const pendingItems = currentQueue.filter((q) => q.status === 'pending');
    if (pendingItems.length === 0) {
      setOfflineQueueCount(0);
      setCloudSaveError(null);
      return;
    }

    isFlushingRef.current = true;
    try {
      const byQuestion: Record<string, Record<string, StudentAnswerRecord>> = {};
      for (const item of pendingItems) {
        if (!byQuestion[item.questionId]) byQuestion[item.questionId] = {};
        byQuestion[item.questionId][item.studentId] = item.record;
      }

      for (const [qId, answers] of Object.entries(byQuestion)) {
        const itemsForQ = pendingItems.filter((it) => it.questionId === qId);
        try {
          const result = await batchRecordStudentAnswersToCloud(
            session.teacherId,
            session.id,
            qId,
            answers
          );

          if (result.success) {
            setCloudSaveError(null);
            setIsCloudOnline(true);
            // ONLY remove from queue after confirmed success from Firestore!
            removeConfirmedOfflineAnswers(
              session.id,
              itemsForQ.map((it) => ({ questionId: it.questionId, studentId: it.studentId }))
            );
          } else if (result.rejectedLocked) {
            setCloudSaveError(result.errorMessage || 'Câu hỏi đã khóa, chưa thể lưu đáp án.');
            // Question was locked or session completed on computer!
            const rejectedItems: QueuedOfflineAnswer[] = itemsForQ.map((it) => ({
              ...it,
              status: 'rejected_locked',
              errorMessage: result.errorMessage,
            }));
            const remaining = removeConfirmedOfflineAnswers(
              session.id,
              itemsForQ.map((it) => ({ questionId: it.questionId, studentId: it.studentId }))
            );
            saveOfflineAnswerQueue(session.id, [...remaining, ...rejectedItems]);
            setRejectedAnswers((prev) => [...prev, ...rejectedItems]);
          } else {
            // Write error occurred -> DO NOT DELETE! Keep in localStorage queue.
            setCloudSaveError(result.errorMessage || 'Firebase chưa xác nhận lưu đáp án.');
            console.warn('[ResponseCards] Offline batch write deferred:', result.errorMessage);
          }
        } catch (err: any) {
          setCloudSaveError(err?.message || 'Lỗi kết nối Firebase, đáp án vẫn được lưu tạm.');
          console.warn('[ResponseCards] Network failure during batch write, answers retained in queue:', err?.message || err);
        }
      }
    } finally {
      isFlushingRef.current = false;
      const refreshedPending = loadOfflineAnswerQueue(session.id).filter((q) => q.status === 'pending');
      setOfflineQueueCount(refreshedPending.length);
    }
  }, [session.id, session.teacherId]);

  // Try an authenticated Firestore write when the browser has internet, even
  // if onSnapshot is currently serving cached data. Throttle automatic retries
  // to avoid a write on every camera frame.
  const requestAutoFlush = useCallback(() => {
    if (!session.teacherId || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const now = Date.now();
    if (now - lastAutoFlushAtRef.current < 4000) return;
    lastAutoFlushAtRef.current = now;
    void flushOfflineQueue();
  }, [session.teacherId, flushOfflineQueue]);

  // Continue retrying while pending answers exist. A second card scanned within
  // the 4-second throttle window must not remain queued indefinitely.
  useEffect(() => {
    if (offlineQueueCount <= 0) return;
    requestAutoFlush();
    const retry = window.setInterval(requestAutoFlush, 7000);
    return () => window.clearInterval(retry);
  }, [offlineQueueCount, requestAutoFlush]);

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsCloudOnline(true);
      requestAutoFlush();
    };
    const handleOffline = () => {
      setIsCloudOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [requestAutoFlush]);

  // Listen for live updates from computer projector via BroadcastChannel & Firestore
  useEffect(() => {
    const unsubscribe = subscribeToSessionSync(
      (synced) => {
        if (synced.id === session.id) {
          if (synced.currentQuestionIndex !== session.currentQuestionIndex) {
            trackerRef.current.reset();
          }
          onUpdateSession(synced, { fromSync: true });
        }
      },
      session.sessionPin,
      session.id,
      session.teacherId,
      (online) => {
        setIsCloudOnline(online);
        if (online) requestAutoFlush();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [session.id, session.sessionPin, session.teacherId, session.currentQuestionIndex, onUpdateSession, requestAutoFlush]);

  // Answer tallies for current question
  const answersMap: Record<string, StudentAnswerRecord> = currentResult?.answers || {};
  const activeStudentsList = useMemo(() => {
    if (currentClass?.students && currentClass.students.length > 0) {
      return currentClass.students;
    }
    // Fallback from session.cardMappings for standalone mobile scanner
    return effectiveMappings
      .filter((m) => !m.isSpare)
      .map((m) => ({
        id: m.studentId,
        name: m.studentName,
        studentCode: m.studentCode,
        callCount: 0,
      }));
  }, [currentClass, effectiveMappings]);

  const totalStudents = activeStudentsList.length;
  const answeredCount = Object.keys(answersMap).length;
  const remainingCount = Math.max(0, totalStudents - answeredCount);

  // Students who have not answered yet
  const unansweredStudents = useMemo(() => {
    return activeStudentsList.filter((s) => !answersMap[s.id]);
  }, [activeStudentsList, answersMap]);

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

  // Temporal Stability Tracker Ref
  const trackerRef = useRef<MarkerTemporalTracker>(new MarkerTemporalTracker());

  // Start Camera
  const startCamera = async () => {
    const requestId = ++cameraRequestRef.current;
    setCameraError(null);
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (requestId !== cameraRequestRef.current) return;
      trackerRef.current.reset();
      setIsCameraActive(true);
      setIsTorchOn(false);
      const track = stream.getVideoTracks()[0];
      const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(capabilities?.torch));
    } catch (err: any) {
      if (requestId !== cameraRequestRef.current) return;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      console.error('Camera access error:', err);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Trình duyệt chưa được cấp quyền truy cập Camera. Vui lòng cho phép Camera trong cài đặt trình duyệt!'
          : 'Không thể mở Camera trên thiết bị này. Vui lòng kiểm tra kết nối thiết bị.'
      );
      setIsCameraActive(false);
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Switch between Environment (Back) and User (Front) camera
  const toggleFacingMode = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Cleanup must stop the current stream, not a stale state closure.
  useEffect(() => {
    void startCamera();
    return () => {
      cameraRequestRef.current++;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraFacing]);

  // Real-time Detection Loop
  useEffect(() => {
    let animId: number;
    let isProcessing = false;
    let lastProcessedAt = 0;

    // Limit CPU load on mobile while leaving enough frames for temporal confirmation.
    const processFrame = (timestamp: number) => {
      if (timestamp - lastProcessedAt < 90) {
        animId = requestAnimationFrame(processFrame);
        return;
      }
      lastProcessedAt = timestamp;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlay = overlayCanvasRef.current;

      if (
        video &&
        canvas &&
        overlay &&
        video.readyState >= 2 &&
        !video.paused &&
        !isProcessing &&
        currentResult?.status === 'collecting'
      ) {
        isProcessing = true;

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        // Preserve marker detail while capping pixel workload on portrait phones.
        const targetW = Math.max(320, Math.round(Math.min(800, vw, Math.sqrt(720000 * vw / vh))));
        const targetH = Math.max(1, Math.round((vh / vw) * targetW));

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH);

          // Detect markers in frame
          const detectedMarkers = detectMarkersInCanvas(ctx, targetW, targetH);

          // Confirm via temporal tracker
          const confirmedMarkers = trackerRef.current.update(detectedMarkers);

          // Draw visual feedback overlay on the video view
          const overlayCtx = overlay.getContext('2d');
          if (overlayCtx) {
            overlay.width = video.clientWidth || targetW;
            overlay.height = video.clientHeight || targetH;
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

            const scaleX = overlay.width / targetW;
            const scaleY = overlay.height / targetH;

            // Draw bounding boxes and labels for all detected markers
            for (const marker of detectedMarkers) {
              const student = cardIdToStudentMap.get(marker.cardId);
              const isConfirmed = confirmedMarkers.some((m) => m.cardId === marker.cardId);

              // Draw quad polygon
              overlayCtx.beginPath();
              overlayCtx.moveTo(marker.corners[0].x * scaleX, marker.corners[0].y * scaleY);
              for (let i = 1; i < 4; i++) {
                overlayCtx.lineTo(marker.corners[i].x * scaleX, marker.corners[i].y * scaleY);
              }
              overlayCtx.closePath();

              overlayCtx.lineWidth = isConfirmed ? 3 : 2;
              overlayCtx.strokeStyle = isConfirmed ? '#10b981' : '#f59e0b';
              overlayCtx.stroke();
              overlayCtx.fillStyle = isConfirmed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)';
              overlayCtx.fill();

              // Draw Label badge above top-left corner
              const labelX = marker.corners[0].x * scaleX;
              const labelY = Math.max(20, marker.corners[0].y * scaleY - 8);

              overlayCtx.fillStyle = isConfirmed ? '#064e3b' : '#78350f';
              overlayCtx.beginPath();
              overlayCtx.roundRect(labelX - 4, labelY - 14, 110, 20, 6);
              overlayCtx.fill();
              overlayCtx.strokeStyle = isConfirmed ? '#10b981' : '#f59e0b';
              overlayCtx.lineWidth = 1;
              overlayCtx.stroke();

              overlayCtx.fillStyle = '#ffffff';
              overlayCtx.font = 'bold 11px sans-serif';
              const cardStr = `#${String(marker.cardId).padStart(3, '0')}`;
              const nameDisplay = student
                ? student.isSpare
                  ? `Dự phòng ${cardStr}`
                  : `${cardStr} ${student.name.split(' ').slice(-1)[0]}`
                : cardStr;
              overlayCtx.fillText(`[${marker.option}] ${nameDisplay}`, labelX + 2, labelY);
            }
          }

          // Register new answers if confirmed
          if (confirmedMarkers.length > 0) {
            let hasNewAnswer = false;
            const updatedAnswers = { ...(currentResult.answers || {}) };

            const newScannedMap: Record<string, StudentAnswerRecord> = {};

            for (const marker of confirmedMarkers) {
              const student = cardIdToStudentMap.get(marker.cardId);
              if (student) {
                const existing = updatedAnswers[student.studentId];
                // Record if not yet recorded OR if student turned card to a different option before locking
                if (!existing || existing.selectedOption !== marker.option) {
                  const isCorrect = marker.option === currentQuestion.correctAnswer;
                  const rec: StudentAnswerRecord = {
                    studentId: student.studentId,
                    studentName: student.name,
                    studentCode: student.code,
                    cardId: marker.cardId,
                    selectedOption: marker.option,
                    isCorrect,
                    timestamp: Date.now(),
                  };
                  updatedAnswers[student.studentId] = rec;
                  newScannedMap[student.studentId] = rec;
                  hasNewAnswer = true;
                }
              }
            }

            if (hasNewAnswer) {
              if (soundEnabled) {
                soundEngine.playTick(1.4);
              }

              const updatedResults = [...session.results];
              updatedResults[currentQIndex] = {
                ...currentResult,
                answers: updatedAnswers,
              };

              const updatedSession: QuizSession = {
                ...session,
                results: updatedResults,
                updatedAt: new Date().toISOString(),
              };

              saveActiveQuizSessionLocally(updatedSession);
              onUpdateSession(updatedSession, { fromSync: true });

              for (const [sId, rec] of Object.entries(newScannedMap)) {
                enqueueOfflineAnswer(session.id, {
                  questionId: currentQuestion.id,
                  studentId: sId,
                  record: rec,
                });
              }
              setOfflineQueueCount(loadOfflineAnswerQueue(session.id).filter((q) => q.status === 'pending').length);

              // Cached Firestore snapshots must not prevent a fresh write attempt.
              requestAutoFlush();
            }
          }
        }

        isProcessing = false;
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    isCameraActive,
    currentResult,
    currentQuestion,
    currentQIndex,
    cardIdToStudentMap,
    session,
    soundEnabled,
    onUpdateSession,
    isCloudOnline,
    requestAutoFlush,
  ]);

  // Lock answers and reveal
  const handleLockAndReveal = () => {
    const endedTime = Date.now();
    const updatedResults = [...session.results];
    updatedResults[currentQIndex] = {
      ...currentResult,
      status: 'revealed',
      endedAt: endedTime,
    };

    const updatedSession: QuizSession = {
      ...session,
      results: updatedResults,
      updatedAt: new Date().toISOString(),
    };

    if (soundEnabled) {
      soundEngine.playSuccess();
    }

    saveActiveQuizSessionLocally(updatedSession);
    onUpdateSession(updatedSession, { fromSync: true });

    if (session.teacherId) {
      updateSessionControlToCloud(session.teacherId, session.id, {
        questionStatus: {
          questionId: currentQuestion.id,
          status: 'revealed',
          endedAt: endedTime,
        },
      });
    }
  };

  // Re-open collection for this question
  const handleReopenCollection = () => {
    const updatedResults = [...session.results];
    updatedResults[currentQIndex] = {
      ...currentResult,
      status: 'collecting',
    };

    const updatedSession: QuizSession = {
      ...session,
      results: updatedResults,
      updatedAt: new Date().toISOString(),
    };

    saveActiveQuizSessionLocally(updatedSession);
    onUpdateSession(updatedSession, { fromSync: true });

    if (session.teacherId) {
      updateSessionControlToCloud(session.teacherId, session.id, {
        questionStatus: {
          questionId: currentQuestion.id,
          status: 'collecting',
        },
      });
    }
  };

  // Switch to next or previous question
  const handleNavigateQuestion = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= session.questions.length) return;
    trackerRef.current.reset();

    const updatedSession: QuizSession = {
      ...session,
      currentQuestionIndex: newIdx,
      updatedAt: new Date().toISOString(),
    };

    saveActiveQuizSessionLocally(updatedSession);
    onUpdateSession(updatedSession, { fromSync: true });

    if (session.teacherId) {
      updateSessionControlToCloud(session.teacherId, session.id, {
        currentQuestionIndex: newIdx,
      });
    }
  };

  // Manual Answer Submission
  const handleManualSubmitAnswer = (studentId: string, option: CardOrientationAnswer) => {
    const student = currentClass.students.find((s) => s.id === studentId);
    if (!student) return;

    const mapping = cardConfig.mappings.find((m) => m.studentId === studentId);
    const isCorrect = option === currentQuestion.correctAnswer;
    const rec: StudentAnswerRecord = {
      studentId,
      studentName: student.name,
      studentCode: student.studentCode,
      cardId: mapping?.cardId || 0,
      selectedOption: option,
      isCorrect,
      timestamp: Date.now(),
      manual: true,
    };

    const updatedAnswers = {
      ...(currentResult.answers || {}),
      [studentId]: rec,
    };

    const updatedResults = [...session.results];
    updatedResults[currentQIndex] = {
      ...currentResult,
      answers: updatedAnswers,
    };

    const updatedSession: QuizSession = {
      ...session,
      results: updatedResults,
      updatedAt: new Date().toISOString(),
    };

    saveActiveQuizSessionLocally(updatedSession);
    onUpdateSession(updatedSession, { fromSync: true });

    enqueueOfflineAnswer(session.id, {
      questionId: currentQuestion.id,
      studentId,
      record: rec,
    });
    setOfflineQueueCount(loadOfflineAnswerQueue(session.id).filter((q) => q.status === 'pending').length);

    requestAutoFlush();

    setIsManualModalOpen(false);
    setSelectedStudentForManual(null);
  };

  // Delete/Revoke a recorded answer (if mis-scanned)
  const handleRemoveRecordedAnswer = (studentId: string) => {
    const updatedAnswers = { ...(currentResult.answers || {}) };
    delete updatedAnswers[studentId];

    const updatedResults = [...session.results];
    updatedResults[currentQIndex] = {
      ...currentResult,
      answers: updatedAnswers,
    };

    const updatedSession: QuizSession = {
      ...session,
      results: updatedResults,
      updatedAt: new Date().toISOString(),
    };

    saveActiveQuizSessionLocally(updatedSession);
    onUpdateSession(updatedSession, { fromSync: true });
  };

  return (
    <div className="space-y-4">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Cảnh báo đáp án bị từ chối do câu đã khóa trên máy tính */}
      {rejectedAnswers.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-200 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="font-black text-rose-300">Phát hiện {rejectedAnswers.length} đáp án chưa gửi:</strong>{' '}
              Máy tính đã khóa câu hỏi hoặc kết thúc bài kiểm tra trước khi dữ liệu kịp đồng bộ.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setShowRejectedModal(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold border border-rose-500/40 text-xs transition-colors cursor-pointer"
            >
              Xem chi tiết ({rejectedAnswers.length})
            </button>
            <button
              onClick={() => {
                const pendingOnly = loadOfflineAnswerQueue(session.id).filter((q) => q.status === 'pending');
                saveOfflineAnswerQueue(session.id, pendingOnly);
                setRejectedAnswers([]);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              title="Bỏ qua và ẩn thông báo này"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* TOP HEADER: Question tracker & live reception count */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm whitespace-nowrap shrink-0">
            CÂU {currentQIndex + 1} / {session.questions.length}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-extrabold text-white max-w-lg">
              <MathRenderer text={currentQuestion?.question || ''} />
            </h3>
            <span className="text-[11px] text-slate-400">
              Lớp {session.className} • {session.title}
            </span>
          </div>
        </div>

          {/* Live Reception Statistics */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {isCloudOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-600/40 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold">Đã đồng bộ máy tính</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[11px] font-bold">
                {offlineQueueCount > 0 ? `Ngoại tuyến: Lưu tạm ${offlineQueueCount} câu` : 'Ngoại tuyến (Chờ mạng)'}
              </span>
              {offlineQueueCount > 0 && (
                <button
                  onClick={flushOfflineQueue}
                  className="ml-1 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded-md font-bold text-amber-200 border border-amber-500/30"
                >
                  Gửi lại
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Đã thu:</span>
            <strong className="text-emerald-400 font-extrabold text-sm">
              {answeredCount}/{totalStudents}
            </strong>
            <span className="text-slate-400">
              ({totalStudents > 0 ? Math.round((answeredCount / totalStudents) * 100) : 0}%)
            </span>
          </div>

          {remainingCount > 0 && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Nhấn để xem danh sách hoặc nhập điểm tay"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Còn {remainingCount} HS chưa quét</span>
            </button>
          )}

          {/* Projector View Button */}
          <button
            onClick={onOpenProjector}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
            title="Mở màn hình trình chiếu câu hỏi cho cả lớp"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trình Chiếu</span>
          </button>
        </div>
      </div>

      {cloudSaveError && offlineQueueCount > 0 && (
        <div role="alert" className="rounded-xl border border-rose-600/50 bg-rose-950/60 p-3 text-xs font-semibold text-rose-200">
          <strong>Chưa gửi được đáp án lên Firebase:</strong> {cloudSaveError.slice(0, 200)}
          <div className="mt-1 text-amber-200">Đáp án vẫn được giữ tạm trên điện thoại. Không khóa câu hoặc xóa dữ liệu trình duyệt trước khi đồng bộ xong.</div>
        </div>
      )}

      {/* CAMERA VIEWFINDER & LIVE SCANNING OVERLAY */}
      <div className="relative w-full bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center min-h-[360px] sm:min-h-[480px]">
        {cameraError ? (
          <div className="p-8 text-center max-w-md space-y-3">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h4 className="text-base font-bold text-white">Lỗi truy cập Camera</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              Thử lại Camera
            </button>
          </div>
        ) : (
          <>
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover max-h-[70vh]"
            />

            {/* Overlaid Drawing Canvas for Augmented Markers */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Top Camera Controls Overlay */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 text-white text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Camera đang quét đa thẻ...</span>
              </div>

              <div className="flex items-center gap-1.5">
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                      isTorchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
                    }`}
                    title={isTorchOn ? 'Tắt đèn Flash' : 'Bật đèn Flash'}
                  >
                    {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}

                <button
                  onClick={toggleFacingMode}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white transition-all"
                  title="Chuyển đổi Camera trước/sau"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                    soundEnabled
                      ? 'bg-black/60 text-emerald-400 border-white/10'
                      : 'bg-black/60 text-slate-400 border-white/10'
                  }`}
                  title={soundEnabled ? 'Tắt âm thanh nhận diện' : 'Bật âm thanh'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Realtime Live Responses Drawer at bottom of camera */}
            <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 pointer-events-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              {/* Option Distribution Pills */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase hidden sm:inline">Phân bố:</span>
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <div
                    key={opt}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-200"
                  >
                    <span className="font-extrabold text-amber-400">{opt}:</span>
                    <span className="font-black">{optionCounts[opt]}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons: Khóa đáp án / Công bố / Chuyển câu */}
              <div className="flex items-center gap-2">
                {currentResult?.status === 'collecting' ? (
                  <button
                    onClick={handleLockAndReveal}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Khóa & Công Bố Đáp Án</span>
                  </button>
                ) : (
                  <button
                    onClick={handleReopenCollection}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Thu Lại Câu Này</span>
                  </button>
                )}

                {/* Next Question Navigation */}
                {currentQIndex < session.questions.length - 1 ? (
                  <button
                    onClick={() => handleNavigateQuestion(currentQIndex + 1)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span>Câu Tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onFinishSession}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tổng Kết Buổi Kiểm Tra</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* QUESTION DETAILS & RECORDED ANSWERS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Left Col: 4 Question Options Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="font-bold text-slate-200 uppercase tracking-wide flex items-center justify-between border-b border-slate-800 pb-2">
            <span>Các phương án lựa chọn</span>
            {currentResult?.status === 'revealed' && (
              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Đáp án: {currentQuestion.correctAnswer}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
              const isCorrect = currentQuestion.correctAnswer === opt;
              const isRevealed = currentResult?.status === 'revealed';

              return (
                <div
                  key={opt}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    isRevealed && isCorrect
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs ${
                        isRevealed && isCorrect
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opt}
                    </span>
                    <span className="min-w-0 text-base"><MathRenderer text={currentQuestion.options[opt]} /></span>
                  </div>

                  <span className="shrink-0 font-mono text-[11px] font-bold text-slate-400">
                    {optionCounts[opt]} HS ({answeredCount > 0 ? Math.round((optionCounts[opt] / answeredCount) * 100) : 0}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Live Answered Students Grid */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Học sinh đã trả lời ({answeredCount}/{totalStudents})</span>
            </div>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 text-[11px] font-bold"
            >
              + Nhập điểm thủ công ({unansweredStudents.length} chưa thu)
            </button>
          </div>

          {answeredCount === 0 ? (
            <div className="text-center py-10 text-slate-500">
              Chưa có học sinh nào được ghi nhận. Hãy hướng camera vào lớp học để quét thẻ!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
              {Object.values(answersMap).map((ans) => {
                const isRevealed = currentResult?.status === 'revealed';

                return (
                  <div
                    key={ans.studentId}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 transition-all ${
                      isRevealed
                        ? ans.isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-bold text-xs truncate">{ans.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Thẻ #{String(ans.cardId).padStart(3, '0')} {ans.manual ? '• Thủ công' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs ${
                          isRevealed
                            ? ans.isCorrect
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-rose-500 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {ans.selectedOption}
                      </span>

                      <button
                        onClick={() => handleRemoveRecordedAnswer(ans.studentId)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                        title="Xóa để quét lại"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MANUAL INPUT MODAL / DRAWER */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Nhập Đáp Án Thủ Công</h3>
              </div>
              <button
                onClick={() => {
                  setIsManualModalOpen(false);
                  setSelectedStudentForManual(null);
                }}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Dành cho học sinh làm mất thẻ, ngồi góc khuất camera hoặc thẻ bị mờ không thể nhận diện.
            </p>

            {/* List of remaining unanswered students */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
              {unansweredStudents.length === 0 ? (
                <div className="text-center py-8 text-emerald-400 font-bold">
                  Tất cả {totalStudents} học sinh trong lớp đã hoàn thành câu này! 🎉
                </div>
              ) : (
                unansweredStudents.map((std) => {
                  const mapping = effectiveMappings.find((m) => m.studentId === std.id);
                  const cardLabel = mapping ? `#${String(mapping.cardId).padStart(3, '0')}` : '—';
                  return (
                    <div
                      key={std.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-100">{std.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Thẻ {cardLabel} {std.studentCode ? `• Mã: ${std.studentCode}` : ''}
                        </div>
                      </div>

                      {/* 4 Quick Choice Buttons */}
                      <div className="flex items-center gap-1">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleManualSubmitAnswer(std.id, opt)}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-black text-xs text-slate-200 transition-all"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XỬ LÝ ĐÁP ÁN BỊ TỪ CHỐI DO KHÓA CÂU */}
      {showRejectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Đáp Án Không Thể Gửi (Đã Khóa)</h3>
              </div>
              <button
                onClick={() => setShowRejectedModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Các đáp án sau được ghi nhận nhưng Giáo viên đã bấm <strong>Khóa câu / Công bố đáp án</strong> trên máy tính trước khi dữ liệu được gửi. Hệ thống máy chủ từ chối ghi đè để bảo toàn tính minh bạch:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
              {rejectedAnswers.map((it, idx) => {
                const student = currentClass.students.find((s) => s.id === it.studentId);
                const qItem = session.questions.find((q) => q.id === it.questionId);
                return (
                  <div
                    key={`${it.questionId}_${it.studentId}_${idx}`}
                    className="p-3 bg-slate-950 border border-rose-900/40 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white">
                        {it.record.studentName || student?.name || it.studentId}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {qItem ? <>Câu hỏi: <MathRenderer text={qItem.question} /></> : 'Câu: ' + it.questionId}
                      </div>
                      <div className="text-[10px] text-rose-400 mt-0.5">
                        Lý do: {it.errorMessage || 'Câu hỏi đã bị khóa trên máy chủ'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black flex items-center justify-center">
                        {it.record.selectedOption}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">Thầy/Cô có thể nhập tay lại nếu cần.</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const pendingOnly = loadOfflineAnswerQueue(session.id).filter((q) => q.status === 'pending');
                    saveOfflineAnswerQueue(session.id, pendingOnly);
                    setRejectedAnswers([]);
                    setShowRejectedModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  Xóa cảnh báo
                </button>
                <button
                  onClick={() => setShowRejectedModal(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
