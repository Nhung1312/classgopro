import React, { useState, useEffect, useMemo } from 'react';
import {
  QrCode,
  Camera,
  Layers,
  BarChart3,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Sparkles,
  BookOpen,
  ChevronRight,
  Clock,
  Printer,
  FileSpreadsheet,
  Smartphone,
  KeyRound,
  X,
} from 'lucide-react';
import { ClassRoom, HistoryRecord } from '../../types';
import { QuizSession } from '../../types/responseCardTypes';
import {
  RESPONSE_REMOTE_SYNC_NOTICE,
  loadAllQuizSessions,
  saveActiveQuizSession,
  saveActiveQuizSessionLocally,
  loadActiveQuizSession,
  deleteQuizSession,
  fetchSessionByPin,
  fetchSessionFromCloud,
} from '../../services/responseCardStorage';
import { CardPrintSheet } from './CardPrintSheet';
import { CreateQuizModal } from './CreateQuizModal';
import { CameraScannerScreen } from './CameraScannerScreen';
import { QuizProjectorView } from './QuizProjectorView';
import { QuizSessionResultsScreen } from './QuizSessionResultsScreen';

type ResponseCardSubTab = 'CARDS' | 'SESSIONS' | 'SCAN' | 'RESULTS';

interface ResponseCardsScreenProps {
  classes: ClassRoom[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  onUpdateClasses: (classes: ClassRoom[]) => void;
  currentUser?: any;
  onOpenAuthModal?: () => void;
  onUpdateHistory?: (history: HistoryRecord[]) => void;
  history?: HistoryRecord[];
}

export const ResponseCardsScreen: React.FC<ResponseCardsScreenProps> = ({
  classes,
  activeClassId,
  onSelectClass,
  onUpdateClasses,
  currentUser,
  onOpenAuthModal,
  onUpdateHistory,
  history,
}) => {
  const [subTab, setSubTab] = useState<ResponseCardSubTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'SCAN' || params.get('session') || params.get('pin')) {
        return 'SCAN';
      }
    }
    return 'CARDS';
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);

  // All saved sessions
  const [sessions, setSessions] = useState<QuizSession[]>(() => loadAllQuizSessions());

  // Current active session for scanning/projecting/results
  const [activeSession, setActiveSession] = useState<QuizSession | null>(() => {
    return loadActiveQuizSession();
  });

  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === activeClassId) || classes[0];
  }, [classes, activeClassId]);

  useEffect(() => {
    if (activeSession && currentClass && activeSession.classId !== currentClass.id) {
      const match = classes.find((c) => c.id === activeSession.classId);
      if (match) {
        onSelectClass(match.id);
      }
    }
  }, [currentClass, activeSession, classes, onSelectClass]);

  // Filter sessions for current class and subject
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');

  const classSubjects = useMemo(() => {
    const subs = new Set<string>();
    sessions
      .filter((s) => s.classId === currentClass?.id)
      .forEach((s) => {
        if (s.subject) subs.add(s.subject);
      });
    return Array.from(subs);
  }, [sessions, currentClass]);

  const classSessions = useMemo(() => {
    if (!currentClass) return sessions;
    return sessions.filter((s) => {
      if (s.classId !== currentClass.id) return false;
      if (subjectFilter !== 'ALL' && (s.subject || 'Toán') !== subjectFilter) return false;
      return true;
    });
  }, [sessions, currentClass, subjectFilter]);

  // Keep sessions fresh
  const refreshSessions = () => {
    const list = loadAllQuizSessions();
    setSessions(list);
    const active = loadActiveQuizSession();
    if (active) {
      const freshActive = list.find((s) => s.id === active.id) || active;
      setActiveSession(freshActive);
    }
  };

  // PIN cross-device connection modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isConnectingPin, setIsConnectingPin] = useState(false);

  // Auto-connect if URL has QR scan parameters (?session=...&teacher=...) or ?pin=XXXXXX
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSession = params.get('session');
      const urlTeacher = params.get('teacher');
      const urlToken = params.get('token');
      const urlPin = params.get('pin');

      if (urlSession && urlTeacher) {
        setIsConnectingPin(true);
        fetchSessionFromCloud(urlTeacher, urlSession, urlToken || undefined, urlPin || undefined)
          .then((sess) => {
            if (sess) {
              saveActiveQuizSessionLocally(sess);
              setActiveSession(sess);
              setSubTab('SCAN');
              if (sess.classId && sess.classId !== activeClassId) {
                onSelectClass(sess.classId);
              }
            }
          })
          .catch((err) => console.error('[ResponseCards] Failed auto-connect from QR:', err?.message || 'Error'))
          .finally(() => setIsConnectingPin(false));
      } else if (urlPin && urlPin.trim().length >= 6) {
        fetchSessionByPin(urlPin.trim(), currentUser?.uid).then((sess) => {
          if (sess) {
            saveActiveQuizSessionLocally(sess);
            setActiveSession(sess);
            setSubTab('SCAN');
            if (sess.classId && sess.classId !== activeClassId) {
              onSelectClass(sess.classId);
            }
          }
        });
      }
    }
  }, [currentUser?.uid, activeClassId, onSelectClass]);

  const handleConnectPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinInput.trim();
    if (pin.length < 6) return;

    if (!currentUser) {
      setPinError('Thầy/Cô vui lòng đăng nhập tài khoản Google Giáo viên để bảo mật dữ liệu học sinh.');
      onOpenAuthModal?.();
      return;
    }

    setIsConnectingPin(true);
    setPinError(null);
    try {
      const sess = await fetchSessionByPin(pin, currentUser.uid);
      if (sess) {
        saveActiveQuizSessionLocally(sess);
        setActiveSession(sess);
        setSubTab('SCAN');
        if (sess.classId && sess.classId !== activeClassId) {
          onSelectClass(sess.classId);
        }
        setIsPinModalOpen(false);
        setPinInput('');
      } else {
        setPinError('Không tìm thấy phiên kiểm tra đang chạy với mã PIN này trên tài khoản của Thầy/Cô. Vui lòng kiểm tra lại mã PIN hoặc quét mã QR trên máy tính.');
      }
    } catch (err: any) {
      setPinError('Lỗi kết nối phiên kiểm tra: ' + (err?.message || 'Vui lòng thử lại.'));
    } finally {
      setIsConnectingPin(false);
    }
  };

  const handleSessionCreated = (newSession: QuizSession) => {
    saveActiveQuizSession(newSession);
    setActiveSession(newSession);
    refreshSessions();
    setIsCreateModalOpen(false);
    setSubTab('SCAN'); // Auto navigate to scanning screen
  };

  const handleSelectSessionToScan = (session: QuizSession) => {
    saveActiveQuizSessionLocally(session);
    setActiveSession(session);
    setSubTab('SCAN');
  };

  const handleSelectSessionToViewResults = (session: QuizSession) => {
    saveActiveQuizSessionLocally(session);
    setActiveSession(session);
    setSubTab('RESULTS');
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Thầy/Cô có chắc chắn muốn xoá phiên kiểm tra này? Kết quả đã ghi nhận sẽ bị xoá khỏi danh mục kiểm tra.')) {
      deleteQuizSession(sessionId);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
      refreshSessions();
    }
  };

  const handleUpdateActiveSession = (updated: QuizSession, options?: { fromSync?: boolean }) => {
    try {
      if (options?.fromSync) {
        saveActiveQuizSessionLocally(updated);
        setActiveSession(updated);
        refreshSessions();
        return;
      }
      saveActiveQuizSession(updated);
      setActiveSession(updated);
      refreshSessions();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không lưu được phiên kiểm tra.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5 animate-fadeIn">
      {/* Top Header & Sub-Tab Navigation */}
      <p role="status" className="rounded-xl bg-amber-950/60 border border-amber-600/50 p-3 text-sm text-amber-200">{RESPONSE_REMOTE_SYNC_NOTICE}</p>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-bold text-lg">
              📇
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Thẻ Trả Lời Thông Minh</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Open ArUco Optical Scanner
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Quét thẻ giấy học sinh bằng camera, tự động chấm điểm, thống kê và chuyển điểm vào Sổ Điểm
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab pills & Phone connect */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              setIsPinModalOpen(true);
              setPinError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Dùng camera điện thoại quét thẻ kết nối với máy tính"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>📱 Nhập PIN Quét ĐT</span>
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => setSubTab('CARDS')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'CARDS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>1. Bộ Thẻ & In Ấn</span>
          </button>

          <button
            onClick={() => setSubTab('SESSIONS')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'SESSIONS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Đề Kiểm Tra ({classSessions.length})</span>
          </button>

          <button
            onClick={() => setSubTab('SCAN')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'SCAN'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>3. Quét Camera</span>
            {activeSession && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setSubTab('RESULTS')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'RESULTS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>4. Kết Quả & Sổ Điểm</span>
          </button>
        </div>
      </div>
    </div>

      {/* Sub-Tab 1: BỘ THẺ & IN ẤN */}
      {subTab === 'CARDS' && currentClass && (
        <CardPrintSheet currentClass={currentClass} />
      )}

      {/* Sub-Tab 2: DANH SÁCH BÀI KIỂM TRA & TẠO MỚI */}
      {subTab === 'SESSIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Danh sách bài kiểm tra trắc nghiệm</span>
                <span className="text-indigo-400 font-extrabold text-xs">Lớp {currentClass?.name}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Tạo nhanh câu hỏi mới hoặc lấy từ Kho KT Bài Cũ Toán 6-9
              </p>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Bài Kiểm Tra Mới</span>
            </button>
          </div>

          {/* Subject Filter Pills */}
          {classSubjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-[11px] font-bold text-slate-400">Lọc môn học:</span>
              <button
                type="button"
                onClick={() => setSubjectFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  subjectFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tất cả ({sessions.filter((s) => s.classId === currentClass?.id).length})
              </button>
              {classSubjects.map((sub) => {
                const count = sessions.filter((s) => s.classId === currentClass?.id && (s.subject || 'Toán') === sub).length;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubjectFilter(sub)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      subjectFilter === sub
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sub} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {classSessions.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-dashed border-slate-800 rounded-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-3xl mx-auto">
                📋
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">Chưa có bài kiểm tra nào cho lớp {currentClass?.name}</h3>
                <p className="text-xs text-slate-400">
                  Bấm &quot;Tạo Bài Kiểm Tra Mới&quot; để thêm câu hỏi trực tiếp hoặc lấy câu hỏi từ Kho KT Bài Cũ.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo bài đầu tiên ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classSessions.map((sess) => {
                const isSelectedActive = activeSession?.id === sess.id;
                const totalStudents = currentClass?.students.length || 0;
                const activeRes = sess.results[sess.currentQuestionIndex] || sess.results[0];
                const answeredCount = activeRes ? Object.keys(activeRes.answers).length : 0;
                const percentage = totalStudents > 0 ? Math.round((answeredCount / totalStudents) * 100) : 0;

                return (
                  <div
                    key={sess.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelectedActive
                        ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {sess.subject || 'Toán'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {sess.questions.length} câu
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDeleteSession(sess.id, e)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Xoá phiên kiểm tra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{sess.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{sess.createdAt ? new Date(sess.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay'}</span>
                          <span>•</span>
                          <Users className="w-3 h-3" />
                          <span>{answeredCount}/{totalStudents} HS</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Đã thu bài:</span>
                          <span className="font-bold text-emerald-400">{percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSelectSessionToScan(sess)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Quét Ngay</span>
                      </button>

                      <button
                        onClick={() => handleSelectSessionToViewResults(sess)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Kết quả</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: QUÉT THẺ CAMERA */}
      {subTab === 'SCAN' && (
        <div>
          {activeSession ? (
            <CameraScannerScreen
              session={activeSession}
              currentClass={currentClass}
              onUpdateSession={handleUpdateActiveSession}
              onOpenProjector={() => setIsProjectorOpen(true)}
              onFinishSession={() => setSubTab('RESULTS')}
            />
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-950/50 border border-amber-800/40 flex items-center justify-center text-3xl mx-auto">
                📷
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">Chưa chọn bài kiểm tra nào để quét</h3>
                <p className="text-xs text-slate-400">
                  Vui lòng tạo một bài kiểm tra mới hoặc chọn một bài có sẵn từ danh sách đề để bắt đầu quét đáp án.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo bài kiểm tra mới</span>
                </button>
                <button
                  onClick={() => setSubTab('SESSIONS')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                >
                  <Layers className="w-4 h-4" />
                  <span>Xem danh sách đề</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 4: KẾT QUẢ & VÀO SỔ ĐIỂM */}
      {subTab === 'RESULTS' && (
        <div>
          {activeSession ? (
            <QuizSessionResultsScreen
              session={activeSession}
              classes={classes}
              currentClass={currentClass}
              onUpdateClasses={onUpdateClasses}
              onReopenSession={() => setSubTab('SCAN')}
              onClose={() => setSubTab('SESSIONS')}
              onUpdateHistory={onUpdateHistory}
              history={history}
            />
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-800/40 flex items-center justify-center text-3xl mx-auto">
                📊
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">Chưa có kết quả để hiển thị</h3>
                <p className="text-xs text-slate-400">
                  Chọn một bài kiểm tra từ tab &quot;Đề Kiểm Tra&quot; để xem phân tích, biểu đồ và xuất điểm vào Sổ điểm.
                </p>
              </div>
              <button
                onClick={() => setSubTab('SESSIONS')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow"
              >
                <Layers className="w-4 h-4" />
                <span>Chọn bài kiểm tra</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Tạo đề kiểm tra */}
      <CreateQuizModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        classes={classes}
        currentClass={currentClass}
        onSelectClass={onSelectClass}
        onSessionCreated={handleSessionCreated}
        currentUser={currentUser}
      />

      {/* Chế độ trình chiếu Projector cho cả lớp */}
      {isProjectorOpen && activeSession && (
        <QuizProjectorView
          session={activeSession}
          currentClass={currentClass}
          onClose={() => setIsProjectorOpen(false)}
          onUpdateSession={handleUpdateActiveSession}
        />
      )}

      {/* Modal Nhập PIN Kết Nối Điện Thoại Quét Thẻ */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Kết Nối Điện Thoại Quét Thẻ</h3>
                  <p className="text-xs text-slate-400">Nhập mã PIN hiển thị trên máy chiếu lớp học</p>
                </div>
              </div>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Mã PIN 6 chữ số:
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ví dụ: 492815"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-center text-xl font-mono font-black text-amber-300 tracking-widest focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                </div>
                {pinError && (
                  <p className="text-xs text-rose-400 mt-2 font-medium flex items-center gap-1">
                    <span>⚠️</span> {pinError}
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-slate-400 leading-relaxed">
                <p>
                  💡 <strong>Cách hoạt động:</strong> Mở chế độ trình chiếu trên máy tính lớp học, lấy mã PIN 6 số trên thanh tiêu đề và nhập vào đây. Điện thoại sẽ biến thành camera quét không dây gửi đáp án về máy chiếu theo thời gian thực!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isConnectingPin || pinInput.length < 6}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {isConnectingPin ? 'Đang kết nối...' : 'Kết Nối Quét Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
