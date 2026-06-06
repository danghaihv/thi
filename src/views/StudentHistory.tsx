import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Eye, History as HistoryIcon, ShieldCheck, X } from 'lucide-react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { LatexRenderer } from '../components/LatexRenderer';

function getScoreFromSubmission(row: any) {
  return row.scoreEarned !== undefined ? row.scoreEarned : ((row.score / row.total) * (row.examTotalScore || 10));
}

function getOptionLabel(idx: number) {
  return idx < 0 ? 'Chưa chọn' : String.fromCharCode(65 + idx);
}

export function StudentHistory() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [loadedExam, setLoadedExam] = useState<any | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [examTitleMap, setExamTitleMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) setCurrentUser(userDoc.data());

        const q = query(collection(db, 'submissions'), where('studentId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const list: any[] = [];
        const examIds = new Set<string>();

        snapshot.forEach((snapshotDoc) => {
          const row = { id: snapshotDoc.id, ...snapshotDoc.data() } as any;
          list.push(row);
          if (row.examId) examIds.add(String(row.examId));
        });

        list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
        setSubmissions(list);

        const nextTitleMap: Record<string, string> = {};
        await Promise.all(Array.from(examIds).map(async (examId) => {
          try {
            const examDoc = await getDoc(doc(db, 'exams', examId));
            nextTitleMap[examId] = examDoc.exists() ? ((examDoc.data() as any)?.title || examId) : examId;
          } catch {
            nextTitleMap[examId] = examId;
          }
        }));
        setExamTitleMap(nextTitleMap);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'submissions');
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedSubmission) {
      setLoadedExam(null);
      return;
    }
    const needsExamFetch = selectedSubmission.results?.some((r: any) => !r.options || r.options.length === 0);
    if (!needsExamFetch) return;

    setIsLoadingExam(true);
    const fetchExam = async () => {
      try {
        const examDoc = await getDoc(doc(db, 'exams', selectedSubmission.examId));
        if (examDoc.exists()) setLoadedExam(examDoc.data());
      } catch (err) {
        console.error('Lỗi khi tải thông tin đề thi để lấy các phương án:', err);
      } finally {
        setIsLoadingExam(false);
      }
    };
    fetchExam();
  }, [selectedSubmission]);

  const isVipUser = currentUser?.vipExpiry && new Date(currentUser.vipExpiry).getTime() > Date.now();
  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
  const canViewDetail = Boolean(isVipUser || isStaff);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="glass-panel rounded-[2rem] p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"><HistoryIcon className="h-3.5 w-3.5 text-indigo-600" /> Lịch sử làm bài</div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title">Danh sách các đề thi đã hoàn thành</h2>
            <p className="mt-2 text-sm text-slate-500">Xem lại lịch sử thi và mở chi tiết khi tài khoản đủ quyền.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Quyền xem chi tiết</div>
            <p className="mt-2 leading-6">{canViewDetail ? 'Đã mở xem đáp án và lời giải.' : 'Nâng VIP để xem đáp án, lời giải và phân tích chi tiết.'}</p>
          </div>
        </div>
      </section>

      <section className="glass-panel overflow-hidden rounded-[2rem] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="p-5 pl-6 font-semibold">Tên đề thi</th><th className="p-5 font-semibold">Ngày nộp</th><th className="p-5 font-semibold">Câu đúng</th><th className="p-5 font-semibold">Điểm</th><th className="p-5 pr-6 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => {
                const score = getScoreFromSubmission(row);
                const totalScore = row.examTotalScore ?? 10;
                const scoreLabel = Number.isFinite(score) ? score.toFixed(2).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/g, '') : '0';
                return (<tr key={row.id} className="border-b border-slate-100 last:border-none transition-colors hover:bg-slate-50/60"><td className="p-5 pl-6 font-semibold text-slate-900">{row.examTitle || row.examName || row.title || examTitleMap[String(row.examId)] || row.examId}</td><td className="p-5 text-sm font-medium text-slate-600"><div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" /> {new Date(row.submittedAt).toLocaleString('vi-VN')}</div></td><td className="p-5 text-sm font-medium text-slate-600">{row.score} / {row.total}</td><td className="p-5 text-sm font-medium text-slate-600">{scoreLabel}/{totalScore}</td><td className="p-5 pr-6 text-right">{row.showResultAfter !== false && row.results && (<button onClick={() => { if (canViewDetail) setSelectedSubmission(row); else { window.alert('Tính năng xem đáp án chi tiết chỉ dành cho tài khoản VIP. Bạn sẽ được chuyển đến trang nâng cấp.'); navigate('/upgrade'); } }} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"><Eye className="h-4 w-4" /> {canViewDetail ? 'Xem chi tiết' : 'Nâng VIP để xem'}</button>)}</td></tr>);
              })}
              {submissions.length === 0 && (<tr><td colSpan={6} className="p-10 text-center text-sm text-slate-500">Chưa có bài thi nào</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {selectedSubmission && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-6"><div><h3 className="text-xl font-bold text-slate-950">Chi tiết bài làm</h3><p className="mt-1 text-sm text-slate-500">Mã đề: {selectedSubmission.examId}</p></div><button onClick={() => setSelectedSubmission(null)} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-6 w-6" /></button></div><div className="flex-1 overflow-y-auto p-6 space-y-4">{isLoadingExam && (<div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-center text-sm font-medium text-indigo-700">Đang tải các phương án của đề thi để đối chiếu...</div>)}{selectedSubmission.results ? selectedSubmission.results.map((r: any, idx: number) => (<div key={idx} className={`rounded-2xl border p-4 ${r.isCorrect ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'}`}><div className="mb-2 flex items-start justify-between gap-3"><span className="font-bold text-slate-800">Câu {idx + 1}</span><span className={`text-sm font-bold ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{r.isCorrect ? 'Đúng' : 'Sai'}</span></div>{r.content && (<div className="mb-3 rounded-xl border border-slate-100 bg-white p-3 text-sm font-medium text-slate-800"><LatexRenderer content={r.content} />{r.imageUrl && (<div className="mt-3 inline-block rounded-xl border border-slate-100 bg-slate-50 p-2"><img src={r.imageUrl} alt={`Hình ảnh Câu ${idx + 1}`} className="max-h-36 rounded-lg object-contain" referrerPolicy="no-referrer" /></div>)}</div>)}<div className="space-y-2">{((r.options || loadedExam?.questions?.find((q: any) => q.id === r.questionId)?.options || []) as string[]).map((opt, optIdx) => { const isSelected = r.studentAnswer === optIdx; const isCorrectOption = r.correctAnswer === optIdx; return (<div key={optIdx} className={`flex items-center gap-3 rounded-xl border p-3.5 text-sm ${isCorrectOption ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950' : isSelected ? 'border-rose-200 bg-rose-50/60 text-rose-950' : 'border-slate-100 bg-white text-slate-700'}`}><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold shadow-sm ${isCorrectOption ? 'border-emerald-600 bg-emerald-600 text-white' : isSelected ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{String.fromCharCode(65 + optIdx)}</div><div className="flex-1"><LatexRenderer content={opt} /></div>{isCorrectOption && <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Đúng</span>}{isSelected && !isCorrectOption && <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">Đã chọn</span>}</div>); })}</div><div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm"><div className="flex gap-2"><span className="shrink-0 text-slate-500">Đã chọn:</span><span className={`font-semibold ${r.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>Đáp án {getOptionLabel(r.studentAnswer)}</span></div>{!r.isCorrect && (<div className="mt-1 flex gap-2"><span className="shrink-0 text-slate-500">Đáp án đúng:</span><span className="font-semibold text-emerald-700">Đáp án {getOptionLabel(r.correctAnswer)}</span></div>)}<div className="mt-2 flex gap-2 border-t border-slate-200/50 pt-2"><span className="text-slate-500">Điểm:</span><span className="font-semibold text-slate-700">{r.pointsEarned} / {r.pointsPossible}</span></div></div>{r.explanation && (<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4"><div className="mb-1 text-sm font-bold text-blue-800">Lời giải chi tiết:</div><div className="text-sm font-medium leading-relaxed text-blue-900"><LatexRenderer content={r.explanation} /></div></div>)}</div>)) : (<div className="py-8 text-center text-slate-500">Không có dữ liệu chi tiết.</div>)}</div></div></div>)}
    </div>
  );
}
