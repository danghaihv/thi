import { useState, useEffect } from 'react';
import { Users, BookOpen, Clock, TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard() {
  const [stats, setStats] = useState({
     totalStudents: 0,
     totalSubmissions: 0,
     totalExams: 0,
     totalTimeDeci: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // We use getDocs for users/exams initially and onSnapshot for submissions which change often. 
    // Or we can use onSnapshot for all of them for full realtime.
    
    // Realtime listeners
    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (usersSnap) => {
       setStats(prev => ({ ...prev, totalStudents: usersSnap.size }));
    });

    const unsubExams = onSnapshot(collection(db, 'exams'), (examsSnap) => {
       setStats(prev => ({ ...prev, totalExams: examsSnap.size }));
    });

    const unsubSubs = onSnapshot(collection(db, 'submissions'), (subsSnap) => {
        let totalTime = 0;
        const subs = subsSnap.docs.map(d => d.data());
        subs.forEach(s => {
           totalTime += (s.timeSpent || 0);
        });

        setStats(prev => ({
          ...prev,
          totalSubmissions: subsSnap.size,
          totalTimeDeci: totalTime
        }));

        // Generate chart data
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
           const date = new Date(today);
           date.setDate(date.getDate() - i);
           
           const startOfDay = new Date(date);
           const endOfDay = new Date(date);
           endOfDay.setHours(23, 59, 59, 999);
           
           const dayHistory = subs.filter(h => {
              const d = new Date(h.submittedAt);
              return d >= startOfDay && d <= endOfDay;
           });
           
           const dayName = date.toLocaleDateString('vi-VN', { weekday: 'short' });
           result.push({
              name: dayName,
              luyen: dayHistory.length,
              thi: dayHistory.length
           });
        }
        setChartData(result);
        setIsLoading(false);
    });

    return () => {
       unsubUsers();
       unsubExams();
       unsubSubs();
    };
  }, []);

  const totalSeconds = stats.totalTimeDeci;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const timeString = totalSeconds === 0 ? '0 phút' : (hours > 0 ? `${hours}h ${minutes}p` : `${minutes} phút`);

  if (isLoading) {
    return <div className="py-20 text-center animate-pulse text-slate-500">Đang tải biểu đồ...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Hệ thống</h2>
          <p className="text-slate-500">Thống kê hoạt động làm bài và người dùng tổng quát</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng Học Sinh" value={stats.totalStudents.toString()} icon={<Users className="w-6 h-6 text-blue-600" />} />
        <StatCard title="Tổng Lượt Thi" value={stats.totalSubmissions.toString()} icon={<Activity className="w-6 h-6 text-emerald-600" />} />
        <StatCard title="Tổng Số Đề Thi" value={stats.totalExams.toString()} icon={<BookOpen className="w-6 h-6 text-amber-600" />} />
        <StatCard title="Tổng Giờ Học" value={timeString} icon={<Clock className="w-6 h-6 text-indigo-600" />} />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
         <h3 className="text-lg font-bold text-slate-800 mb-6">Biểu đồ lượt làm bài 7 ngày qua</h3>
         <div className="h-80 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} allowDecimals={false} />
                <Tooltip contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="thi" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorThi)" name="Lượt Thi" />
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
