import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Clock, PlayCircle, Filter, LayoutDashboard, History, Search, Users, User } from 'lucide-react';
import ExamWorkspace from './ExamWorkspace';
import { StudentDashboard, StudentHistory, StudentProfile } from './StudentPages';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getCategoryBadgeStyle } from '../components/ExamManager';

function RequireLogin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('hmath_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    const saved = localStorage.getItem('hmath_user');
    if (!saved) {
      navigate('/login');
      setLoading(false);
      return;
    }

    if (user) {
      setLoading(false);
    }

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setLoading(false);
      } else {
        const currentPath = window.location.pathname;
        const isExamPage = currentPath.includes('/exam/');
        if (!isExamPage && !localStorage.getItem('hmath_user')) {
          localStorage.removeItem('hmath_user');
          navigate('/login');
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-sm font-medium text-slate-500">Đang đồng bộ phiên đăng nhập...</p>
      </div>
    );
  }
  return user ? children : null;
}

export default function StudentApp() {
  return (
    <Routes>
      <Route path="/exam/:id" element={<RequireLogin><ExamWorkspace /></RequireLogin>} />
      <Route path="/*" element={<StudentLayout />} />
    </Routes>
  );
}

function StudentLayout() {
  const location = useLocation();
  const path = location.pathname;
  const userStr = localStorage.getItem('hmath_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const getLinkClass = (p: string) => {
    return `w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${
      path === p
        ? 'bg-indigo-600 text-white shadow-md'
        : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
    }`;
  };

  return (
    <div className={`flex flex-col ${user ? 'md:flex-row gap-8' : ''} animate-in fade-in duration-300`}>
      {user && (
      <div className="w-full md:w-64 shrink-0 space-y-2 md:sticky md:top-24 h-max">
         <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4 px-2">Menu Học Tập</h3>
         <Link to="/" className={getLinkClass('/')}>
           <BookOpen className="w-5 h-5" /> Luyện thi Toán
         </Link>
         <Link to="/dashboard" className={getLinkClass('/dashboard')}>
           <LayoutDashboard className="w-5 h-5" /> Tổng quan
         </Link>
         <Link to="/history" className={getLinkClass('/history')}>
           <History className="w-5 h-5" /> Lịch sử làm bài
         </Link>
         <Link to="/profile" className={getLinkClass('/profile')}>
           <User className="w-5 h-5" /> Tài khoản / Cá nhân
         </Link>
      </div>
      )}
      <div className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/dashboard" element={<RequireLogin><StudentDashboard /></RequireLogin>} />
          <Route path="/history" element={<RequireLogin><StudentHistory /></RequireLogin>} />
          <Route path="/profile" element={<RequireLogin><StudentProfile /></RequireLogin>} />
        </Routes>
      </div>
    </div>
  );
}

type ExamSummary = {
  id: string;
  title: string;
  grade: number;
  timeLimit: number;
  questionCount: number;
  totalScore: number;
  submissionCount: number;
  difficulty: 'Cơ bản' | 'Trung bình' | 'Nâng cao';
  category: string;
  createdAtMs: number;
};

