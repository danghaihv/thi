/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, LogOut, ChevronRight } from 'lucide-react';
const StudentApp = lazy(() => import('./views/StudentApp'));
const TeacherApp = lazy(() => import('./views/TeacherApp'));
const Login = lazy(() => import('./views/Login'));
const LoadingShell = () => <div className="mx-auto flex max-w-md items-center justify-center rounded-[2rem] border border-slate-200 bg-white px-6 py-16 text-sm font-medium text-slate-500 shadow-sm">Đang tải giao diện...</div>;

function readUser() {
  const saved = localStorage.getItem('hmath_user');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(() => readUser());

  useEffect(() => {
    setUser(readUser());
  }, [location.pathname]);

  const handleLogin = (u: any) => {
    setUser(u);
    localStorage.setItem('hmath_user', JSON.stringify(u));
    navigate(u.role === 'student' ? '/' : '/admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('hmath_user');
    setUser(null);
    navigate('/login');
  };

  const isAdminPath = location.pathname.startsWith('/admin');
  const isAuthenticated = Boolean(user);

  if (!user && isAdminPath) {
    return (
      <Suspense fallback={<LoadingShell />}>
        <Login onLogin={handleLogin} />
      </Suspense>
    );
  }

  if (location.pathname === '/login' && user) {
    return <Navigate to={user.role === 'student' ? '/' : '/admin'} replace />;
  }

  return (
    <div className="app-shell min-h-screen flex flex-col text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="section-title text-lg font-bold leading-none text-slate-950 md:text-xl">HMath Exam</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Luyện thi trực tuyến</div>
            </div>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden rounded-full border border-slate-200 bg-white p-1 shadow-sm md:flex">
                  <Link
                    to="/"
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${!isAdminPath ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    Học sinh
                  </Link>
                  {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <Link
                      to="/admin"
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${isAdminPath ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Quản trị
                    </Link>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  title="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5"
              >
                Đăng nhập
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8">
        <Suspense fallback={<LoadingShell />}>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/*" element={<StudentApp />} />
            <Route path="/admin/*" element={<TeacherApp />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="border-t border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">HMath Exam</div>
              <div className="text-xs text-slate-500">Nền tảng luyện thi & quản lý đề toán</div>
            </div>
          </div>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} HMath. Designed for focused learning.</p>
        </div>
      </footer>
    </div>
  );
}
