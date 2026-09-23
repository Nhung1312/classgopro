import React, { useState, useRef, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Settings as SettingsIcon,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Download,
  Upload,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mic,
  Disc,
  Layers,
  LayoutGrid,
  Gift,
  Play,
  Crown,
  CreditCard,
  ShieldCheck,
  History as HistoryIcon,
  Trash2,
  Sliders,
  Hash,
} from 'lucide-react';
import {
  ClassRoom,
  SpinSettings,
  SpinVisualType,
  UserSubscription,
  NameDisplayStyle,
  WheelSizeOption,
} from '../types';
import { exportBackupJSON, importBackupJSON } from '../utils/storage';
import { soundEngine } from '../utils/audio';
import { speechEngine, isVoiceVietnamese } from '../utils/speech';
import { BANK_CONFIG } from '../services/paymentService';
import { ENABLE_TRIAL_LIMIT, TRIAL_DURATION_DAYS } from '../config/subscriptionConfig';

interface SettingsScreenProps {
  settings: SpinSettings;
  onUpdateSettings: (newSettings: SpinSettings) => void;
  classes: ClassRoom[];
  activeClassId: string;
  onResetClassCounts: (classId: string) => void;
  onResetAllClassesCounts: () => void;
  onRestoreDefaultData: () => void;
  onClearAllSampleData?: () => void;
  onImportBackupSuccess: () => void;
  currentUser?: FirebaseUser | null;
  subscription?: UserSubscription;
  onOpenUpgradeModal?: () => void;
  onOpenPaymentHistoryModal?: () => void;
  onOpenAuthModal?: () => void;
  onRestoreSafetyBackup?: () => boolean;
  hasSafetyBackup?: boolean;
}

