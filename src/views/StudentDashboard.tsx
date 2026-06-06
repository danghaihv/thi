import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, Clock, Sparkles, Target, Trophy } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

function formatScore(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

function getScoreFromSubmission(row: any) {
  return row.scoreEarned !== undefined ? row.scoreEarned : (row.score / row.total) * (row.examTotalScore || 10);
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
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindowDays, setTimeWindowDays] = useState<7 | 30>(7);

  useEffect(() => {
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

    if (!auth.currentUser) {
      const unsub = auth.onAuthStateChanged((user) => {
        if (user) loadHistory(user.uid);
      });
      return () => unsub();
    }

    loadHistory(auth.currentUser.uid);
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
    return <div className="glass-panel rounded-[2rem] py-20 text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" /><p className="mt-4 text-sm font-medium text-slate-500">Đang tải dữ liệu...</p></div>;
  }

  if (error) {
    return <div className="glass-panel rounded-[2rem] p-8 text-center"><div className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"><AlertCircle className="h-4 w-4" /><span>{error}</span></div></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="glass-panel overflow-hidden rounded-[2rem] border-slate-200/70 bg-gradient-to-br from-white via-white to-indigo-50/60 p-6 shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700"><Sparkles className="h-3.5 w-3.5" /> Tổng quan học tập</div>
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl section-title">Theo dõi tiến trình, nhịp độ làm bài và kết quả luyện tập.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">Dữ liệu được cập nhật từ các bài thi gần nhất để bạn nhìn rõ xu hướng học tập của mình.</p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Khung thời gian</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">Tổng hợp gần đây</div>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white"><Target className="h-5 w-5" /></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">{[7, 30].map((days) => <button key={days} onClick={() => setTimeWindowDays(days as 7 | 30)} className={`rounded-2xl px-4 py-3 text-sm font-bold transition-all ${timeWindowDays === days ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{days} ngày</button>)}</div>
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
          <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 md:inline-flex">{timeWindowDays === 7 ? '7 ngày gần nhất' : '30 ngày gần nhất'}</div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}><defs><linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 10]} dx={-10} /><Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15,23,42,0.08)', padding: '12px' }} /><Area type="monotone" dataKey="diem" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#scoreGradient)" name="Điểm số" /></AreaChart></ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
