import React from 'react';
import { AlertTriangle, Lock, X } from 'lucide-react';

interface ResponseCardLockConfirmProps {
  open: boolean;
  questionNumber: number;
  capturedCount: number;
  isCloudSession: boolean;
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Deliberate confirmation before closing a response window across devices. */
export function ResponseCardLockConfirm({
  open, questionNumber, capturedCount, isCloudSession, busy, error, onCancel, onConfirm,
}: ResponseCardLockConfirmProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
      role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="response-lock-confirm-title"
        className="w-full max-w-lg space-y-4 rounded-3xl border border-amber-500/60 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3 id="response-lock-confirm-title" className="flex items-center gap-2 text-xl font-extrabold text-white">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-400" />
            Kiểm tra trước khi khóa câu {questionNumber}
          </h3>
          <button type="button" disabled={busy} onClick={onCancel} aria-label="Đóng cảnh báo khóa câu"
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-base leading-relaxed text-slate-100">
          Thiết bị này đang hiển thị <strong className="text-amber-300">{capturedCount} đáp án</strong>.
          {isCloudSession
            ? ' Trước khi công bố, hãy kiểm tra trên điện thoại không còn thông báo “Lưu tạm” hoặc “Ngoại tuyến”.'
            : ' Đây là phiên chỉ lưu cục bộ, chưa có xác nhận từ Firebase.'}
        </p>
        {isCloudSession && (
          <p className="rounded-xl border border-amber-600/50 bg-amber-950/40 p-3 text-sm leading-relaxed text-amber-100">
            ClassGo sẽ đối chiếu đáp án trên máy với Firebase và chỉ khóa sau khi máy chủ chấp nhận.
            Các đáp án còn nằm trên điện thoại ngoại tuyến <strong>không thể tự kiểm tra từ máy tính</strong>.
            Nếu điện thoại chưa gửi hết, hãy chọn “Tiếp tục thu bài”.
          </p>
        )}
        {error && <div role="alert" className="rounded-xl border border-rose-500/50 bg-rose-950/50 p-3 text-sm font-semibold text-rose-200">{error}</div>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={busy} onClick={onCancel}
            className="rounded-xl border border-slate-600 px-4 py-3 text-base font-bold text-white hover:bg-slate-800 disabled:opacity-40">
            Tiếp tục thu bài
          </button>
          <button type="button" disabled={busy || !!error} onClick={onConfirm}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-base font-extrabold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
            <Lock className="h-5 w-5" />{busy ? 'Đang xác nhận Firebase...' : 'Đã kiểm tra – Khóa & công bố'}
          </button>
        </div>
      </div>
    </div>
  );
}