const TEMPLATE_PRESETS = [
  'Xin mời bạn {name} lên bảng!',
  'Chúc mừng bạn {name}, mời bạn lên bảng kiểm tra bài cũ!',
  'Mời bạn {name} chuẩn bị trả lời câu hỏi!',
  'Bạn {name} đã được chọn!',
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  classes,
  activeClassId,
  onResetClassCounts,
  onResetAllClassesCounts,
  onRestoreDefaultData,
  onClearAllSampleData,
  onImportBackupSuccess,
  currentUser,
  subscription,
  onOpenUpgradeModal,
  onOpenPaymentHistoryModal,
  onOpenAuthModal,
  onRestoreSafetyBackup,
  hasSafetyBackup,
}) => {
  const [showConfirmResetCurrent, setShowConfirmResetCurrent] = useState(false);
  const [showConfirmResetAll, setShowConfirmResetAll] = useState(false);
  const [showConfirmDefault, setShowConfirmDefault] = useState(false);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused' | 'error'>('idle');
  const [speakingText, setSpeakingText] = useState<string>('');
  const [testCustomName, setTestCustomName] = useState<string>('Nguyễn Văn An');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0];

  useEffect(() => {
    // Subscribe to centralized voice updates
    const unsubVoices = speechEngine.subscribeVoices((voices) => {
      setAvailableVoices(voices);
      // Validate saved voiceUri: if it's not a valid Vietnamese voice, auto-reset to empty
      const currentUri = settings.ttsVoiceUri;
      if (currentUri && voices.length > 0) {
        const viList = voices.filter(isVoiceVietnamese);
        const isValid = viList.some((v) => v.voiceURI === currentUri);
        if (!isValid) {
          onUpdateSettings({ ...settings, ttsVoiceUri: '' });
        }
      }
    });

    // Subscribe to speech state updates
    const unsubState = speechEngine.subscribe((state, text) => {
      setSpeechState(state);
      setSpeakingText(text);
    });

    return () => {
      unsubVoices();
      unsubState();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportBackup = () => {
    const json = exportBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClassGo_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Đã xuất file sao lưu ClassGo thành công!');
    soundEngine.playTick(1.2);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJSON(content);
      if (success) {
        onImportBackupSuccess();
        showToast('Khôi phục dữ liệu ClassGo thành công!');
        soundEngine.playVictoryFanfare();
      } else {
        alert('File sao lưu không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  const handleTestSpeech = (nameToTest?: string) => {
    speechEngine.unlock();
    speechEngine.updateConfig({
      enabled: true,
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
      volume: settings.volume,
      template: settings.ttsTemplate,
      voiceUri: settings.ttsVoiceUri,
      announceCount: settings.ttsAnnounceCount,
    });
    speechEngine.testSampleVoice(nameToTest || testCustomName || 'Nguyễn Văn An');
  };

  const viVoices = availableVoices.filter(isVoiceVietnamese);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-indigo-400" />
            <span>CÀI ĐẶT & QUẢN TRỊ DỮ LIỆU</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Cấu hình giọng đọc xướng tên, kiểu quay mặc định, hiệu ứng và bộ nhớ.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* GÓI BẢN QUYỀN & TÀI KHOẢN (CLASSGO PRO) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950/50 border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">GÓI BẢN QUYỀN & TÀI KHOẢN</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950">
                  CLASSGO PRO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentUser ? `Đang đăng nhập: ${currentUser.email}` : 'Chưa đăng nhập'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPaymentHistoryModal && currentUser && (
              <button
                onClick={onOpenPaymentHistoryModal}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <HistoryIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Lịch sử đơn hàng</span>
              </button>
            )}

            {onOpenUpgradeModal && (
              <button
                onClick={onOpenUpgradeModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{subscription?.status === 'ACTIVE' ? 'Gia hạn gói PRO' : 'Nâng cấp PRO (169k)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Subscription Status Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Status Box */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Trạng thái gói</span>
            <div className="mt-1 flex items-center gap-1.5">
              {subscription?.status === 'ACTIVE' ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>ĐANG SỬ DỤNG PRO</span>
                </span>
              ) : subscription?.status === 'TRIAL' || !ENABLE_TRIAL_LIMIT ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>{ENABLE_TRIAL_LIMIT ? `DÙNG THỬ ${TRIAL_DURATION_DAYS} NGÀY` : 'MIỄN PHÍ TOÀN BỘ'}</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>GÓI ĐÃ HẾT HẠN</span>
                </span>
              )}
            </div>
          </div>

          {/* Duration Box */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Thời hạn sử dụng</span>
            <div className="mt-1 text-xs text-slate-200">
              {subscription?.status === 'ACTIVE' && subscription.proEndAt ? (
                <>
                  Hạn dùng: <strong className="text-amber-300">{new Date(subscription.proEndAt).toLocaleDateString('vi-VN')}</strong>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Còn lại: {Math.max(0, Math.ceil((new Date(subscription.proEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} ngày
                  </div>
                </>
              ) : subscription?.status === 'TRIAL' || !ENABLE_TRIAL_LIMIT ? (
                ENABLE_TRIAL_LIMIT && subscription?.trialEndAt ? (
                  <>
                    Hạn dùng thử: <strong className="text-sky-300">{new Date(subscription.trialEndAt).toLocaleDateString('vi-VN')}</strong>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Còn lại: {Math.max(0, Math.ceil((new Date(subscription.trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} ngày
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-300 font-bold">Không giới hạn</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Đang mở miễn phí toàn bộ tính năng
                    </div>
                  </>
                )
              ) : (
                <span className="text-rose-400 text-xs">Vui lòng kích hoạt gói Pro</span>
              )}
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Chi phí & Chu kỳ</span>
            <div className="mt-1">
              <span className="text-sm font-black text-amber-300">{BANK_CONFIG.proPrice.toLocaleString('vi-VN')} VNĐ</span>
              <span className="text-xs text-slate-400"> / 12 tháng</span>
              <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Không giới hạn tính năng & lớp học</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Transfer Info Quick Reference */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Tài khoản MB Bank nhận thanh toán: <strong>{BANK_CONFIG.accountNumber}</strong> ({BANK_CONFIG.accountHolder}) - {BANK_CONFIG.bankName}
            </span>
          </div>
          {onOpenUpgradeModal && (
            <button
              onClick={onOpenUpgradeModal}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
            >
              <span>Quét mã VietQR chuyển khoản</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Text to Speech Settings (Giọng đọc Tiếng Việt) */}
      <div className="bg-slate-800/90 border border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-black uppercase text-indigo-400 tracking-wider">
            <Mic className="w-4 h-4" />
            <span>1. Giọng Đọc Xướng Tên (Text-To-Speech Tiếng Việt)</span>
          </div>

          {/* Master TTS Toggle */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.ttsEnabled}
              onChange={(e) =>
                onUpdateSettings({ ...settings, ttsEnabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <p className="text-xs sm:text-sm text-slate-300">
          Tự động phát âm xướng tên học sinh khi vòng quay kết thúc, giúp lớp học thêm sôi nổi và chuyên nghiệp.
        </p>

        {settings.ttsEnabled && (
          <div className="space-y-4 pt-2 border-t border-slate-700/60 animate-fade-in">
            
            {/* Voice Engine & Voice Selector */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                    <span>🇻🇳 Giọng Đọc Phát Âm Tiếng Việt (Web Speech Engine)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {viVoices.length > 0 ? (
                      <span className="text-emerald-400 font-medium">
                        ✅ Tìm thấy {viVoices.length} giọng đọc Tiếng Việt ({viVoices.map((v) => v.name.replace('Microsoft ', '').replace(' Online (Natural) - Vietnamese (Vietnam)', '')).join(', ')})
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        ⚠️ Chưa tìm thấy giọng đọc tiếng Việt trên thiết bị.
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const list = speechEngine.getVoices();
                    setAvailableVoices(list);
                    showToast('Đã làm mới danh sách giọng đọc từ trình duyệt!');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 font-semibold self-start sm:self-auto transition-colors"
                >
                  🔄 Làm mới giọng
                </button>
              </div>

              {/* Voice Selector: ONLY Vietnamese voices are allowed */}
              {viVoices.length > 0 ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Chọn giọng đọc cụ thể (hoặc để tự động):
                  </label>
                  <select
                    value={settings.ttsVoiceUri || ''}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, ttsVoiceUri: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Tự động ưu tiên giọng Tiếng Việt tự nhiên nhất --</option>
                    <optgroup label="Giọng Tiếng Việt">
                      {viVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          ⭐ {v.name} ({v.lang})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                    <span>⚠️ Thiết bị chưa cài đặt gói giọng nói Tiếng Việt. Trình duyệt sẽ không đọc bằng ngôn ngữ nước ngoài để tránh phát âm sai.</span>
                  </div>

                  {/* Quick Guide Accordion */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/30 text-xs text-slate-300 space-y-2.5">
                    <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <span>💡 2 Cách bật giọng đọc Tiếng Việt cực nhanh:</span>
                    </div>

                    <div className="space-y-2 text-[11px] leading-relaxed text-slate-300 pl-1">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="font-bold text-emerald-400">Cách 1 (Nhanh nhất): Mở app bằng Microsoft Edge</span>
                        <p className="text-slate-400 mt-0.5">
                          Trình duyệt Microsoft Edge có sẵn 2 giọng đọc AI Tiếng Việt chuẩn quốc tế (Hoài My & Nam Minh). Bạn chỉ cần mở ClassGo trên Edge rồi bấm <strong>"🔄 Làm mới giọng"</strong> là dùng được ngay!
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="font-bold text-blue-400">Cách 2: Cài gói giọng nói Tiếng Việt cho Windows</span>
                        <ol className="list-decimal list-inside space-y-1 text-slate-400 mt-1 pl-1">
                          <li>Nhấn phím <strong>Windows + I</strong> để mở <strong>Settings</strong> máy tính.</li>
                          <li>Chọn <strong>Time & Language</strong> → <strong>Language</strong> (Ngôn ngữ).</li>
                          <li>Chọn <strong>Tiếng Việt</strong> → <strong>Options</strong> → Bấm <strong>Download</strong> ở mục <strong>Speech (Giọng nói)</strong>. (Hoặc bấm <em>Add a language</em> tìm Tiếng Việt và tích chọn Speech).</li>
                          <li>Tải xong, quay lại đây bấm <strong>"🔄 Làm mới giọng"</strong>.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Live Voice Test Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/40 space-y-3">
              <div className="text-xs font-black text-indigo-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>THỬ NGHIỆM GIỌNG ĐỌC TRỰC TIẾP:</span>
                </span>
                {speechState === 'speaking' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 animate-pulse bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Đang phát âm...</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:flex-1">
                  <input
                    type="text"
                    value={testCustomName}
                    onChange={(e) => setTestCustomName(e.target.value)}
                    placeholder="Nhập tên học sinh để thử (VD: Nguyễn Văn An)"
                    className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleTestSpeech(testCustomName)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-black shadow-lg shadow-indigo-900/30 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>🔊 Bấm Thử Đọc Tên</span>
                  </button>

                  {speechState === 'speaking' && (
                    <button
                      type="button"
                      onClick={() => speechEngine.stop()}
                      className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
                      title="Dừng phát âm"
                    >
                      Dừng
                    </button>
                  )}
                </div>
              </div>

              {speakingText && speechState === 'speaking' && (
                <div className="text-[11px] text-indigo-200 bg-indigo-950/80 p-2 rounded-lg border border-indigo-500/30 italic">
                  🔊 Đang đọc: "{speakingText}"
                </div>
              )}

              {speechState === 'error' && (
                <div className="text-[11px] text-rose-300 bg-rose-950/80 p-2 rounded-lg border border-rose-500/40">
                  ⚠️ {speakingText || 'Không tìm thấy giọng đọc tiếng Việt trên thiết bị. Trình duyệt đã chặn phát âm sai ngôn ngữ.'}
                </div>
              )}
            </div>

            {/* Template Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Mẫu câu xướng tên:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                {TEMPLATE_PRESETS.map((tmpl) => (
                  <button
                    key={tmpl}
                    onClick={() => onUpdateSettings({ ...settings, ttsTemplate: tmpl })}
                    className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                      settings.ttsTemplate === tmpl
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    "{tmpl}"
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={settings.ttsTemplate}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, ttsTemplate: e.target.value })
                }
                placeholder="Nhập mẫu câu tùy chỉnh (dùng {name} làm vị trí tên)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                *Dùng ký tự <code className="text-amber-300 font-mono">&#123;name&#125;</code> để đại diện cho tên học sinh được chọn.
              </span>
            </div>

            {/* Voice Speed & Announce Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Speed Slider */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Tốc độ đọc (Speed):</span>
                  <span className="text-indigo-400 font-mono">{settings.ttsRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.1"
                  value={settings.ttsRate}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, ttsRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Chậm (0.7x)</span>
                  <span>Chuẩn (1.0x)</span>
                  <span>Nhanh (1.3x)</span>
                </div>
              </div>

              {/* Announce Count Toggle */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-slate-300">
                    Đọc số lần lên bảng
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.ttsAnnounceCount}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, ttsAnnounceCount: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Kèm thêm câu "Đây là lần thứ X bạn lên bảng" sau tên.
                </p>
              </div>
            </div>

            {/* Instructions & Troubleshooting Guide Box */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>💡 HƯỚNG DẪN SỬ DỤNG TÍNH NĂNG ĐỌC TÊN HỌC SINH:</span>
              </div>
              <ul className="space-y-1.5 text-slate-400 list-disc pl-4">
                <li>
                  <strong className="text-slate-200">Tự động xướng tên:</strong> Khi vòng quay dừng lại hoặc thẻ bài mở ra, hệ thống sẽ tự động phát âm đọc tên học sinh theo mẫu câu đã chọn.
                </li>
                <li>
                  <strong className="text-slate-200">Đọc lại bất cứ lúc nào:</strong> Nhấn phím <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-indigo-300 font-mono rounded">V</kbd> trên bàn phím hoặc nút <strong className="text-indigo-300">🔊 Đọc lại</strong> ở màn hình quay để nghe lại.
                </li>
                <li>
                  <strong className="text-slate-200">Kiểm tra âm thanh:</strong> Hãy đảm bảo loa máy tính/máy chiếu đã bật và không bị tắt tiếng (Mute) trên thanh Taskbar hoặc tab trình duyệt.
                </li>
                <li>
                  <strong className="text-slate-200">Trình duyệt khuyên dùng:</strong> Dùng <strong className="text-sky-300">Microsoft Edge</strong> (có sẵn giọng đọc Hoài My cực chuẩn tự nhiên) hoặc <strong className="text-amber-300">Google Chrome / Cốc Cốc</strong>.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 2. Visual Style & Speed Settings */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-amber-400 tracking-wider">
          <Clock className="w-4 h-4" />
          <span>2. Kiểu Quay & Tốc Độ Hoạt Ảnh</span>
        </div>

        {/* Default Visual Style Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            Kiểu quay mặc định khi mở app:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'WHEEL', label: 'Vòng Quay', icon: <Disc className="w-4 h-4 text-amber-400" /> },
              { id: 'SLOT', label: 'Dải Cuộn', icon: <Layers className="w-4 h-4 text-indigo-400" /> },
              { id: 'CARDS', label: 'Lật Thẻ Bài', icon: <LayoutGrid className="w-4 h-4 text-sky-400" /> },
              { id: 'CHEST', label: 'Hộp May Mắn', icon: <Gift className="w-4 h-4 text-emerald-400" /> },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() =>
                  onUpdateSettings({ ...settings, defaultVisualType: v.id as SpinVisualType })
                }
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  settings.defaultVisualType === v.id
                    ? 'bg-slate-900 border-amber-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {v.icon}
                <span className="text-xs font-bold">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wheel Size Selector */}
        <div>
          <label className="block text-slate-300 font-bold mb-2 text-xs flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Kích thước vòng quay (Wheel Size):</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                id: 'STANDARD' as WheelSizeOption,
                label: 'Vừa (380px)',
                desc: 'Phù hợp laptop, màn hình nhỏ',
                badge: 'Gọn gàng',
              },
              {
                id: 'LARGE' as WheelSizeOption,
                label: 'Lớn (460px)',
                desc: 'Đường kính rộng, chữ to rõ nét',
                badge: 'Khuyên dùng',
              },
              {
                id: 'XLARGE' as WheelSizeOption,
                label: 'Cực đại (540px)',
                desc: 'Khổng lồ, tối ưu Máy chiếu & Tivi',
                badge: 'Rõ từ cuối lớp',
              },
            ].map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ ...settings, wheelSizeOption: ws.id });
                  soundEngine.playTick(1.2);
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                  (settings.wheelSizeOption || 'LARGE') === ws.id
                    ? 'bg-sky-950/60 border-sky-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{ws.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      (settings.wheelSizeOption || 'LARGE') === ws.id
                        ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {ws.badge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1">{ws.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name & STT Display Style Selector */}
        <div>
          <label className="block text-slate-300 font-bold mb-2 text-xs flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-amber-400" />
            <span>Kiểu hiển thị tên & STT học sinh khi quay:</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                id: 'FULL_NAME' as NameDisplayStyle,
                title: 'Họ và tên đầy đủ',
                example: 'Nguyễn Văn An',
                desc: 'Hiển thị trọn vẹn họ tên theo danh sách lớp',
              },
              {
                id: 'STT_NAME' as NameDisplayStyle,
                title: 'STT + Tên học sinh',
                example: '01. Nguyễn Văn An',
                desc: 'Kèm số thứ tự sổ điểm, dễ đối chiếu',
              },
              {
                id: 'ONLY_STT' as NameDisplayStyle,
                title: 'Chỉ hiện STT (Bí mật tên)',
                example: 'STT 01',
                desc: 'Vòng quay chỉ hiện số, tăng kịch tính và tò mò',
              },
              {
                id: 'FIRST_NAME_ONLY' as NameDisplayStyle,
                title: 'Tên gọi rút gọn (Không đệm)',
                example: 'An',
                desc: 'Chữ to tối đa, học sinh dễ nhận biết nhanh',
              },
              {
                id: 'CODE_NAME' as NameDisplayStyle,
                title: 'Tên + Mã học sinh',
                example: 'Nguyễn Văn An (HS01)',
                desc: 'Kèm mã định danh hoặc số hiệu riêng',
              },
            ].map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ ...settings, nameDisplayStyle: style.id });
                  soundEngine.playTick(1.2);
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                  (settings.nameDisplayStyle || 'FULL_NAME') === style.id
                    ? 'bg-amber-950/50 border-amber-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{style.title}</span>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-amber-500/30">
                    {style.example}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1">{style.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Mode Selector (Optimization #3) */}
        <div>
          <label className="block text-slate-300 font-bold mb-2 text-xs">
            🎨 Giao diện & Độ tương phản (Tối ưu cho Máy chiếu/Tivi lớp học):
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: '🌙 Giao diện Tối', desc: 'Dịu mắt, chuẩn Gaming' },
              { id: 'light', label: '☀️ Giao diện Sáng', desc: 'Dễ nhìn ban ngày' },
              { id: 'projector', label: '📺 Máy Chiếu/TV', desc: 'Độ tương phản cao' },
            ].map((th) => (
              <button
                key={th.id}
                onClick={() =>
                  onUpdateSettings({ ...settings, themeMode: th.id as any })
                }
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  (settings.themeMode || 'dark') === th.id
                    ? 'bg-indigo-950/70 border-indigo-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold">{th.label}</span>
                <span className="text-[10px] text-slate-500">{th.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration Selector */}
        <div>
          <label className="block text-slate-300 font-bold mb-2 text-xs">
            Thời gian chạy hoạt ảnh quay tên:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '⚡ Nhanh (2.5 giây)', val: 2500 },
              { label: '🎯 Tiêu chuẩn (3.8 giây)', val: 3800 },
              { label: '🔥 Kịch tính (5.5 giây)', val: 5500 },
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => onUpdateSettings({ ...settings, spinDuration: item.val })}
                className={`py-2 px-2.5 rounded-xl font-bold border text-xs transition-all ${
                  settings.spinDuration === item.val
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sound, BGM & Confetti Toggles */}
        <div className="space-y-4 pt-2 border-t border-slate-700/60">
          {/* Suspense BGM Style Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">
                  🎵 Nhạc Nền Hồi Hộp Khi Đang Quay (Suspense BGM)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.startBGM(settings.bgmStyle || 'SUSPENSE_GAME', (settings.bgmVolume || 0.4) * 0.7);
                  setTimeout(() => soundEngine.stopBGM(), 3000);
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Nghe thử 3s</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'SUSPENSE_GAME', label: '💓 Hồi Hộp Kịch Tính', desc: 'Nhịp tim dồn dập' },
                { id: 'DRUMROLL', label: '🥁 Hồi Trống Dồn', desc: 'Trống rung lễ hội' },
                { id: 'CYBER', label: '⚡ Điện Tử Kỳ Ảo', desc: 'Synth phiêu lưu' },
                { id: 'OFF', label: '🔇 Không Nhạc Nền', desc: 'Chỉ hiệu ứng tick' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      bgmStyle: style.id as any,
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    (settings.bgmStyle || 'SUSPENSE_GAME') === style.id
                      ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                      : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold">{style.label}</span>
                  <span className="text-[10px] text-slate-500">{style.desc}</span>
                </button>
              ))}
            </div>

            {/* BGM Volume Slider */}
            {(settings.bgmStyle || 'SUSPENSE_GAME') !== 'OFF' && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                  Âm lượng nhạc nền: {Math.round((settings.bgmVolume ?? 0.4) * 100)}%
                </span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={settings.bgmVolume ?? 0.4}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      bgmVolume: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Default Pick Count Multi-Pick */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">
                👥 Số lượng học sinh gọi mỗi lần (Mặc định):
              </span>
              <span className="text-[11px] text-slate-400">
                Cho phép gọi đồng thời 1, 2, 3... học sinh lên bảng cùng lúc.
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      defaultPickCount: cnt,
                    })
                  }
                  className={`w-9 h-9 rounded-xl font-black text-sm border transition-all ${
                    (settings.defaultPickCount || 1) === cnt
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Confetti Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer">
              <span className="text-slate-200 font-semibold flex items-center gap-2 text-xs">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                Âm thanh hiệu ứng (Tick, Fanfare)
              </span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  onUpdateSettings({ ...settings, soundEnabled: val });
                  soundEngine.setEnabled(val);
                }}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer">
              <span className="text-slate-200 font-semibold flex items-center gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Pháo hoa chúc mừng (Confetti)
              </span>
              <input
                type="checkbox"
                checked={settings.confettiEnabled}
                onChange={(e) => onUpdateSettings({ ...settings, confettiEnabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 3. Reset Counts Section */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-amber-400 tracking-wider">
          <RotateCcw className="w-4 h-4" />
          <span>3. Reset Số Lần Lên Bảng</span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300">
          Khi bắt đầu một vòng kiểm tra mới hoặc một học kỳ mới, bạn có thể đặt lại số lần lên bảng của học sinh về 0.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Reset Current Class */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Reset lớp hiện tại ({activeClass?.name})</h3>
              <p className="text-xs text-slate-400 mt-1">
                Đặt lại số lần lên bảng của tất cả {activeClass?.students.length || 0} học sinh trong lớp {activeClass?.name} về 0.
              </p>
            </div>
            <button
              onClick={() => setShowConfirmResetCurrent(true)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors w-full flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Lớp {activeClass?.name}</span>
            </button>
          </div>

          {/* Reset All Classes */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-rose-300">Reset toàn bộ ({classes.length} lớp)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Đặt lại số lần lên bảng của tất cả học sinh ở mọi lớp về 0.
              </p>
            </div>
            <button
              onClick={() => setShowConfirmResetAll(true)}
              className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-bold transition-colors w-full flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Tất Cả Các Lớp</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Backup & Restore */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-emerald-400 tracking-wider">
          <Download className="w-4 h-4" />
          <span>4. Sao Lưu & Phục Hồi Dữ Liệu</span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300">
          Dữ liệu được lưu an toàn trực tiếp trên trình duyệt của bạn (không mất khi đóng web). Bạn có thể xuất file sao lưu để chuyển sang máy tính khác hoặc lưu dự phòng.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Xuất File Sao Lưu (.json)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportBackup}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Nhập Phục Hồi Từ File (.json)</span>
          </button>

          {onRestoreSafetyBackup && hasSafetyBackup && (
            <button
              onClick={() => {
                const ok = onRestoreSafetyBackup();
                if (ok) {
                  showToast('Đã khôi phục thành công toàn bộ dữ liệu từ bản sao lưu an toàn tự động!');
                  soundEngine.playVictoryFanfare();
                } else {
                  showToast('Không tìm thấy bản sao lưu an toàn tự động.');
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold transition-all shadow-sm"
              title="Khôi phục lại phiên làm việc trước khi đồng bộ tài khoản"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Khôi phục bản lưu tự động gần nhất</span>
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto flex-wrap">
            <button
              onClick={() => setShowConfirmDefault(true)}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Khôi phục dữ liệu mẫu ban đầu
            </button>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <button
              onClick={() => setShowConfirmClearAll(true)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ dữ liệu mẫu (Tạo lớp mới trống)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Confirm Reset Current */}
      {showConfirmResetCurrent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-white">Xác nhận Reset Lớp {activeClass?.name}</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Bạn có chắc chắn muốn đặt lại số lần lên bảng của toàn bộ học sinh lớp <strong>{activeClass?.name}</strong> về <strong>0 lần</strong> không?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmResetCurrent(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onResetClassCounts(activeClass.id);
                  setShowConfirmResetCurrent(false);
                  showToast(`Đã reset số lần lên bảng của lớp ${activeClass.name} về 0!`);
                  soundEngine.playTick(1.4);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
              >
                Xác nhận Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Reset All */}
      {showConfirmResetAll && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-rose-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-black text-white">Xác nhận Reset Toàn Bộ Lớp</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Hành động này sẽ đặt lại số lần lên bảng của tất cả học sinh trong <strong>{classes.length} lớp</strong> về 0. Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmResetAll(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onResetAllClassesCounts();
                  setShowConfirmResetAll(false);
                  showToast('Đã reset số lần lên bảng của toàn bộ các lớp về 0!');
                  soundEngine.playTick(1.4);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Đồng ý Reset Tất Cả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Restore Default Data */}
      {showConfirmDefault && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-white">Khôi Phục Dữ Liệu Mẫu?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Thao tác này sẽ xóa tất cả lớp và học sinh hiện tại và nạp lại các lớp học mẫu mặc định (7A1, 7A2, 8A1).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDefault(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onRestoreDefaultData();
                  setShowConfirmDefault(false);
                  showToast('Đã khôi phục dữ liệu mẫu ban đầu!');
                  soundEngine.playVictoryFanfare();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Khôi phục mẫu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Clear All Sample Data */}
      {showConfirmClearAll && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-rose-600/50 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-black text-white">Xóa Toàn Bộ Dữ Liệu Mẫu?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Thao tác này sẽ xóa sạch tất cả các lớp mẫu (7A1, 7A2, 8A1) và tạo sẵn một lớp mới hoàn toàn trống để Thầy/Cô bắt đầu nhập danh sách học sinh của riêng mình.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmClearAll(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (onClearAllSampleData) {
                    onClearAllSampleData();
                  } else {
                    onRestoreDefaultData();
                  }
                  setShowConfirmClearAll(false);
                  showToast('Đã xóa sạch dữ liệu mẫu và tạo lớp mới trống!');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Đồng ý xóa dữ liệu mẫu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
