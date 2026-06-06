import { ArrowRight, CheckCircle2, GraduationCap, Sparkles, X } from 'lucide-react';
import { LatexRenderer } from '../components/LatexRenderer';

export function ExamWorkspaceResult({
  result,
  isGood,
  finalScore,
  finalScoreNum,
  warnings,
  exam,
  currentUser,
  onGoHome,
  onOpenDetails,
  onCloseDetails,
  showDetailedResult,
  recommendedExams,
  loadingRecommendations,
  onNavigateToExam,
}: {
  result: any;
  isGood: boolean;
  finalScore: string;
  finalScoreNum: number;
  warnings: number;
  exam: any;
  currentUser: any;
  onGoHome: () => void;
  onOpenDetails: () => void;
  onCloseDetails: () => void;
  showDetailedResult: boolean;
  recommendedExams: any[];
  loadingRecommendations: boolean;
  onNavigateToExam: (examId: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 animate-in fade-in zoom-in-95 duration-500 px-4 py-6 lg:py-10">
      <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
        {warnings > 0 && exam.config?.antiCheat && (
          <div className="absolute right-6 top-6 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
            {warnings} lần rời trang
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành
            </div>
            <h2 className="section-title mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">Kết quả bài thi</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {result.showResultAfter ? 'Bạn có thể xem điểm tổng quan ngay bên dưới và mở chi tiết bài làm nếu có quyền.' : 'Bài thi đã được nộp an toàn. Kết quả đang được ẩn theo cấu hình của giáo viên.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={onGoHome} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">
                Về trang chủ
              </button>
              {result.showResultAfter && (
                <button onClick={onOpenDetails} className="rounded-2xl border border-indigo-200 bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700">
                  Xem đáp án chi tiết
                </button>
              )}
            </div>
          </div>

          <div className={`rounded-[2rem] border p-6 shadow-sm ${isGood ? 'border-emerald-100 bg-emerald-50/70' : 'border-indigo-100 bg-indigo-50/70'}`}>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Điểm số</div>
            <div className="mt-3 flex items-end gap-2">
              <div className="text-5xl font-black tracking-tight text-slate-950">{finalScore}</div>
              <div className="pb-1 text-2xl font-semibold text-slate-400">/{result.examTotalScore}</div>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">
              {isGood ? 'Kết quả rất tốt. Tiếp tục giữ nhịp luyện tập để nâng độ ổn định.' : 'Chưa đạt ngưỡng cao, nhưng đã có dữ liệu đủ để xem lại từng câu sai và cải thiện.'}
            </p>
            {!result.showResultAfter ? (
              <div className="mt-5 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600">
                Giáo viên đang ẩn điểm sau khi nộp bài.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {recommendedExams && (
        <div className="glass-panel space-y-6 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-950 md:text-xl">Đề xuất ôn tập tiếp theo</h3>
            </div>
            <Sparkles className="h-5 w-5 text-indigo-500" />
          </div>

          {loadingRecommendations ? (
            <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-sm font-medium text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
              Đang tìm đề phù hợp...
            </div>
          ) : recommendedExams.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {recommendedExams.map((recExam) => (
                <button
                  key={recExam.id}
                  className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                  onClick={() => onNavigateToExam(recExam.id)}
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">Cùng khối lớp</span>
                  </div>
                  <h4 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-indigo-700">
                    {recExam.title}
                  </h4>
                  <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {recExam.grade === 5 ? 'Thi vào lớp 6' : `Lớp ${recExam.grade}`} • {recExam.questions?.length || 0} câu
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-indigo-600">
                    <span>Bắt đầu thi</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chưa tìm thấy đề cùng khối lớp khác để gợi ý.
            </div>
          )}
        </div>
      )}

      {showDetailedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Chi tiết bài làm</h3>
                <p className="mt-1 text-sm text-slate-500">Từng câu hỏi, đáp án và lời giải của bài thi.</p>
              </div>
              <button onClick={onCloseDetails} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <span className="sr-only">Đóng</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6 text-left">
              {result.results.map((r: any, idx: number) => (
                <div key={idx} className={`rounded-[1.5rem] border p-5 ${r.isCorrect ? 'border-emerald-100 bg-emerald-50/60' : 'border-rose-100 bg-rose-50/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold text-slate-700">Câu {idx + 1}</span>
                    <span className={`text-sm font-bold ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{r.isCorrect ? 'Đúng' : 'Sai'}</span>
                  </div>
                  {r.content && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800">
                      <LatexRenderer content={r.content} />
                      {r.imageUrl && (
                        <div className="mt-3 inline-block rounded-xl border border-slate-100 bg-slate-50 p-2">
                          <img src={r.imageUrl} alt={`Hình ảnh Câu ${idx + 1}`} className="max-h-36 rounded-lg object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  )}

                  {(() => {
                    const options = r.options || exam.questions.find((q: any) => q.id === r.questionId)?.options || [];
                    if (!options || options.length === 0) return null;
                    return (
                      <div className="mt-4 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Các phương án</div>
                        {options.map((opt: string, optIdx: number) => {
                          const isSelected = r.studentAnswer === optIdx;
                          const isCorrectOption = r.correctAnswer === optIdx;
                          return (
                            <div key={optIdx} className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${isCorrectOption ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : isSelected ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-slate-200 bg-white text-slate-700'}`}>
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${isCorrectOption ? 'border-emerald-600 bg-emerald-600 text-white' : isSelected ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <div className="flex-1"><LatexRenderer content={opt} /></div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <div className="rounded-xl bg-white px-3 py-2 font-medium text-slate-600">
                      Đã chọn: <span className={`font-semibold ${r.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{r.studentAnswer >= 0 ? `Đáp án ${String.fromCharCode(65 + r.studentAnswer)}` : 'Chưa chọn'}</span>
                    </div>
                    {!r.isCorrect && (
                      <div className="rounded-xl bg-white px-3 py-2 font-medium text-slate-600">
                        Đáp án đúng: <span className="font-semibold text-emerald-700">Đáp án {String.fromCharCode(65 + r.correctAnswer)}</span>
                      </div>
                    )}
                    <div className="rounded-xl bg-white px-3 py-2 font-medium text-slate-600">
                      Điểm: <span className="font-semibold text-slate-800">{r.pointsEarned} / {r.pointsPossible}</span>
                    </div>
                  </div>

                  {r.explanation && (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="mb-2 text-sm font-bold text-blue-800">Lời giải chi tiết</div>
                      <div className="text-sm leading-relaxed text-blue-950">
                        <LatexRenderer content={r.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