function StudentHome() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<number | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Cơ bản' | 'Trung bình' | 'Nâng cao'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const parseCreatedAtMs = (value: any): number => {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (typeof value === 'number') return value;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const mapExamDoc = (id: string, data: any): ExamSummary => ({
    id,
    title: data.title || 'Đề thi không tiêu đề',
    grade: Number(data.grade) || 0,
    timeLimit: Number(data.timeLimit) || 0,
    questionCount: Array.isArray(data.questions) ? data.questions.length : Number(data.questionCount) || 0,
    totalScore: Number(data.totalScore) || 10,
    submissionCount: Number(data.submissionCount) || Number(data.attemptCount) || 0,
    difficulty: data.difficulty || 'Trung bình',
    category: data.category || 'Đề ôn tập bài học/chương',
    createdAtMs: parseCreatedAtMs(data.createdAt),
  });

  const toSortedExamList = (snapshot: any): ExamSummary[] => {
    const nextExams: ExamSummary[] = [];
    snapshot.forEach((doc: any) => {
      nextExams.push(mapExamDoc(doc.id, doc.data()));
    });
    nextExams.sort((a, b) => b.createdAtMs - a.createdAtMs);
    return nextExams;
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const examsRef = collection(db, 'exams');
    const userStr = localStorage.getItem('hmath_user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
    const examsQuery = isPrivileged ? query(examsRef) : query(examsRef, where('isPublic', '==', true));

    const unsubscribe = onSnapshot(
      examsQuery,
      (examSnap) => {
        setExams(toSortedExamList(examSnap));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error subscribing to exams:', err);
        getDocs(examsQuery)
          .then((examSnap) => {
            setExams(toSortedExamList(examSnap));
            setLoading(false);
            setError(null);
          })
          .catch((fallbackErr) => {
            const message = err instanceof Error ? err.message : String(err);
            const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
            setError(`Lỗi tải đề thi: ${message || fallbackMessage}`);
            setLoading(false);
          });
      }
    );

    return () => unsubscribe();
  }, []);

  const filtered = exams.filter(e => {
    const matchGrade = filterMode === 'all' || String(e.grade) === String(filterMode);
    const matchDifficulty = difficultyFilter === 'all' || e.difficulty === difficultyFilter;
    const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchQuery = (e.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchGrade && matchDifficulty && matchCategory && matchQuery;
  }).slice(0, 15);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center py-12 px-4 rounded-3xl bg-gradient-to-br from-indigo-700 to-slate-900 text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <BookOpen className="w-64 h-64 rotate-12" />
         </div>
         <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight relative z-10">Luyện thi Toán cùng HMath</h1>
         <p className="text-indigo-100 text-lg max-w-2xl mx-auto relative z-10 px-4">Hệ thống thi trắc nghiệm thông minh</p>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm đề thi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar sm:pb-0">
             <div className="px-2.5 py-2 font-semibold text-slate-400 text-xs uppercase flex items-center gap-1 flex-shrink-0">Khối:</div>
             <button onClick={() => setFilterMode('all')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors ${filterMode === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600 bg-slate-50'}`}>Tất cả</button>
             {[5,6,7,8,9].map(grade => (
                <button key={grade} onClick={() => setFilterMode(grade)} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors ${filterMode === grade ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600 bg-slate-50'}`}>
                  {grade === 5 ? 'Thi vào lớp 6' : `Lớp ${grade}`}
                </button>
             ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-400 pr-1 uppercase flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Mức độ:</div>
          <button onClick={() => setDifficultyFilter('all')} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${difficultyFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-transparent'}`}>Tất cả mức độ</button>
          <button onClick={() => setDifficultyFilter('Cơ bản')} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border border-transparent ${difficultyFilter === 'Cơ bản' ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'hover:bg-blue-50/40 text-blue-600 bg-slate-50'}`}><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Cơ bản</button>
          <button onClick={() => setDifficultyFilter('Trung bình')} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border border-transparent ${difficultyFilter === 'Trung bình' ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' : 'hover:bg-amber-50/40 text-amber-600 bg-slate-50'}`}><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Trung bình</button>
          <button onClick={() => setDifficultyFilter('Nâng cao')} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border border-transparent ${difficultyFilter === 'Nâng cao' ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm' : 'hover:bg-rose-50/40 text-rose-600 bg-slate-50'}`}><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Nâng cao</button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-400 pr-1 uppercase flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Danh mục:</div>
          <button onClick={() => setCategoryFilter('all')} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${categoryFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-transparent'}`}>Tất cả danh mục</button>
          {(['Đề ôn tập bài học/chương', 'Đề ôn tập GHK1', 'Đề ôn tập HK1', 'Đề ôn tập GHK2', 'Đề ôn tập HK2', 'Đề khảo sát', 'Đề HSG'] as string[]).map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border border-transparent ${categoryFilter === cat ? `${getCategoryBadgeStyle(cat)} !border-slate-300 shadow-sm font-extrabold` : 'hover:bg-slate-100 text-slate-600 bg-slate-100/50'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white/50 rounded-3xl border border-slate-100/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Đang tải danh sách đề thi...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-4">
          <p className="font-bold text-red-600 text-lg">Lỗi kết nối máy chủ!</p>
          <p className="text-sm text-red-500 leading-relaxed font-mono bg-white p-4 rounded-xl border border-red-100 text-left overflow-x-auto max-h-40">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm text-sm">Tải lại trang</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(exam => <ExamCard key={exam.id} exam={exam} />)}
          {filtered.length === 0 && <div className="col-span-full py-20 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-100">Không có đề thi nào cho bộ lọc này.</div>}
        </div>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: any }) {
  const attemptsCount = exam.submissionCount || 0;

  return (
    <div className="group bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-400 p-6 flex flex-col transition-all hover:shadow-lg hover:-translate-y-1 h-full relative">
      <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-100 flex items-center gap-1">
        <Users className="w-3.5 h-3.5" />
        {attemptsCount} lượt thi
      </div>
      <div className="flex-1 mt-6">
        <div className="flex items-start justify-between mb-5">
           <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
             <BookOpen className="w-6 h-6" />
           </div>
           <div className="flex flex-col items-end gap-1.5 translate-y-1">
             <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-full border border-emerald-100 uppercase inline-block shrink-0 leading-none">{exam.grade === 5 ? 'THI VÀO 6' : `TOÁN ${exam.grade}`}</span>
             <span className={`font-bold text-[10px] px-2.5 py-1 rounded-full border inline-block shrink-0 uppercase tracking-wide leading-none ${exam.difficulty === 'Cơ bản' ? 'bg-blue-50 text-blue-700 border-blue-100' : exam.difficulty === 'Nâng cao' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{exam.difficulty || 'Trung bình'}</span>
             <span className={`font-bold text-[10px] px-2.5 py-1 rounded-full border inline-block shrink-0 uppercase tracking-wide leading-none ${getCategoryBadgeStyle(exam.category)}`}>{exam.category || 'Đề ôn tập bài học/chương'}</span>
           </div>
        </div>
        <h3 className="font-bold text-lg text-slate-800 mb-2 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">{exam.title}</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500 mt-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-4 h-4 text-slate-400" /> {Math.floor(exam.timeLimit / 60)} phút</div>
          <div className="w-px h-4 bg-slate-200 hidden xs:block"></div>
          <div className="flex items-center gap-1.5 whitespace-nowrap"><BookOpen className="w-4 h-4 text-slate-400" /> {exam.questionCount} câu</div>
        </div>
      </div>
      <Link to={`/exam/${exam.id}`} className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-50 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white font-bold py-3.5 rounded-xl transition-all shadow-sm group-hover:shadow-indigo-600/30">
        <PlayCircle className="w-5 h-5" /> Vào thi ngay
      </Link>
    </div>
  );
}
