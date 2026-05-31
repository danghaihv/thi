/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, LogOut } from 'lucide-react';
import StudentApp from './views/StudentApp';
import TeacherApp from './views/TeacherApp';
import Login from './views/Login';

export default function App() {
  const location = useLocation();
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

  const handleLogout = () => {
    localStorage.removeItem('hmath_user');
    setUser(null);
    navigate('/login');
  };

  const isTeacher = location.pathname.startsWith('/admin') || user?.role === 'teacher' || user?.role === 'admin';

  // Redirect to login if trying to access admin without user
  if (!user && location.pathname.startsWith('/admin')) {
     return <Login onLogin={(u) => { setUser(u); localStorage.setItem('hmath_user', JSON.stringify(u)); navigate(u.role === 'student' ? '/' : '/admin'); }} />;
  }

  if (location.pathname === '/login' && user) {
     navigate(user.role === 'student' ? '/' : '/admin');
  }

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 w-full animate-in slide-in-from-top duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3 text-indigo-600">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <GraduationCap className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight text-blue-600">
              HMath Exam
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
               <div className="flex bg-slate-100 p-1 rounded-lg">
                 <Link
                   to="/"
                   className={`px-3 py-1.5 md:px-5 md:py-2 flex items-center gap-2 text-sm font-medium rounded-md transition-all ${user.role === 'student' && !location.pathname.startsWith('/admin') ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                 >
                   <GraduationCap className="w-4 h-4"/> Học sinh
                 </Link>
                 {(user.role === 'teacher' || user.role === 'admin') && (
                   <Link
                     to="/admin"
                     className={`px-3 py-1.5 md:px-5 md:py-2 flex items-center gap-2 text-sm font-medium rounded-md transition-all ${location.pathname.startsWith('/admin') ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                   >
                     <LayoutDashboard className="w-4 h-4"/> Quản lý
                   </Link>
                 )}
               </div>
               <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 transition-colors" title="Đăng xuất">
                 <LogOut className="w-5 h-5"/>
               </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors">
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-16rem)]">
        <Routes>
          <Route path="/login" element={<Login onLogin={(u) => { setUser(u); localStorage.setItem('hmath_user', JSON.stringify(u)); navigate(u.role === 'student' ? '/' : '/admin'); }} />} />
          <Route path="/*" element={<StudentApp />} />
          <Route path="/admin/*" element={<TeacherApp />} />
        </Routes>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-blue-600">HMath Exam</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} HMath Exam. Phát triển bởi HMath.
          </p>
        </div>
      </footer>
    </div>
  );
}
