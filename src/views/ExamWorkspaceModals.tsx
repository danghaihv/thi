import { AlertTriangle, CheckCircle2, Clock, Sparkles, X } from 'lucide-react';

export function SubmitErrorModal({ submitError, onClose, onRetry }: { submitError: string; onClose: () => void; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-rose-100 bg-rose-50 text-rose-600"><AlertTriangle className="h-8 w-8" /></div>
        <h3 className="mt-5 text-xl font-bold text-slate-950">Không thể nộp bài</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">Phiên làm bài đang gặp gián đoạn. Bạn có thể thử nộp lại hoặc đóng thông báo để kiểm tra trạng thái hiện tại.</p>
        <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-medium text-rose-700">{submitError}</div>
        <div className="mt-6 flex w-full gap-3"><button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Đóng</button><button onClick={onRetry} className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">Thử lại</button></div>
      </div>
    </div>
  );
}

export function ConfirmSubmitModal({ answered, total, onCancel, onSubmit }: { answered: number; total: number; onCancel: () => void; onSubmit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-emerald-100 bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
        <h3 className="mt-5 text-xl font-bold text-slate-950">Xác nhận nộp bài</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">Hãy kiểm tra nhanh số câu đã làm trước khi hoàn tất.</p>
        <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Đã làm</span><span className="font-bold text-indigo-600">{answered} / {total}</span></div>
          <div className="mt-2 flex items-center justify-between text-sm"><span className="text-slate-500">Còn trống</span><span className="font-bold text-slate-700">{total - answered} câu</span></div>
        </div>
        <div className="mt-6 flex w-full gap-3"><button onClick={onCancel} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Làm tiếp</button><button onClick={onSubmit} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">Nộp ngay</button></div>
      </div>
    </div>
  );
}

export function TimeWarningModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel flex w-full max-w-sm flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-rose-100 bg-rose-50 text-rose-600"><Clock className="h-10 w-10 animate-pulse" /></div>
        <h3 className="mt-5 text-2xl font-bold text-slate-950">Sắp hết giờ</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">Bạn chỉ còn dưới 5 phút. Hãy rà soát lại bài làm và chuẩn bị nộp.</p>
        <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-rose-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-rose-700">Đã hiểu, tiếp tục</button>
      </div>
    </div>
  );
}

export function VipSolutionModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel relative flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-amber-100 bg-amber-50 text-amber-600"><Sparkles className="h-8 w-8" /></div>
        <h3 className="mt-5 text-xl font-bold text-slate-950">Đặc quyền Thành viên VIP</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">Tài khoản miễn phí không thể mở đáp án chi tiết. Nâng cấp để xem toàn bộ lời giải.</p>
        <div className="mt-6 flex w-full flex-col gap-2"><button onClick={onUpgrade} className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">Nâng cấp VIP nhận trọn giải chi tiết</button><button onClick={onClose} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Đóng</button></div>
      </div>
    </div>
  );
}
