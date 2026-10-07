import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const RELEASE_ID = 'classgo-2026-10-spin-visuals-v1';

export const UpdateNotice: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(`classgo_seen_${RELEASE_ID}`) !== '1') setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const close = () => {
    try { localStorage.setItem(`classgo_seen_${RELEASE_ID}`, '1'); } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-indigo-400/30 bg-slate-900 shadow-2xl">
        <button onClick={close} className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Đóng thông báo">
          <X className="h-5 w-5" />
        </button>
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider"><Sparkles className="h-5 w-5" /> ClassGo vừa cập nhật</div>
          <h2 className="mt-2 text-2xl font-black">Quay tên vui hơn trong lớp học 🎉</h2>
        </div>
        <div className="space-y-3 px-6 py-5 text-sm text-slate-200">
          <p><strong>🎈 Bong bóng</strong> — hiệu ứng chọn tên sinh động.</p>
          <p><strong>🏇 Đua ngựa · 🦆 Đua vịt · 🚀 Tên lửa</strong> — thêm lựa chọn trình diễn khi gọi học sinh.</p>
          <p><strong>👦 Nam · 👧 Nữ</strong> — lọc nhanh đối tượng quay; phần chọn khoảng STT cũng đã gọn hơn.</p>
          <p className="rounded-xl bg-emerald-950/50 px-3 py-2 text-emerald-300">Dữ liệu lớp, điểm và lịch sử của bạn vẫn được giữ nguyên.</p>
          <button onClick={close} className="mt-1 w-full rounded-xl bg-indigo-500 px-4 py-2.5 font-black text-white hover:bg-indigo-400">Khám phá ngay</button>
        </div>
      </div>
    </div>
  );
};
