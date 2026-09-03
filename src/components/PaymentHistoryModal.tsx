import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Search,
  RefreshCw,
  ExternalLink,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { PaymentOrder } from '../types';
import {
  ADMIN_EMAIL,
  getPendingOrdersForAdmin,
  getUserOrders,
  verifyAndActivateOrder,
} from '../services/paymentService';
import { soundEngine } from '../utils/audio';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
  onOpenUpgradeModal?: () => void;
  onSubscriptionUpdated?: () => void;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  onOpenUpgradeModal,
  onSubscriptionUpdated,
}) => {
  const [userOrders, setUserOrders] = useState<PaymentOrder[]>([]);
  const [adminPendingOrders, setAdminPendingOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'MY_ORDERS' | 'ADMIN_APPROVAL'>('MY_ORDERS');
  
  // Admin activation state
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [txIdInputs, setTxIdInputs] = useState<{ [orderId: string]: string }>({});
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    setAdminFeedback(null);
    try {
      const orders = await getUserOrders(userId);
      setUserOrders(orders);

      if (isAdmin) {
        const pending = await getPendingOrdersForAdmin();
        setAdminPendingOrders(pending);
      }
    } catch (err) {
      console.error('Failed to load orders history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadData();
    }
  }, [isOpen, userId, isAdmin]);

  if (!isOpen) return null;

  const handleAdminApprove = async (order: PaymentOrder) => {
    const txId = txIdInputs[order.orderId]?.trim();
    if (!txId) {
      setAdminFeedback({
        type: 'error',
        message: `Vui lòng nhập Mã giao dịch ngân hàng Agribank (SMS/App) cho đơn ${order.orderId}!`,
      });
      return;
    }

    setApprovingOrderId(order.orderId);
    setAdminFeedback(null);

    try {
      const result = await verifyAndActivateOrder(order.orderId, txId, userEmail);
      setAdminFeedback({ type: 'success', message: result.message });
      soundEngine.playVictoryFanfare();
      await loadData();
      if (onSubscriptionUpdated) onSubscriptionUpdated();
    } catch (err: any) {
      console.error('Activation failed:', err);
      setAdminFeedback({ type: 'error', message: err.message || 'Kích hoạt thất bại!' });
    } finally {
      setApprovingOrderId(null);
    }
  };

  const renderStatusBadge = (status: PaymentOrder['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Đã thanh toán (Active)</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Chờ đối soát</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Thất bại</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto text-slate-100 animate-scale-in">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Lịch Sử Đơn Hàng & Giao Dịch</h3>
              <p className="text-xs text-slate-400">Theo dõi trạng thái thanh toán gói CLASSGO PRO</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher if Admin */}
        {isAdmin && (
          <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('MY_ORDERS')}
              className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'MY_ORDERS'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Lịch sử của tôi ({userOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('ADMIN_APPROVAL')}
              className={`pb-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'ADMIN_APPROVAL'
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Duyệt đơn chuyển khoản ({adminPendingOrders.length})</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-4">
          
          {/* Admin Feedback Notice */}
          {adminFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                adminFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
              }`}
            >
              {adminFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              )}
              <span>{adminFeedback.message}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Đang tải lịch sử giao dịch...</span>
            </div>
          ) : activeTab === 'ADMIN_APPROVAL' && isAdmin ? (
            /* Admin Pending Orders Panel */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between">
                <span>Danh sách đơn hàng người dùng đang chờ xác nhận từ tài khoản Agribank:</span>
                <button
                  onClick={loadData}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Làm mới</span>
                </button>
              </div>

              {adminPendingOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Không có đơn hàng nào đang chờ duyệt.
                </div>
              ) : (
                <div className="space-y-3">
                  {adminPendingOrders.map((order) => (
                    <div
                      key={order.orderId}
                      className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-mono font-black text-amber-300">
                            {order.orderId}
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Email: <strong>{order.userEmail}</strong>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Tạo lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-emerald-400">
                            {order.amount.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-[10px] text-slate-400">Thời hạn: 365 ngày</div>
                        </div>
                      </div>

                      {/* Admin Verification Input Form */}
                      <div className="pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nhập mã giao dịch Agribank (VD: FT2609...)"
                          value={txIdInputs[order.orderId] || ''}
                          onChange={(e) =>
                            setTxIdInputs({
                              ...txIdInputs,
                              [order.orderId]: e.target.value,
                            })
                          }
                          className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <button
                          onClick={() => handleAdminApprove(order)}
                          disabled={approvingOrderId === order.orderId}
                          className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors disabled:opacity-50"
                        >
                          {approvingOrderId === order.orderId ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Duyệt & Kích hoạt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* User's Order History List */
            <div className="space-y-3">
              {userOrders.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-xs text-slate-400">Bạn chưa có đơn hàng nào.</p>
                  {onOpenUpgradeModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenUpgradeModal();
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors"
                    >
                      Nâng cấp CLASSGO PRO ngay
                    </button>
                  )}
                </div>
              ) : (
                userOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="p-3.5 sm:p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-indigo-300">
                          {order.orderId}
                        </span>
                        {renderStatusBadge(order.status)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Ngày tạo: {new Date(order.createdAt).toLocaleString('vi-VN')}
                      </div>
                      {order.paidAt && (
                        <div className="text-[11px] text-emerald-400">
                          Kích hoạt lúc: {new Date(order.paidAt).toLocaleString('vi-VN')}
                        </div>
                      )}
                      {order.transactionId && (
                        <div className="text-[10px] font-mono text-slate-400">
                          Mã giao dịch: {order.transactionId}
                        </div>
                      )}
                    </div>

                    <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/50">
                      <div className="text-sm font-black text-amber-300">
                        {order.amount.toLocaleString('vi-VN')} VNĐ
                      </div>
                      <div className="text-[10px] text-slate-400">Thời hạn: 365 ngày</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mọi giao dịch đều được lưu trữ bảo mật trên Firestore</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
