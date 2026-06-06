import { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, List, Lock, Maximize, Sparkles, X } from 'lucide-react';
import { LatexRenderer } from '../components/LatexRenderer';

export type ExamWorkspacePlayProps = {
  exam: any;
  answers: Record<string, number>;
  currentIndex: number;
  timeLeft: number;
  isSubmitting: boolean;
  showConfirmSubmit: boolean;
  submitError: string | null;
  showTimeWarning: boolean;
  timeWarningDismissed: boolean;
  showMobileNav: boolean;
  fullscreenBypassed: boolean;
  isFullscreen: boolean;
  showVipModalToViewSolution: boolean;
  warnings: number;
  navigate: any;
  handleOptionSelect: (optionIdx: number) => void;
  enterFullscreen: () => void;
  handleSubmit: () => void;
  setSubmitError: Dispatch<SetStateAction<string | null>>;
  setShowConfirmSubmit: Dispatch<SetStateAction<boolean>>;
  setTimeWarningDismissed: Dispatch<SetStateAction<boolean>>;
  setShowMobileNav: Dispatch<SetStateAction<boolean>>;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  setShowVipModalToViewSolution: Dispatch<SetStateAction<boolean>>;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ExamWorkspacePlay({
  exam,
  answers,
  currentIndex,
  timeLeft,
  isSubmitting,
  showConfirmSubmit,
  submitError,
  showTimeWarning,
  timeWarningDismissed,
  showMobileNav,
  fullscreenBypassed,
  isFullscreen,
  showVipModalToViewSolution,  warnings,  navigate,
  handleOptionSelect,
  enterFullscreen,
  handleSubmit,
  setSubmitError,
  setShowConfirmSubmit,
  setTimeWarningDismissed,
  setShowMobileNav,
  setCurrentIndex,
  setShowVipModalToViewSolution,
}: ExamWorkspacePlayProps) {
  const currentQ = exam.questions[currentIndex];

  return (
    <div className="min-h-[100dvh] w-full bg-transparent px-3 py-3 sm:px-4 lg:px-6 lg:py-6 animate-in fade-in duration-300">
      {submitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-rose-100 bg-rose-50 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Không thể nộp bài</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Phiên làm bài đang gặp gián đoạn. Bạn có thể thử nộp lại hoặc đóng thông báo để kiểm tra trạng thái hiện tại.
            </p>
            <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-medium text-rose-700">
              {submitError}
            </div>
            <div className="mt-6 flex w-full gap-3">
              <button onClick={() => setSubmitError(null)} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Đóng</button>
              <button onClick={() => { setSubmitError(null); handleSubmit(); }} className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">Thử lại</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-emerald-100 bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Xác nhận nộp bài</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Hãy kiểm tra nhanh số câu đã làm trước khi hoàn tất.</p>
            <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Đã làm</span>
                <span className="font-bold text-indigo-600">{Object.keys(answers).length} / {exam.questions.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Còn trống</span>
                <span className="font-bold text-slate-700">{exam.questions.length - Object.keys(answers).length} câu</span>
              </div>
            </div>
            <div className="mt-6 flex w-full gap-3">
              <button onClick={() => setShowConfirmSubmit(false)} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Làm tiếp</button>
              <button onClick={() => { setShowConfirmSubmit(false); handleSubmit(); }} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">Nộp ngay</button>
            </div>
          </div>
        </div>
      )}

      {showTimeWarning && !timeWarningDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel flex w-full max-w-sm flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-rose-100 bg-rose-50 text-rose-600">
              <Clock className="h-10 w-10 animate-pulse" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-950">Sắp hết giờ</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Bạn chỉ còn dưới 5 phút. Hãy rà soát lại bài làm và chuẩn bị nộp.</p>
            <button onClick={() => setTimeWarningDismissed(true)} className="mt-6 w-full rounded-2xl bg-rose-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-rose-700">Đã hiểu, tiếp tục</button>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                Câu <span className="text-indigo-600">{(currentIndex + 1).toString().padStart(2, '0')}</span> / {exam.questions.length.toString().padStart(2, '0')}
              </span>
              <div className="flex items-center gap-3">
                {exam.config?.antiCheat && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> Rời trang ({warnings})
                  </span>
                )}
                <div className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-lg font-bold shadow-sm ${timeLeft < 300 ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-800'}`}>
                  <Clock className="h-5 w-5" /> {formatTime(timeLeft)}
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 300 ? 'bg-rose-500' : timeLeft < exam.timeLimit * 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(0, (timeLeft / (exam.timeLimit || 1)) * 100)}%` }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-4xl">
              <div className="prose prose-slate max-w-none text-lg font-medium leading-relaxed text-slate-900 md:text-xl">
                <LatexRenderer content={currentQ.content} />
                {currentQ.imageUrl && (
                  <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <img src={currentQ.imageUrl} alt="Hình ảnh câu hỏi" className="mx-auto max-h-[320px] object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-3">
                {currentQ.options.map((opt: string, idx: number) => {
                  const isSelected = answers[currentQ.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      className={`group flex w-full items-center gap-4 rounded-[1.5rem] border-2 p-4 text-left transition hover:-translate-y-0.5 ${isSelected ? 'border-indigo-500 bg-indigo-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-black transition ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-500 group-hover:border-indigo-300 group-hover:text-indigo-600'}`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className={`flex-1 text-base md:text-lg ${isSelected ? 'font-semibold text-indigo-950' : 'text-slate-700'}`}>
                        <LatexRenderer content={opt} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
              <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Câu trước</span><span className="sm:hidden">Trước</span>
              </button>
              <button onClick={() => setShowMobileNav(true)} className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 lg:hidden">
                <List className="h-4 w-4" /> Bảng câu hỏi
              </button>
              <button onClick={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))} disabled={currentIndex === exam.questions.length - 1} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-30">
                <span className="hidden sm:inline">Câu tiếp</span><span className="sm:hidden">Tiếp</span> <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden w-full shrink-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:flex lg:w-80 lg:flex-col">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Bảng điều hướng</div>
          <div className="mt-5 grid grid-cols-4 gap-2.5">
            {exam.questions.map((q: any, i: number) => {
              const hasAnswered = answers[q.id] !== undefined;
              const isCurrent = i === currentIndex;
              return (
                <button key={q.id} onClick={() => setCurrentIndex(i)} className={`flex h-11 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${isCurrent ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : hasAnswered ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1 border-r border-slate-200 pr-3">
                <div className="text-2xl font-black text-indigo-600">{Object.keys(answers).length}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Đã làm</div>
              </div>
              <div className="text-center flex-1 pl-3">
                <div className="text-2xl font-black text-slate-700">{exam.questions.length - Object.keys(answers).length}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Còn lại</div>
              </div>
            </div>
            <button onClick={() => setShowConfirmSubmit(true)} disabled={isSubmitting} className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
              {isSubmitting ? 'Đang nộp...' : 'Nộp bài thi ngay'}
            </button>
          </div>
        </div>

        {showMobileNav && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileNav(false)}>
            <div className="ml-auto flex h-full w-full max-w-sm flex-col rounded-l-[2rem] border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><List className="h-5 w-5 text-indigo-500" /> Bảng câu hỏi</div>
                <button onClick={() => setShowMobileNav(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2.5 overflow-y-auto">
                {exam.questions.map((q: any, i: number) => {
                  const hasAnswered = answers[q.id] !== undefined;
                  const isCurrent = i === currentIndex;
                  return (
                    <button key={q.id} onClick={() => { setCurrentIndex(i); setShowMobileNav(false); }} className={`flex h-11 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${isCurrent ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : hasAnswered ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto border-t border-slate-200 pt-5">
                <button onClick={() => { setShowMobileNav(false); setShowConfirmSubmit(true); }} disabled={isSubmitting} className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                  {isSubmitting ? 'Đang nộp...' : 'Nộp bài thi ngay'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showVipModalToViewSolution && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel relative flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowVipModalToViewSolution(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-amber-100 bg-amber-50 text-amber-600">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-950">Đặc quyền Thành viên VIP</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Tài khoản miễn phí không thể mở đáp án chi tiết. Nâng cấp để xem toàn bộ lời giải.</p>
              <div className="mt-6 flex w-full flex-col gap-2">
                <button onClick={() => { setShowVipModalToViewSolution(false); navigate('/upgrade'); }} className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">
                  Nâng cấp VIP nhận trọn giải chi tiết
                </button>
                <button onClick={() => setShowVipModalToViewSolution(false)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
