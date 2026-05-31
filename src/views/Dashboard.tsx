import { useState, useEffect } from 'react';
import { Users, BookOpen, Clock, Activity, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

type WindowType = '7d' | '30d' | 'all';

function parseTimeMs(value: any): number {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getRangeStartMs(windowType: WindowType): number {
  if (windowType === 'all') return 0;
  const days = windowType === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export default function Dashboard() {
  const [timeWindow, setTimeWindow] = useState<WindowType>('7d');
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubUsers: (() => void) | null = null;
    let unsubExams: (() => void) | null = null;
    let unsubSubs: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    const attachListeners = () => {
      setError(null);
      setIsLoading(true);

      unsubUsers = onSnapshot(
        query(collection(db, 'users'), where('role', '==', 'student')),
        (usersSnap) => {
          setStudents(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setIsLoading(false);
        },
        (err) => {
          console.error('Error loading students:', err);
          setError('Không thể tải danh sách học sinh');
          setIsLoading(false);
        }
      );

      unsubExams = onSnapshot(
        collection(db, 'exams'),
        (examsSnap) => {
          setExams(examsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
          console.error('Error loading exams:', err);
          setError('Không thể tải danh sách đề thi');
        }
      );

      unsubSubs = onSnapshot(
        collection(db, 'submissions'),
        (subsSnap) => {
          setSubmissions(subsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
          console.error('Error loading submissions:', err);
          setError('Không thể tải kết quả bài thi');
        }
      );
    };

    if (auth.currentUser) {
      attachListeners();
    } else {
      unsubAuth = auth.onAuthStateChanged((user) => {
        if (user) {
          attachListeners();
        }
      });
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubExams) unsubExams();
      if (unsubSubs) unsubSubs();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const rangeStartMs = getRangeStartMs(timeWindow);

  const studentsInWindow = timeWindow === 'all'
    ? students
    : students.filter((s) => parseTimeMs(s.createdAt) >= rangeStartMs);

  const submissionsInWindow = timeWindow === 'all'
    ? submissions
    : submissions.filter((s) => parseTimeMs(s.submittedAt) >= rangeStartMs);

  const examsInWindow = timeWindow === 'all'
    ? exams
    : exams.filter((e) => parseTimeMs(e.createdAt) >= rangeStartMs);

  const totalSeconds = submissionsInWindow.reduce((acc, curr) => acc + Number(curr.timeSpent || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const timeString = totalSeconds === 0 ? '0 phút' : (hours > 0 ? `${hours}h ${minutes}p` : `${minutes} phút`);

  const totalStudentsDisplay = studentsInWindow.length;

  useEffect(() => {
    if (submissions.length === 0) {
      const days = timeWindow === 'all' ? 30 : (timeWindow === '7d' ? 7 : 30);
      const now = new Date();
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const name = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        data.push({ name, activeUsers: 0 });
      }
      setChartData(data);
      return;
    }

    const days = timeWindow === 'all' ? 30 : (timeWindow === '7d' ? 7 : 30);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const result: any[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const activeUserIds = new Set(
        submissions
          .filter((s) => {
            const t = parseTimeMs(s.submittedAt);
            return t >= start.getTime() && t <= end.getTime();
          })
          .map((s) => String(s.studentId || ''))
          .filter(Boolean)
      );

      result.push({
        name: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        activeUsers: activeUserIds.size
      });
    }

    setChartData(result);
  }, [submissions, timeWindow]);

  const studentTitle = timeWindow === 'all' ? 'Tổng Học Sinh' : 'Học sinh mới';
  const chartTitle = `Biểu đồ user hoạt động ${timeWindow === 'all' ? '30 ngày gần nhất' : (timeWindow === '7d' ? '7 ngày qua' : '30 ngày qua')}`;

  if (isLoading) {
    return <div className="py-20 text-center animate-pulse text-slate-500">Đang tải biểu đồ...</div>;
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-6 py-3 rounded-lg border border-amber-200">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Hệ thống</h2>
          <p className="text-slate-500">Thống kê hoạt động làm bài và người dùng tổng quát</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khung thời gian:</span>
          <button onClick={() => setTimeWindow('7d')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${timeWindow === '7d' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>7 ngày</button>
          <button onClick={() => setTimeWindow('30d')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${timeWindow === '30d' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>30 ngày</button>
          <button onClick={() => setTimeWindow('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${timeWindow === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Toàn thời gian</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={studentTitle} value={totalStudentsDisplay.toString()} icon={<Users className="w-6 h-6 text-blue-600" />} />
        <StatCard title="Tổng Lượt Thi" value={submissionsInWindow.length.toString()} icon={<Activity className="w-6 h-6 text-emerald-600" />} />
        <StatCard title="Tổng Số Đề Thi" value={examsInWindow.length.toString()} icon={<BookOpen className="w-6 h-6 text-amber-600" />} />
        <StatCard title="Tổng Giờ Học" value={timeString} icon={<Clock className="w-6 h-6 text-indigo-600" />} />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
         <h3 className="text-lg font-bold text-slate-800 mb-6">{chartTitle}</h3>
         <div className="h-80 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActiveUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} allowDecimals={false} />
                <Tooltip contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="activeUsers" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorActiveUsers)" name="User hoạt động" />
             </AreaChart>
           </ResponsiveContainer>
         </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: any }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
       <div className="flex items-start justify-between mb-4">
         <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
       </div>
       <div>
         <div className="text-3xl font-bold text-slate-800 tracking-tight">{value}</div>
         <div className="text-sm font-medium text-slate-500 mt-1">{title}</div>
       </div>
    </div>
  )
}
