import React from 'react';
import { AlertTriangle, Crown, Sparkles, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { BANK_CONFIG } from '../services/paymentService';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgradeModal: () => void;
  userEmail?: string;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  onOpenUpgradeModal,
  userEmail,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 text-center text-slate-100 animate-scale-in relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/50 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
          <Crown className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Thời Gian Dùng Thử Đã Kết Thúc
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Tài khoản <span className="font-bold text-amber-300">{userEmail || 'của bạn'}</span> đã hoàn thành 15 ngày trải nghiệm miễn phí CLASSGO.
          </p>
        </div>

        {/* Highlights */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left text-xs text-slate-300 space-y-2">
          <div className="font-bold text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Nâng cấp CLASSGO PRO để tiếp tục:</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-200">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Quay gọi tên học sinh công bằng & hoàn toàn ngẫu nhiên</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Thời khóa biểu, Báo giảng & Sổ theo dõi điểm danh</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Đồng bộ và lưu trữ dữ liệu an toàn trên Firestore Cloud</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Sử dụng trọn vẹn 365 ngày (12 tháng) không giới hạn</span>
            </li>
          </ul>
        </div>

        {/* Price Tag */}
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-2xl sm:text-3xl font-black text-amber-400">
            {BANK_CONFIG.proPrice.toLocaleString('vi-VN')} VNĐ
          </span>
          <span className="text-xs text-slate-400">/ 12 tháng (365 ngày)</span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onClose();
              onOpenUpgradeModal();
            }}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            <span>Nâng cấp CLASSGO PRO ngay</span>
          </button>

          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 underline pt-1"
          >
            Để sau (Xem lại dữ liệu)
          </button>
        </div>

      </div>
    </div>
  );
};
