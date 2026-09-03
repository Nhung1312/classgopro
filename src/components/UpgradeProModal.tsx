import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Copy,
  Clock,
  ShieldCheck,
  QrCode,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Info,
  Calendar,
  Zap,
} from 'lucide-react';
import { PaymentOrder, UserSubscription } from '../types';
import {
  BANK_CONFIG,
  createPaymentOrder,
  getVietQRUrl,
  subscribeToOrder,
} from '../services/paymentService';
import { soundEngine } from '../utils/audio';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
  currentSubscription?: UserSubscription;
  onOpenAuthModal?: () => void;
  onPaymentSuccess?: () => void;
}

export const UpgradeProModal: React.FC<UpgradeProModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentSubscription,
  onOpenAuthModal,
  onPaymentSuccess,
}) => {
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [hasClickedPaid, setHasClickedPaid] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState<boolean>(false);

  // When modal opens and user is logged in, automatically create or reuse pending order
  useEffect(() => {
    if (!isOpen || !userId || !userEmail) return;

    let isMounted = true;

    async function initOrder() {
      setIsCreatingOrder(true);
      try {
        const order = await createPaymentOrder(userId!, userEmail!);
        if (isMounted) {
          setCurrentOrder(order);
          setHasClickedPaid(false);
        }
      } catch (err) {
        console.error('Failed to create order:', err);
      } finally {
        if (isMounted) setIsCreatingOrder(false);
      }
    }

    initOrder();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, userEmail]);

  // Subscribe to real-time status of current order
  useEffect(() => {
    if (!currentOrder) return;

    const unsubscribe = subscribeToOrder(currentOrder.orderId, (updatedOrder) => {
      if (!updatedOrder) return;
      setCurrentOrder(updatedOrder);

      if (updatedOrder.status === 'PAID') {
        soundEngine.playVictoryFanfare();
        if (onPaymentSuccess) onPaymentSuccess();
      }
    });

    return () => unsubscribe();
  }, [currentOrder?.orderId, onPaymentSuccess]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    soundEngine.playTick(1.2);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleCreateNewOrder = async () => {
    if (!userId || !userEmail) return;
    setIsCreatingOrder(true);
    try {
      const order = await createPaymentOrder(userId, userEmail);
      setCurrentOrder(order);
      setHasClickedPaid(false);
      soundEngine.playTick(1.0);
    } catch (err) {
      console.error('Error creating new order:', err);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const formattedPrice = BANK_CONFIG.proPrice.toLocaleString('vi-VN') + ' VNĐ';
  const qrUrl = currentOrder ? getVietQRUrl(currentOrder.orderId, currentOrder.amount) : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-auto text-slate-100 animate-scale-in">
        
        {/* Modal Header */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-wide text-white">Nâng Cấp CLASSGO PRO</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950">
                  12 THÁNG
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Mở khóa không giới hạn tính năng & lưu trữ an toàn trên đám mây
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto no-scrollbar">

          {/* Pricing Highlight */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/80 via-slate-800/90 to-purple-950/70 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Gói bản quyền giáo viên</span>
              <h4 className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{formattedPrice} <span className="text-xs font-normal text-slate-300">/ 365 ngày</span></h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Thời hạn trọn vẹn 12 tháng kể từ ngày kích hoạt (Cộng dồn nếu đang còn hạn)
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Chính chủ bảo đảm</span>
            </div>
          </div>

          {/* Not logged in warning */}
          {!userId && (
            <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>Bạn cần đăng nhập tài khoản trước để hệ thống gán gói PRO vào đúng tài khoản của bạn.</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAuthModal) onOpenAuthModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold whitespace-nowrap text-xs shadow"
              >
                Đăng nhập ngay
              </button>
            </div>
          )}

          {/* Order Paid Celebration */}
          {currentOrder?.status === 'PAID' ? (
            <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-center space-y-3 animate-scale-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-black text-emerald-300">Thanh Toán Đã Được Xác Nhận!</h4>
              <p className="text-sm text-slate-200">
                Tài khoản <strong>{userEmail}</strong> đã được kích hoạt thành công <strong>CLASSGO PRO</strong>.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
                >
                  Bắt đầu trải nghiệm ngay 🚀
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Payment Steps Guide */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>5 Bước kích hoạt CLASSGO PRO:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed pl-1">
                  <li>Mở ứng dụng ngân hàng và <strong>Quét mã QR</strong> bên dưới.</li>
                  <li>Chuyển đúng số tiền <strong>{formattedPrice}</strong>.</li>
                  <li>Nội dung chuyển khoản phải chứa đúng <strong>Mã đơn hàng</strong> bên dưới.</li>
                  <li>Bấm nút <strong>"Đã thanh toán"</strong> và chờ hệ thống đối soát giao dịch.</li>
                  <li>Sau khi hệ thống xác nhận thanh toán, tài khoản sẽ được kích hoạt <strong>CLASSGO PRO</strong>.</li>
                </ol>
              </div>

              {/* VietQR & Transfer Info Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white text-slate-900 shadow-md">
                  <span className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" /> Quét mã VietQR Agribank
                  </span>
                  
                  {isCreatingOrder || !qrUrl ? (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>Đang tạo mã VietQR...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={qrUrl}
                        alt="VietQR Chuyển khoản Agribank"
                        className="w-48 h-48 object-contain rounded-lg shadow-sm"
                        onLoad={() => setQrLoaded(true)}
                      />
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 mt-1 text-center font-medium">
                    Tự động điền số tài khoản, số tiền và nội dung
                  </span>
                </div>

                {/* Bank Account Details */}
                <div className="space-y-2.5 text-xs">
                  {/* Bank Name */}
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Ngân hàng</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">{BANK_CONFIG.bankName} (Ngân hàng Nông Nghiệp)</div>
                  </div>

                  {/* Account Holder */}
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Chủ tài khoản</div>
                    <div className="text-sm font-extrabold text-amber-300 mt-0.5">{BANK_CONFIG.accountHolder}</div>
                  </div>

                  {/* Account Number with Copy */}
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Số tài khoản</div>
                      <div className="text-sm font-mono font-black text-sky-400 tracking-wider mt-0.5">
                        {BANK_CONFIG.accountNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(BANK_CONFIG.accountNumber, 'accNumber')}
                      className="px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedField === 'accNumber' ? 'Đã chép!' : 'Sao chép'}</span>
                    </button>
                  </div>

                  {/* Amount with Copy */}
                  <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Số tiền</div>
                      <div className="text-sm font-black text-emerald-400 mt-0.5">{formattedPrice}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(String(BANK_CONFIG.proPrice), 'amount')}
                      className="px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedField === 'amount' ? 'Đã chép!' : 'Sao chép'}</span>
                    </button>
                  </div>

                  {/* Order ID / Transfer Memo */}
                  <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-indigo-300">Nội dung chuyển khoản (Bắt buộc)</div>
                      <div className="text-sm font-mono font-black text-amber-300 tracking-wider mt-0.5">
                        {currentOrder?.orderId || 'Đang tạo...'}
                      </div>
                    </div>
                    {currentOrder && (
                      <button
                        onClick={() => copyToClipboard(currentOrder.orderId, 'orderId')}
                        className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedField === 'orderId' ? 'Đã chép!' : 'Sao chép'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Notice after clicking "Đã thanh toán" */}
              {hasClickedPaid && (
                <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-xs text-sky-200 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-sky-300">
                    <Clock className="w-4 h-4 text-sky-400 animate-spin" />
                    <span>Đang chờ đối soát giao dịch ngân hàng...</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Yêu cầu của bạn với mã đơn <strong>{currentOrder?.orderId}</strong> đã được ghi nhận. 
                    Hệ thống/Quản trị viên đang kiểm tra giao dịch chuyển khoản tới tài khoản Agribank. 
                    Gói Pro sẽ <strong>tự động mở khóa ngay lập tức</strong> mà không cần tải lại trang.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  onClick={handleCreateNewOrder}
                  disabled={isCreatingOrder}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCreatingOrder ? 'animate-spin' : ''}`} />
                  <span>Tạo mã đơn khác</span>
                </button>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Đóng
                  </button>

                  <button
                    onClick={() => {
                      setHasClickedPaid(true);
                      soundEngine.playTick(1.3);
                    }}
                    disabled={!currentOrder || isCreatingOrder}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã thanh toán</span>
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
