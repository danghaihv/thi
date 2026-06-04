import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  Clock,
  Eye,
  FileText,
  History as HistoryIcon,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { LatexRenderer } from '../components/LatexRenderer';

function formatScore(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

function getScoreFromSubmission(row: any) {
  return row.scoreEarned !== undefined ? row.scoreEarned : ((row.score / row.total) * (row.examTotalScore || 10));
}

function formatTimeSpent(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}p` : `${minutes} phút`;
}

function StatCard({ title, value, icon, hint }: { title: string; value: string; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="glass-panel rounded-[1.75rem] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</div>
          {hint ? <div className="mt-2 text-xs font-medium text-slate-500">{hint}</div> : null}
        </div>
        <div className="rounded-2xl bg-slate-950/5 p-3 text-slate-950">{icon}</div>
      </div>
    </div>
  );
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindowDays, setTimeWindowDays] = useState<7 | 30>(7);

  useEffect(() => {
    const load = async () => {
      if (!auth.currentUser) {
        const unsub = auth.onAuthStateChanged((user) => {
          if (user) loadHistory(user.uid);
        });
        return () => unsub();
      }
      loadHistory(auth.currentUser.uid);
    };

    const loadHistory = async (uid: string) => {
      try {
        setError(null);
        setIsLoading(true);
        const q = query(collection(db, 'submissions'), where('studentId', '==', uid));
        const snapshot = await getDocs(q);
        const list: any[] = [];
        snapshot.forEach((snapshotDoc) => list.push({ id: snapshotDoc.id, ...snapshotDoc.data() }));
        list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
        setHistory(list);
      } catch (err: any) {
        setError(err?.message || 'Không thể tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribePromise = load();
    return () => {
      void unsubscribePromise;
    };
  }, []);

  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: { name: string; diem: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const dayHistory = history.filter((row) => {
        const submittedAt = new Date(row.submittedAt || 0);
        return submittedAt >= startOfDay && submittedAt <= endOfDay;
      });
      const avg = dayHistory.length ? dayHistory.reduce((acc, curr) => acc + getScoreFromSubmission(curr), 0) / dayHistory.length : 0;
      result.push({ name: date.toLocaleDateString('vi-VN', { weekday: 'short' }), diem: Number(avg.toFixed(1)) });
    }

    return result;
  }, [history]);

  const windowHistory = useMemo(() => {
    const windowStart = Date.now() - timeWindowDays * 24 * 60 * 60 * 1000;
    return history.filter((item) => new Date(item.submittedAt || 0).getTime() >= windowStart);
  }, [history, timeWindowDays]);

  const totalSeconds = windowHistory.reduce((acc, curr) => acc + (curr.timeSpent || 1800), 0);
  const avgScoreInWindow = windowHistory.length ? windowHistory.reduce((acc, curr) => acc + getScoreFromSubmission(curr), 0) / windowHistory.length : 0;

  if (isLoading) {
    return (
      <div className="glass-panel rounded-[2rem] py-20 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
        <p className="mt-4 text-sm font-medium text-slate-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-[2rem] p-8 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="glass-panel overflow-hidden rounded-[2rem] border-slate-200/70 bg-gradient-to-br from-white via-white to-indigo-50/60 p-6 shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" /> Tổng quan học tập
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl section-title">
              Theo dõi tiến trình, nhịp độ làm bài và kết quả luyện tập.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Dữ liệu được cập nhật từ các bài thi gần nhất để bạn nhìn rõ xu hướng học tập của mình.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Khung thời gian</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">Tổng hợp gần đây</div>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <Target className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[7, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeWindowDays(days as 7 | 30)}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${timeWindowDays === days ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  {days} ngày
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Đề đã làm" value={windowHistory.length.toString()} icon={<BookOpen className="h-6 w-6 text-indigo-600" />} hint="Số bài trong khung thời gian đã chọn" />
        <StatCard title="Điểm trung bình" value={avgScoreInWindow > 0 ? avgScoreInWindow.toFixed(1) : '0.0'} icon={<Trophy className="h-6 w-6 text-amber-500" />} hint="Thang điểm hệ 10" />
        <StatCard title="Thời gian học" value={formatTimeSpent(totalSeconds)} icon={<Clock className="h-6 w-6 text-emerald-600" />} hint="Tổng thời gian làm bài ước tính" />
      </section>

      <section className="glass-panel rounded-[2rem] p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Biểu đồ điểm số 7 ngày qua</h3>
            <p className="mt-1 text-sm text-slate-500">Quan sát dao động điểm để điều chỉnh nhịp luyện tập.</p>
          </div>
          <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 md:inline-flex">
            {timeWindowDays === 7 ? '7 ngày gần nhất' : '30 ngày gần nhất'}
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 10]} dx={-10} />
              <Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15,23,42,0.08)', padding: '12px' }} />
              <Area type="monotone" dataKey="diem" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#scoreGradient)" name="Điểm số" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
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

  const getOptionLabel = (idx: number) => (idx < 0 ? 'Chưa chọn' : String.fromCharCode(65 + idx));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="glass-panel rounded-[2rem] p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <HistoryIcon className="h-3.5 w-3.5 text-indigo-600" /> Lịch sử làm bài
            </div>
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
                <th className="p-5 pl-6 font-semibold">Tên đề thi</th>
                <th className="p-5 font-semibold">Mã đề</th>
                <th className="p-5 font-semibold">Ngày nộp</th>
                <th className="p-5 font-semibold">Câu đúng</th>
                <th className="p-5 font-semibold">Điểm hệ 10</th>
                <th className="p-5 pr-6 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => {
                const score = getScoreFromSubmission(row);
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-none transition-colors hover:bg-slate-50/60">
                    <td className="p-5 pl-6 font-semibold text-slate-900">{row.examTitle || row.examName || row.title || examTitleMap[String(row.examId)] || row.examId}</td>
                    <td className="p-5 text-sm font-medium text-slate-600">{row.examId}</td>
                    <td className="p-5 text-sm font-medium text-slate-600"><div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" /> {new Date(row.submittedAt).toLocaleString('vi-VN')}</div></td>
                    <td className="p-5 text-sm font-medium text-slate-600">{row.score} / {row.total}</td>
                    <td className="p-5">
                      <span className={`inline-flex rounded-full px-3.5 py-1.5 text-sm font-bold shadow-sm ${score >= 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {formatScore(score)}
                      </span>
                    </td>
                    <td className="p-5 pr-6 text-right">
                      {row.showResultAfter !== false && row.results && (
                        <button
                          onClick={() => {
                            if (canViewDetail) {
                              setSelectedSubmission(row);
                            } else {
                              window.alert('Tính năng xem đáp án chi tiết chỉ dành cho tài khoản VIP. Bạn sẽ được chuyển đến trang nâng cấp.');
                              navigate('/profile');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Eye className="h-4 w-4" /> {canViewDetail ? 'Xem chi tiết' : 'Nâng VIP để xem'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm text-slate-500">Chưa có bài thi nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Chi tiết bài làm</h3>
                <p className="mt-1 text-sm text-slate-500">Mã đề: {selectedSubmission.examId}</p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingExam && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-center text-sm font-medium text-indigo-700">
                  Đang tải các phương án của đề thi để đối chiếu...
                </div>
              )}

              {selectedSubmission.results ? selectedSubmission.results.map((r: any, idx: number) => (
                <div key={idx} className={`rounded-2xl border p-4 ${r.isCorrect ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'}`}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span className="font-bold text-slate-800">Câu {idx + 1}</span>
                    <span className={`text-sm font-bold ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{r.isCorrect ? 'Đúng' : 'Sai'}</span>
                  </div>

                  {r.content && (
                    <div className="mb-3 rounded-xl border border-slate-100 bg-white p-3 text-sm font-medium text-slate-800">
                      <LatexRenderer content={r.content} />
                      {r.imageUrl && (
                        <div className="mt-3 inline-block rounded-xl border border-slate-100 bg-slate-50 p-2">
                          <img src={r.imageUrl} alt={`Hình ảnh Câu ${idx + 1}`} className="max-h-36 rounded-lg object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {((r.options || loadedExam?.questions?.find((q: any) => q.id === r.questionId)?.options || []) as string[]).map((opt, optIdx) => {
                      const isSelected = r.studentAnswer === optIdx;
                      const isCorrectOption = r.correctAnswer === optIdx;
                      return (
                        <div key={optIdx} className={`flex items-center gap-3 rounded-xl border p-3.5 text-sm ${isCorrectOption ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950' : isSelected ? 'border-rose-200 bg-rose-50/60 text-rose-950' : 'border-slate-100 bg-white text-slate-700'}`}>
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold shadow-sm ${isCorrectOption ? 'border-emerald-600 bg-emerald-600 text-white' : isSelected ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <div className="flex-1"><LatexRenderer content={opt} /></div>
                          {isCorrectOption && <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Đúng</span>}
                          {isSelected && !isCorrectOption && <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">Đã chọn</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm">
                    <div className="flex gap-2">
                      <span className="shrink-0 text-slate-500">Đã chọn:</span>
                      <span className={`font-semibold ${r.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>Đáp án {getOptionLabel(r.studentAnswer)}</span>
                    </div>
                    {!r.isCorrect && (
                      <div className="mt-1 flex gap-2">
                        <span className="shrink-0 text-slate-500">Đáp án đúng:</span>
                        <span className="font-semibold text-emerald-700">Đáp án {getOptionLabel(r.correctAnswer)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex gap-2 border-t border-slate-200/50 pt-2">
                      <span className="text-slate-500">Điểm:</span>
                      <span className="font-semibold text-slate-700">{r.pointsEarned} / {r.pointsPossible}</span>
                    </div>
                  </div>

                  {r.explanation && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                      <div className="mb-1 text-sm font-bold text-blue-800">Lời giải chi tiết:</div>
                      <div className="text-sm font-medium leading-relaxed text-blue-900">
                        <LatexRenderer content={r.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div className="py-8 text-center text-slate-500">Không có dữ liệu chi tiết.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentUpgradeHub() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [pricing, setPricing] = useState({ vip1MonthPrice: 50000, vip6MonthPrice: 240000, vip1YearPrice: 450000, sepayBankId: '', sepayAccountNo: '', sepayAccountName: '' });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPack, setCheckoutPack] = useState<any>(null);
  const [paymentMemo, setPaymentMemo] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutDetails, setCheckoutDetails] = useState<{ amount: number; days: number; name: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [upgradeHistory, setUpgradeHistory] = useState<any[]>([]);

  const fetchUserAndStats = async () => {
    if (!auth.currentUser) return;
    setIsLoadingUser(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const saved = localStorage.getItem('hmath_user');
        const parsed = saved ? JSON.parse(saved) : {};
        const mergedUser = { ...parsed, ...userData, name: userData.fullName || userData.name || parsed.name || auth.currentUser?.displayName || 'Học sinh', avatar: userData.avatar || parsed.avatar || auth.currentUser?.photoURL || '' };
        setUser(mergedUser);
        localStorage.setItem('hmath_user', JSON.stringify(mergedUser));
      }

      const setSnap = await getDoc(doc(db, 'settings', 'global'));
      if (setSnap.exists()) {
        const sData = setSnap.data() as any;
        setPricing((prev) => ({ ...prev, vip1MonthPrice: sData.vip1MonthPrice ?? 50000, vip6MonthPrice: sData.vip6MonthPrice ?? 240000, vip1YearPrice: sData.vip1YearPrice ?? 450000, sepayBankId: sData.sepayBankId || '', sepayAccountNo: sData.sepayAccountNo || '', sepayAccountName: sData.sepayAccountName || '' }));
      }

      const q = query(collection(db, 'payment_intents'), where('userId', '==', auth.currentUser.uid));
      const subSnap = await getDocs(q);
      const items: any[] = [];
      subSnap.forEach((snapshotDoc) => items.push({ id: snapshotDoc.id, ...snapshotDoc.data() }));
      items.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
      setUpgradeHistory(items.slice(0, 5));
    } catch (err) {
      console.error('Error loading upgrade hub:', err);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    let unsubAuth: (() => void) | null = null;

    fetchUserAndStats();
    if (!auth.currentUser) {
      unsubAuth = auth.onAuthStateChanged((currentUser) => {
        if (currentUser) {
          fetchUserAndStats();
        } else {
          setIsLoadingUser(false);
        }
      });
    }

    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const initiateCheckout = async (packType: '1m' | '6m' | '1y') => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setCheckMessage('Phiên đăng nhập chưa sẵn sàng. Vui lòng tải lại trang hoặc đăng nhập lại.');
      return;
    }
    setIsCheckingPayment(true);
    setCheckMessage('');
    setPaymentIntentId('');
    setPaymentMemo('');
    setCheckoutPack({ type: packType, amount: expectedPack.amount, days: expectedPack.days, name: expectedPack.name });
    try {
      const planCode = packType === '1m' ? 'vip_1m' : packType === '6m' ? 'vip_6m' : 'vip_1y';
      const response = await fetch('/api/payment/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, packType, planCode }) });
      const data = await response.json();
      if (!response.ok) {
        setCheckMessage(data.error || data.message || 'Không thể tạo hóa đơn. Vui lòng thử lại.');
        return;
      }
      if (!data.bankId || !data.accountNo) {
        setCheckMessage('Chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ admin.');
        return;
      }
      setCheckoutPack({ type: packType, amount: data.amount, days: data.days, name: data.label });
      setPaymentIntentId(data.intentId || '');
      setPaymentMemo(data.memo);
      setCheckMessage('Đang chờ hệ thống ghi nhận thanh toán...');
    } catch (err: any) {
      setCheckMessage('Lỗi kết nối server: ' + err.message);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    if (!isCheckoutOpen || !paymentIntentId) return;
    const interval = setInterval(() => fetchUserAndStats(), 5000);
    return () => clearInterval(interval);
  }, [isCheckoutOpen, paymentIntentId]);

  if (isLoadingUser && !user) {
    return <div className="py-20 text-center text-sm font-medium text-slate-500 animate-pulse">Đang tải thông tin...</div>;
  }

  if (!user) {
    return <div className="py-20 text-center text-sm font-medium text-slate-500">Không thể tải thông tin tài khoản.</div>;
  }

  const isVip = user.vipExpiry && new Date(user.vipExpiry).getTime() > Date.now();
  const daysRemaining = isVip ? Math.ceil((new Date(user.vipExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
  const qrUrl = pricing.sepayBankId && pricing.sepayAccountNo ? `https://img.vietqr.io/image/${pricing.sepayBankId}-${pricing.sepayAccountNo}-compact2.png?amount=${checkoutPack?.amount}&addInfo=${paymentMemo}&accountName=${encodeURIComponent(pricing.sepayAccountName)}` : '';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_38%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_52%,_#eef2ff_100%)] p-6 shadow-sm md:p-8">
        <div className="absolute right-[-80px] top-[-90px] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Nâng cấp tài khoản
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title md:text-5xl">Mở khóa trải nghiệm học tập mạnh hơn</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">VIP giúp bạn xem đáp án chi tiết, theo dõi tiến trình sâu hơn và luyện đề với cảm giác liền mạch hơn mỗi ngày.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['Xem lời giải', 'Mở chi tiết đáp án và phân tích sau mỗi bài làm.'],
              ['Theo dõi tiến bộ', 'Nhìn rõ nhịp độ, lịch sử và xu hướng học tập.'],
              ['Luyện đề thoải mái', 'Giảm ma sát khi học, tăng tốc độ ôn tập.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-[1.4rem] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
                <div className="text-sm font-bold text-slate-950">{title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="glass-panel rounded-[2rem] p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-indigo-600" /> Trạng thái tài khoản</h3>
          <p className="mt-2 text-sm text-slate-500">Tài khoản VIP mở khóa xem đáp án, lời giải và giới hạn luyện đề cao hơn.</p>
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            {isVip ? <div className="flex gap-4"><div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Sparkles className="h-6 w-6 fill-amber-700" /></div><div><h4 className="font-bold text-slate-950">Thành viên VIP đang hoạt động</h4><p className="mt-1 text-sm leading-6 text-slate-600">Bạn đang có đặc quyền học tập cao cấp: luyện đề không giới hạn, xem giải thích chi tiết và theo dõi tiến trình sâu hơn.</p><div className="mt-3 inline-flex rounded-full bg-amber-200/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">Hạn VIP còn {daysRemaining} ngày · {new Date(user.vipExpiry).toLocaleDateString('vi-VN')}</div></div></div> : <div className="flex gap-4"><div className="rounded-2xl bg-white p-3 text-slate-500 shadow-sm"><User className="h-6 w-6" /></div><div className="flex-1"><h4 className="font-bold text-slate-950">Thành viên miễn phí</h4><p className="mt-1 text-sm leading-6 text-slate-600">Giới hạn 10 đề mỗi tháng và không xem được đáp án chi tiết.</p></div></div>}
          </div>
          <div className="mt-6 space-y-4">
            <PriceCard title="Gói 1 tháng" period="30 ngày" price={pricing.vip1MonthPrice} onChoose={() => initiateCheckout('1m')} cta={isVip ? 'Gia hạn 30 ngày' : 'Nâng cấp ngay'} />
            <PriceCard title="Gói 6 tháng" period="180 ngày" price={pricing.vip6MonthPrice} onChoose={() => initiateCheckout('6m')} cta={isVip ? 'Gia hạn 180 ngày' : 'Nâng cấp ngay'} ctaHint="Tiết kiệm khoảng 20%" />
            <PriceCard title="Gói 1 năm" period="365 ngày" price={pricing.vip1YearPrice} onChoose={() => initiateCheckout('1y')} cta={isVip ? 'Gia hạn 365 ngày' : 'Nâng cấp ngay'} ctaHint="Tiết kiệm khoảng 25%" />
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><HistoryIcon className="h-5 w-5 text-indigo-600" /> Lịch sử nâng cấp</h3>
              <p className="mt-1 text-sm text-slate-500">Hiển thị gói đã chọn, thời gian tạo hóa đơn và trạng thái xử lý.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Gần đây</span>
          </div>
          <div className="mt-4 space-y-3">
            {upgradeHistory.length ? upgradeHistory.map((item) => {
              const status = String(item.status || 'awaiting_payment');
              const statusLabel = status === 'fulfilled' || status === 'completed' ? 'Thành công' : status === 'expired' ? 'Hết hạn' : status === 'canceled' ? 'Đã hủy' : status === 'paid' ? 'Đã thanh toán' : 'Đang chờ';
              const statusClass = status === 'fulfilled' || status === 'completed' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : status === 'expired' || status === 'canceled' ? 'border-rose-100 bg-rose-50 text-rose-700' : status === 'paid' ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-indigo-100 bg-indigo-50 text-indigo-700';
              const planName = item.planCode === 'vip_6m' ? 'VIP 6 tháng' : item.planCode === 'vip_1y' ? 'VIP 1 năm' : 'VIP 1 tháng';
              const timeLabel = item.createdAt || item.updatedAt ? new Date(item.createdAt || item.updatedAt).toLocaleString('vi-VN') : 'Mới đây';
              return (
                <div key={item.id} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-950">{planName}</div>
                      <div className="mt-1 text-xs text-slate-500">{timeLabel}</div>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <div><span className="font-semibold text-slate-500">Mã hóa đơn:</span> {item.intentId || item.id}</div>
                    <div><span className="font-semibold text-slate-500">Mã chuyển khoản:</span> {item.memo || '—'}</div>
                    <div><span className="font-semibold text-slate-500">Số tiền:</span> {typeof item.amountExpected === 'number' ? `${item.amountExpected.toLocaleString('vi-VN')} đ` : (item.amount ? `${Number(item.amount).toLocaleString('vi-VN')} đ` : '—')}</div>
                    <div><span className="font-semibold text-slate-500">Xử lý:</span> {item.fulfilledAt || item.paidAt ? new Date(item.fulfilledAt || item.paidAt).toLocaleString('vi-VN') : 'Chưa hoàn tất'}</div>
                  </div>
                </div>
              );
            }) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có lịch sử nâng cấp.</div>}
          </div>
        </section>
      </div>

      {checkoutPack && (<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-md"><div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col gap-8 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl md:flex-row md:p-8"><button onClick={() => setCheckoutPack(null)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>{!pricing.sepayBankId || !pricing.sepayAccountNo ? <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center text-slate-500"><AlertCircle className="h-16 w-16 text-amber-500" /><h4 className="text-lg font-bold text-slate-950">Cổng thanh toán chưa sẵn sàng</h4><p className="max-w-md text-sm leading-6">Giáo viên / Admin chưa thiết lập tài khoản ngân hàng thụ hưởng qua SePay trong Cài đặt hệ thống.</p></div> : <><div className="flex-1 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center md:p-6"><h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.22em] text-indigo-600">Quét mã QR để thanh toán</h4>{qrUrl ? <img src={qrUrl} alt="VietQR SePay VIP Code" className="mx-auto w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" referrerPolicy="no-referrer" /> : <div className="mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-2xl bg-slate-100 text-slate-400">Mã QR thất bại</div>}<div className="mt-4 space-y-2 text-xs text-slate-500"><div className="flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> Hỗ trợ mọi ngân hàng</div><div>Mở ứng dụng ngân hàng và bấm &quot;Quét mã&quot;</div><button type="button" onClick={async () => { if (!qrUrl) return; const response = await fetch(qrUrl); const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = objectUrl; a.download = `sepay-qr-${paymentMemo || 'hmath'}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(objectUrl); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50">Tải mã QR</button></div></div><div className="flex-1 space-y-6"><div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-600">Thanh toán hóa đơn tự động</span><h3 className="mt-3 text-2xl font-bold text-slate-950">Nâng cấp gói {checkoutPack.name}</h3><p className="mt-1 text-sm text-slate-500">Giao dịch được đối soát hoàn toàn tự động dựa trên nội dung chuyển khoản.</p></div><div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><FieldRow label="Ngân hàng" value={pricing.sepayBankId} /><FieldRow label="Số tài khoản" value={pricing.sepayAccountNo} copyValue={pricing.sepayAccountNo} copied={copiedField === 'stk'} onCopy={() => handleCopy(pricing.sepayAccountNo, 'stk')} /><FieldRow label="Chủ tài khoản" value={pricing.sepayAccountName} /><FieldRow label="Số tiền" value={`${checkoutPack.amount.toLocaleString('vi-VN')} đ`} copyValue={String(checkoutPack.amount)} copied={copiedField === 'amount'} onCopy={() => handleCopy(String(checkoutPack.amount), 'amount')} highlight /><FieldRow label="Nội dung (CỰC KỲ QUAN TRỌNG)" value={paymentMemo} copyValue={paymentMemo} copied={copiedField === 'memo'} onCopy={() => handleCopy(paymentMemo, 'memo')} mono badge /></div><div className="space-y-3"><div className="flex items-center gap-3 text-xs text-slate-500"><RefreshCw className={`h-4 w-4 text-indigo-600 ${isCheckingPayment ? 'animate-spin' : ''}`} /><p>Hệ thống tự động đồng bộ tài khoản. Không tải lại trang này khi tiền đang xử lý.</p></div>{checkMessage ? <div className={`rounded-2xl border p-3.5 text-xs font-bold leading-normal ${checkMessage.includes('thành công') ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : checkMessage.toLowerCase().includes('đang') ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>{checkMessage}</div> : null}<div className="flex gap-3"><button onClick={() => { setCheckoutPack(null); setPaymentIntentId(''); setPaymentMemo(''); }} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button></div></div></div></>}</div></div>)}
    </div>
  );
}

export function StudentProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [zalo, setZalo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pricing, setPricing] = useState({ vip1MonthPrice: 50000, vip6MonthPrice: 240000, vip1YearPrice: 450000, sepayBankId: '', sepayAccountNo: '', sepayAccountName: '' });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPack, setCheckoutPack] = useState<any>(null);
  const [paymentMemo, setPaymentMemo] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutDetails, setCheckoutDetails] = useState<{ amount: number; days: number; name: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchUserAndStats = async () => {
    if (!auth.currentUser) return;
    setIsLoadingUser(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const saved = localStorage.getItem('hmath_user');
        const parsed = saved ? JSON.parse(saved) : {};
        const mergedUser = {
          ...parsed,
          ...userData,
          name: userData.fullName || userData.name || parsed.name || auth.currentUser?.displayName || 'Học sinh',
          avatar: userData.avatar || parsed.avatar || auth.currentUser?.photoURL || '',
        };
        setUser(mergedUser);
        setDisplayName(mergedUser.name || '');
        setZalo(mergedUser.zalo || '');
        localStorage.setItem('hmath_user', JSON.stringify(mergedUser));
      } else {
        const fallbackUser = { name: auth.currentUser?.displayName || 'Học sinh', email: auth.currentUser?.email || '', avatar: auth.currentUser?.photoURL || '' };
        setUser(fallbackUser);
        setDisplayName(fallbackUser.name || '');
      }

      const setSnap = await getDoc(doc(db, 'settings', 'global'));
      if (setSnap.exists()) {
        const sData = setSnap.data() as any;
        setPricing((prev) => ({
          ...prev,
          vip1MonthPrice: sData.vip1MonthPrice ?? 50000,
          vip6MonthPrice: sData.vip6MonthPrice ?? 240000,
          vip1YearPrice: sData.vip1YearPrice ?? 450000,
          sepayBankId: sData.sepayBankId || '',
          sepayAccountNo: sData.sepayAccountNo || '',
          sepayAccountName: sData.sepayAccountName || '',
        }));
      }
    } catch (err) {
      console.error('Error loading profile stats:', err);
    }
  };

  useEffect(() => {
    let unsubAuth: (() => void) | null = null;

    fetchUserAndStats();
    if (!auth.currentUser) {
      unsubAuth = auth.onAuthStateChanged((user) => {
        if (user) fetchUserAndStats();
      });
    }

    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    setMessage('');
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { name: displayName, fullName: displayName, zalo });
      const saved = localStorage.getItem('hmath_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.name = displayName;
        parsed.fullName = displayName;
        parsed.zalo = zalo;
        localStorage.setItem('hmath_user', JSON.stringify(parsed));
      }
      setMessage('Cập nhật thành công!');
      setTimeout(() => setMessage(''), 3000);
      fetchUserAndStats();
    } catch (err) {
      console.error(err);
      setMessage('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const initiateCheckout = async (packType: '1m' | '6m' | '1y') => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setCheckMessage('Phiên đăng nhập chưa sẵn sàng. Vui lòng tải lại trang hoặc đăng nhập lại.');
      return;
    }

    const expectedPack = packType === '1m'
      ? { amount: pricing.vip1MonthPrice, days: 30, name: 'VIP 1 tháng' }
      : packType === '6m'
      ? { amount: pricing.vip6MonthPrice, days: 180, name: 'VIP 6 tháng' }
      : { amount: pricing.vip1YearPrice, days: 365, name: 'VIP 1 năm' };

    setIsCheckoutOpen(true);
    setCheckoutStatus('loading');
    setCheckoutError('');
    setCheckMessage('Đang tạo mã thanh toán...');
    setPaymentIntentId('');
    setPaymentMemo('');
    setCheckoutPack({ type: packType, ...expectedPack });
    setCheckoutDetails({ ...expectedPack });

    try {
      const planCode = packType === '1m' ? 'vip_1m' : packType === '6m' ? 'vip_6m' : 'vip_1y';
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, packType, planCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCheckoutStatus('error');
        setCheckoutError(data.error || data.message || 'Không thể tạo hóa đơn. Vui lòng thử lại.');
        setCheckMessage(data.error || data.message || 'Không thể tạo hóa đơn. Vui lòng thử lại.');
        return;
      }
      if (!data.bankId || !data.accountNo) {
        setCheckoutStatus('error');
        setCheckoutError('Chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ admin.');
        setCheckMessage('Chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ admin.');
        return;
      }

      setCheckoutPack({ type: packType, amount: data.amount, days: data.days, name: data.label });
      setCheckoutDetails({ amount: data.amount, days: data.days, name: data.label });
      setPaymentIntentId(data.intentId || '');
      setPaymentMemo(data.memo);
      setCheckoutStatus('ready');
      setCheckMessage('Đang chờ hệ thống ghi nhận thanh toán...');
      return;
    } catch (err: any) {
      console.error('Create payment error:', err);
      setCheckoutStatus('error');
      setCheckoutError('Lỗi kết nối server: ' + err.message);
      setCheckMessage('Lỗi kết nối server: ' + err.message);
      setCheckoutPack({ type: packType, amount: 0, days: 0, name: 'Lỗi tạo hóa đơn' });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    if (!isCheckoutOpen || !paymentIntentId) return;
    const interval = setInterval(() => fetchUserAndStats(), 5000);
    return () => clearInterval(interval);
  }, [isCheckoutOpen, paymentIntentId]);

  if (isLoadingUser && !user) {
    return <div className="py-20 text-center text-sm font-medium text-slate-500 animate-pulse">Đang tải thông tin...</div>;
  }

  if (!user) {
    return <div className="py-20 text-center text-sm font-medium text-slate-500">Không thể tải thông tin tài khoản.</div>;
  }

  const isVip = user.vipExpiry && new Date(user.vipExpiry).getTime() > Date.now();
  const daysRemaining = isVip ? Math.ceil((new Date(user.vipExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
  const qrUrl = pricing.sepayBankId && pricing.sepayAccountNo ? `https://img.vietqr.io/image/${pricing.sepayBankId}-${pricing.sepayAccountNo}-compact2.png?amount=${checkoutPack?.amount}&addInfo=${paymentMemo}&accountName=${encodeURIComponent(pricing.sepayAccountName)}` : '';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="glass-panel overflow-hidden rounded-[2rem] p-6 shadow-sm md:p-8">
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-indigo-500/10 blur-2xl" />
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-lg">
                {user.avatar ? <img src={user.avatar} alt={displayName || user.name || user.fullName || 'Học sinh'} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full w-full items-center justify-center bg-indigo-50 text-4xl font-extrabold uppercase text-indigo-700">{(displayName || user.name || user.fullName || 'U')[0]}</div>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                <User className="h-3.5 w-3.5 text-indigo-600" /> Hồ sơ cá nhân
              </div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title">{user.name || user.fullName || 'Học sinh'}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-sm"><div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Email</div><div className="mt-1 text-sm font-semibold">{user.email}</div></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="glass-panel rounded-[2rem] p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Phone className="h-5 w-5 text-indigo-600" /> Thông tin cá nhân</h3>
          <p className="mt-2 text-sm text-slate-500">Cập nhật tên hiển thị và số Zalo để đồng bộ hồ sơ.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400"><User className="h-3.5 w-3.5" /> Tên hiển thị</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nhập tên hiển thị..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400"><Phone className="h-3.5 w-3.5" /> Số điện thoại Zalo</label>
              <input type="text" value={zalo} onChange={(e) => setZalo(e.target.value)} placeholder="Nhập số điện thoại Zalo..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="h-4 w-4" /> {isSaving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
              {message ? <span className={`text-xs font-semibold ${message.includes('lỗi') ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</span> : null}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-indigo-600" /> Tài khoản</h3>
            </div>
            {isVip ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700"><Star className="h-3.5 w-3.5 fill-amber-700" /> VIP</span> : null}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            {isVip ? (
              <div className="flex gap-4">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Sparkles className="h-6 w-6 fill-amber-700" /></div>
                <div>
                  <h4 className="font-bold text-slate-950">Thành viên VIP đang hoạt động</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Bạn đang có đặc quyền học tập cao cấp: luyện đề không giới hạn, xem giải thích chi tiết và theo dõi tiến trình sâu hơn.</p>
                  <div className="mt-3 inline-flex rounded-full bg-amber-200/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">Hạn VIP còn {daysRemaining} ngày · {new Date(user.vipExpiry).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <div className="rounded-2xl bg-white p-3 text-slate-500 shadow-sm"><User className="h-6 w-6" /></div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-950">Thành viên miễn phí</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Giới hạn 10 đề mỗi tháng và không xem được đáp án chi tiết.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>


      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col gap-8 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl md:flex-row md:p-8">
            <button onClick={() => { setIsCheckoutOpen(false); setPaymentIntentId(''); setPaymentMemo(''); setCheckoutPack(null); setCheckoutDetails(null); setCheckoutStatus('idle'); setCheckoutError(''); setCheckMessage(''); }} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>

            <div className="flex-1 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center md:p-6">
              <h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.22em] text-indigo-600">Quét mã QR để thanh toán</h4>
              {checkoutStatus === 'loading' ? (
                <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm font-semibold text-slate-500">
                  Đang tạo mã thanh toán...
                </div>
              ) : checkoutStatus === 'error' ? (
                <div className="mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-2xl bg-rose-50 text-center text-sm font-semibold text-rose-600 px-6">{checkoutError || 'Mã QR thất bại'}</div>
              ) : qrUrl ? (
                <img src={qrUrl} alt="VietQR SePay VIP Code" className="mx-auto w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-2xl bg-slate-100 text-slate-400">Mã QR thất bại</div>
              )}
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <div className="flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> Hỗ trợ mọi ngân hàng</div>
                <div>Mở ứng dụng ngân hàng và bấm &quot;Quét mã&quot;</div>
                {qrUrl ? <button type="button" onClick={async () => {
                  if (!qrUrl) return;
                  const response = await fetch(qrUrl);
                  const blob = await response.blob();
                  const objectUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = objectUrl;
                  a.download = `sepay-qr-${paymentMemo || 'hmath'}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(objectUrl);
                }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50">Tải mã QR</button> : null}
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-600">Thanh toán hóa đơn tự động</span>
                <h3 className="mt-3 text-2xl font-bold text-slate-950">Nâng cấp gói {checkoutDetails?.name || checkoutPack?.name || 'đang tạo...'}</h3>
                <p className="mt-1 text-sm text-slate-500">Giao dịch được đối soát hoàn toàn tự động dựa trên nội dung chuyển khoản.</p>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <FieldRow label="Ngân hàng" value={pricing.sepayBankId || 'Đang tạo...'} />
                <FieldRow label="Số tài khoản" value={pricing.sepayAccountNo || 'Đang tạo...'} copyValue={pricing.sepayAccountNo} copied={copiedField === 'stk'} onCopy={() => handleCopy(pricing.sepayAccountNo, 'stk')} />
                <FieldRow label="Chủ tài khoản" value={pricing.sepayAccountName || 'Đang tạo...'} />
                <FieldRow label="Số tiền" value={`${(checkoutDetails?.amount ?? checkoutPack?.amount ?? 0).toLocaleString('vi-VN')} đ`} copyValue={String(checkoutDetails?.amount ?? checkoutPack?.amount ?? 0)} copied={copiedField === 'amount'} onCopy={() => handleCopy(String(checkoutDetails?.amount ?? checkoutPack?.amount ?? 0), 'amount')} highlight />
                <FieldRow label="Nội dung (CỰC KỲ QUAN TRỌNG)" value={paymentMemo || 'Đang tạo...'} copyValue={paymentMemo} copied={copiedField === 'memo'} onCopy={() => handleCopy(paymentMemo, 'memo')} mono badge />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <RefreshCw className={`h-4 w-4 text-indigo-600 ${checkoutStatus === 'loading' || isCheckingPayment ? 'animate-spin' : ''}`} />
                  <p>{checkoutStatus === 'loading' ? 'Đang tạo và đồng bộ mã thanh toán. Vui lòng chờ một chút.' : 'Hệ thống tự động đồng bộ tài khoản. Không tải lại trang này khi tiền đang xử lý.'}</p>
                </div>

                {checkMessage ? (
                  <div className={`rounded-2xl border p-3.5 text-xs font-bold leading-normal ${checkMessage.includes('thành công') ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : checkMessage.toLowerCase().includes('đang') ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                    {checkMessage}
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <button onClick={() => { setIsCheckoutOpen(false); setPaymentIntentId(''); setPaymentMemo(''); setCheckoutPack(null); setCheckoutDetails(null); setCheckoutStatus('idle'); setCheckoutError(''); setCheckMessage(''); }} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCard({ title, period, price, onChoose, cta, ctaHint, featured = false }: { title: string; period: string; price: number; onChoose: () => void; cta: string; ctaHint?: string; featured?: boolean }) {
  return (
    <div className={`flex flex-col justify-between rounded-[1.5rem] border p-4 text-center shadow-sm transition-all ${featured ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
      <div>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${featured ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-500'}`}>{period}</span>
        <h5 className="mt-2 text-sm font-bold text-slate-950">{title}</h5>
        <p className="mt-3 text-lg font-extrabold text-indigo-600">{price.toLocaleString('vi-VN')}đ</p>
        {ctaHint ? <span className="text-[10px] text-slate-400">{ctaHint}</span> : null}
      </div>
      <button onClick={onChoose} type="button" className={`mt-4 w-full rounded-2xl px-4 py-2 text-xs font-bold transition-all ${featured ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-950 text-white hover:-translate-y-0.5'}`}>
        {cta}
      </button>
    </div>
  );
}

function FieldRow({ label, value, onCopy, copyValue, copied, highlight = false, mono = false, badge = false }: { label: string; value: string; onCopy?: () => void; copyValue?: string; copied?: boolean; highlight?: boolean; mono?: boolean; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 py-2.5 last:border-b-0 last:pb-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className={`text-sm font-bold ${highlight ? 'text-indigo-600' : 'text-slate-900'} ${mono ? 'font-mono' : ''} ${badge ? 'rounded-md bg-amber-100 px-2 py-1 text-xs tracking-wide text-amber-800' : ''}`}>{value}</span>
        {onCopy && copyValue ? (
          <button onClick={onCopy} className="rounded-lg border border-slate-200 bg-white p-1.5 text-indigo-600 transition hover:bg-slate-50" title="Sao chép">
            {copied ? 'Đã chép' : <Copy className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}
