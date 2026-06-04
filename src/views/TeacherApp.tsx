import { lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, FileText, BarChart3, Settings, ArrowLeft } from 'lucide-react';
const Dashboard = lazy(() => import('./Dashboard'));
const TeacherExams = lazy(() => import('./TeacherPages').then((m) => ({ default: m.TeacherExams })));
const TeacherUsers = lazy(() => import('./TeacherPages').then((m) => ({ default: m.TeacherUsers })));
const TeacherSettings = lazy(() => import('./TeacherPages').then((m) => ({ default: m.TeacherSettings })));
const LoadingPanel = () => <div className="glass-panel rounded-[2rem] px-6 py-16 text-center text-sm font-medium text-slate-500">Đang tải bảng quản trị...</div>;

export default function TeacherApp() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { to: '/admin', label: 'Tổng quan', icon: BarChart3 },
    { to: '/admin/exams', label: 'Đề thi', icon: FileText },
    { to: '/admin/users', label: 'Học sinh', icon: Users },
    { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
  ];

  const getLinkClass = (p: string) => {
    return `flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition-all ${
      path === p || (path.startsWith(p) && p !== '/admin')
        ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
        : 'text-slate-600 hover:bg-slate-100'
    }`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="glass-panel rounded-[2rem] p-4 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:self-start">
        <div className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-white shadow-xl shadow-slate-950/10">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Quản trị</div>
          <div className="mt-2 text-2xl font-bold leading-tight">HMath Admin</div>
          <p className="mt-2 text-sm text-white/70">Quản lý đề thi, học sinh và cấu hình hệ thống.</p>
        </div>

        <nav className="mt-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={getLinkClass(item.to)}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link to="/" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
          Về trang học sinh
        </Link>
      </aside>

      <section className="min-w-0 space-y-6">
        <Suspense fallback={<LoadingPanel />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/exams" element={<TeacherExams />} />
            <Route path="/users" element={<TeacherUsers />} />
            <Route path="/settings" element={<TeacherSettings />} />
          </Routes>
        </Suspense>
      </section>
    </div>
  );
}
