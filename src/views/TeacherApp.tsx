import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, FileText, BarChart3, Settings } from 'lucide-react';
import Dashboard from './Dashboard';
import { TeacherExams, TeacherUsers, TeacherSettings } from './TeacherPages';

export default function TeacherApp() {
  const location = useLocation();
  const path = location.pathname;

  const getLinkClass = (p: string) => {
    return `w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-colors ${
      path === p || (path.startsWith(p) && p !== '/admin')
        ? 'bg-indigo-600 text-white shadow-md'
        : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
    }`;
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-300">
       {/* Sidebar */}
       <div className="w-full md:w-64 shrink-0 space-y-2 md:sticky md:top-24 h-max">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4 px-2">Menu Quản trị</h3>
          <Link to="/admin" className={getLinkClass('/admin')}>
            <BarChart3 className="w-5 h-5" /> Tổng quan
          </Link>
          <Link to="/admin/exams" className={getLinkClass('/admin/exams')}>
            <FileText className="w-5 h-5" /> Quản lý Đề thi
          </Link>
          <Link to="/admin/users" className={getLinkClass('/admin/users')}>
            <Users className="w-5 h-5" /> Học sinh & Lớp
          </Link>
          <Link to="/admin/settings" className={getLinkClass('/admin/settings')}>
            <Settings className="w-5 h-5" /> Cài đặt hệ thống
          </Link>
       </div>

       {/* Content */}
       <div className="flex-1 min-w-0 bg-white md:bg-transparent rounded-3xl md:rounded-none p-4 md:p-0 border border-slate-100 md:border-none shadow-sm md:shadow-none">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/exams" element={<TeacherExams />} />
            <Route path="/users" element={<TeacherUsers />} />
            <Route path="/settings" element={<TeacherSettings />} />
          </Routes>
       </div>
    </div>
  );
}
