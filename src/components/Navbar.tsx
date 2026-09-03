import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  Users,
  FileSpreadsheet,
  BarChart3,
  History,
  Settings,
  ChevronDown,
  Scale,
  Dices,
  Plus,
  Calendar,
  GraduationCap,
  BookOpen,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
  User as UserIcon,
  RefreshCw,
  Crown,
  CreditCard,
  AlertTriangle,
  History as HistoryIcon,
} from 'lucide-react';
import { AppTab, ClassRoom, SelectionMode, UserSubscription } from '../types';
import { soundEngine } from '../utils/audio';
import { ClassGoLogo } from './ClassGoLogo';
import { ADMIN_EMAIL } from '../services/paymentService';

interface NavbarProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  classes: ClassRoom[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  selectionMode: SelectionMode;
  onToggleSelectionMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenPresentation: () => void;
  onAddNewClass: () => void;
  currentUser: FirebaseUser | null;
  subscription?: UserSubscription;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  isSyncingCloud: boolean;
  onSyncCloudNow?: () => void;
  onOpenUpgradeModal: () => void;
  onOpenPaymentHistoryModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  classes,
  activeClassId,
  onSelectClass,
  selectionMode,
  onToggleSelectionMode,
  soundEnabled,
  onToggleSound,
  onOpenPresentation,
  onAddNewClass,
  currentUser,
  subscription,
  onOpenAuthModal,
  onSignOut,
  isSyncingCloud,
  onSyncCloudNow,
  onOpenUpgradeModal,
  onOpenPaymentHistoryModal,
}) => {
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0];

  const nowMs = Date.now();
  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  let remainingDays = 0;
  let isExpiringSoon = false;

  if (subscription) {
    if (subscription.status === 'ACTIVE' && subscription.proEndAt) {
      const endMs = new Date(subscription.proEndAt).getTime();
      remainingDays = Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)));
      isExpiringSoon = remainingDays <= 7 && remainingDays > 0;
    } else if (subscription.status === 'TRIAL' && subscription.trialEndAt) {
      const endMs = new Date(subscription.trialEndAt).getTime();
      remainingDays = Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)));
      isExpiringSoon = remainingDays <= 3 && remainingDays > 0;
    }
  }

  const tabs: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'SPIN', label: 'Quay Tên', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'TIMETABLE', label: 'TKB & Báo Giảng', icon: <Calendar className="w-4 h-4 text-sky-400" /> },
    { id: 'GRADEBOOK', label: 'Sổ Điểm GVBM', icon: <GraduationCap className="w-4 h-4 text-emerald-400" /> },
    { id: 'CLASSES', label: 'Quản Lý Lớp', icon: <Users className="w-4 h-4" /> },
    { id: 'IMPORT', label: 'Nhập Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'STATS', label: 'Thống Kê', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'HISTORY', label: 'Lịch Sử', icon: <History className="w-4 h-4" /> },
    { id: 'SETTINGS', label: 'Cài Đặt', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Brand & Class Switcher */}
        <div className="flex items-center justify-between gap-3">
          <div
            id="brand-logo"
            onClick={() => setCurrentTab('SPIN')}
            className="cursor-pointer group"
            title="ClassGo - Interactive tools for teachers"
          >
            <ClassGoLogo size="md" />
          </div>

          {/* Quick Class Dropdown */}
          <div className="relative">
            <button
              id="class-selector-btn"
              onClick={() => setClassDropdownOpen(!classDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold transition-colors shadow-sm"
              title="Nhấn để đổi lớp nhanh"
            >
              <span className="text-indigo-400">📚</span>
              <span>LỚP:</span>
              <span className="font-extrabold text-amber-300">{activeClass ? activeClass.name : 'Chưa chọn'}</span>
              <span className="text-[11px] text-slate-400 font-normal">({activeClass?.students.length || 0} HS)</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${classDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {classDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setClassDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 divide-y divide-slate-700/50">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                    Danh sách lớp học ({classes.length})
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          onSelectClass(cls.id);
                          setClassDropdownOpen(false);
                          soundEngine.playTick(1.2);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-700/60 transition-colors ${
                          cls.id === activeClassId ? 'bg-indigo-600/20 text-indigo-300 font-bold' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>Lớp {cls.name}</span>
                          {cls.subject && (
                            <span className="text-[11px] text-slate-400 font-normal">({cls.subject})</span>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 font-medium">
                          {cls.students.length} HS
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setClassDropdownOpen(false);
                        onAddNewClass();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm lớp mới</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2">
          {/* Algorithm Mode Switcher */}
          <button
            id="toggle-mode-btn"
            onClick={() => {
              onToggleSelectionMode();
              soundEngine.playTick(selectionMode === 'FAIR' ? 0.9 : 1.3);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              selectionMode === 'FAIR'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
            }`}
            title="Nhấn để đổi thuật toán chọn"
          >
            {selectionMode === 'FAIR' ? (
              <>
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Chế độ:</span>
                <span>⚖️ CÔNG BẰNG</span>
              </>
            ) : (
              <>
                <Dices className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Chế độ:</span>
                <span>🎲 HOÀN TOÀN</span>
              </>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
            }`}
            title={soundEnabled ? 'Đang bật âm thanh' : 'Đang tắt âm thanh'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Subscription Status Badge */}
          {currentUser ? (
            subscription?.status === 'ACTIVE' ? (
              <button
                id="pro-badge-btn"
                onClick={onOpenUpgradeModal}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  isExpiringSoon
                    ? 'bg-amber-950/80 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/10 border-amber-500/40 text-amber-300 hover:brightness-110 shadow-sm'
                }`}
                title={`CLASSGO PRO còn ${remainingDays} ngày (Hết hạn: ${subscription.proEndAt ? new Date(subscription.proEndAt).toLocaleDateString('vi-VN') : ''}). Bấm để gia hạn.`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">CLASSGO</span>
                <span>PRO: {remainingDays}N</span>
              </button>
            ) : subscription?.status === 'TRIAL' ? (
              <button
                id="trial-badge-btn"
                onClick={onOpenUpgradeModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/60 border border-sky-500/40 text-sky-300 text-xs font-bold hover:bg-sky-900/60 transition-all shadow-sm"
                title={`Đang dùng thử 15 ngày. Còn ${remainingDays} ngày. Bấm để nâng cấp PRO!`}
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Dùng thử:</span>
                <span>{remainingDays} ngày</span>
              </button>
            ) : (
              <button
                id="expired-badge-btn"
                onClick={onOpenUpgradeModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 border border-rose-400 text-white text-xs font-black transition-all shadow-md animate-pulse"
                title="Gói dùng thử/Pro đã hết hạn. Bấm để nâng cấp ngay!"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
                <span>Hết hạn - Nâng cấp Pro</span>
              </button>
            )
          ) : (
            <button
              onClick={onOpenUpgradeModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all"
              title="ClassGo Pro: 169.000 VNĐ / 12 tháng. Dùng thử 15 ngày miễn phí!"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Gói Pro 169k/năm</span>
            </button>
          )}

          {/* User & Cloud Sync Section */}
          {currentUser ? (
            <div className="relative">
              <button
                id="user-profile-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 hover:bg-indigo-900/60 text-indigo-300 text-xs font-medium transition-all"
                title={`Đang đăng nhập: ${currentUser.email}`}
              >
                {isSyncingCloud ? (
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                ) : (
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="max-w-[80px] sm:max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-indigo-400" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2.5 z-50 animate-fadeIn space-y-2">
                    <div className="px-2.5 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white truncate">
                        {currentUser.displayName || 'Giáo viên'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                        <Cloud className="w-3 h-3" />
                        <span>Đã kích hoạt Firestore Cloud</span>
                      </div>
                    </div>

                    {/* Subscription Info Card in Dropdown */}
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Gói hiện tại</span>
                        {subscription?.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Crown className="w-3 h-3" /> CLASSGO PRO
                          </span>
                        ) : subscription?.status === 'TRIAL' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> DÙNG THỬ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            ĐÃ HẾT HẠN
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-300">
                        {subscription?.status === 'ACTIVE' ? (
                          <>
                            Hạn dùng: <strong>{subscription.proEndAt ? new Date(subscription.proEndAt).toLocaleDateString('vi-VN') : ''}</strong> ({remainingDays} ngày)
                          </>
                        ) : subscription?.status === 'TRIAL' ? (
                          <>
                            Hạn dùng thử: <strong>{subscription.trialEndAt ? new Date(subscription.trialEndAt).toLocaleDateString('vi-VN') : ''}</strong> ({remainingDays} ngày)
                          </>
                        ) : (
                          <span className="text-rose-400 font-bold">Cần nâng cấp để tiếp tục sử dụng</span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenUpgradeModal();
                        }}
                        className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition-all shadow"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>{subscription?.status === 'ACTIVE' ? 'Gia hạn gói PRO' : 'Nâng cấp CLASSGO PRO'}</span>
                      </button>
                    </div>

                    {/* Order History Button */}
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenPaymentHistoryModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <HistoryIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Lịch sử đơn hàng & Thanh toán</span>
                    </button>

                    {/* Admin Approval Option */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenPaymentHistoryModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors font-bold"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Duyệt đơn chuyển khoản (Admin)</span>
                      </button>
                    )}

                    {onSyncCloudNow && (
                      <button
                        onClick={() => {
                          onSyncCloudNow();
                          setUserDropdownOpen(false);
                        }}
                        disabled={isSyncingCloud}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                        <span>Đồng bộ Cloud ngay</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border-t border-slate-800 pt-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              id="login-btn"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
              title="Đăng nhập để đồng bộ dữ liệu lớp học lên Cloud"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Fullscreen Presentation Mode Button */}
          <button
            id="presentation-mode-btn"
            onClick={onOpenPresentation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all hover:scale-102"
            title="Chế độ chiếu máy chiếu cho cả lớp (Phím F)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>⛶ TRÌNH CHIẾU</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 overflow-x-auto no-scrollbar border-t border-slate-800/80">
        <nav className="flex items-center gap-1 sm:gap-2 py-1.5 min-w-max">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id.toLowerCase()}`}
                onClick={() => {
                  setCurrentTab(tab.id);
                  soundEngine.playTick(1.0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
