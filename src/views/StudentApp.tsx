import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, History, User, Sparkles } from 'lucide-react';
import ExamWorkspace from './ExamWorkspace';
import { StudentDashboard, StudentHistory, StudentProfile, StudentUpgradeHub } from './StudentPages';
import { StudentCheckout } from './StudentCheckoutPage.tmp';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getCategoryBadgeStyle } from '../components/ExamManager';

function readLocalUser() {
  const saved = localStorage.getItem('hmath_user');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function saveReturnPath() {
  localStorage.setItem('hmath_after_login', `${window.location.pathname}${window.location.search}`);
}

function RequireLogin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(() => readLocalUser());
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    const saved = localStorage.getItem('hmath_user');
    if (!saved) {
      saveReturnPath();
      navigate('/login');
      setLoading(false);
      return;
    }

    if (user) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setLoading(false);
      } else if (!localStorage.getItem('hmath_user')) {
        localStorage.removeItem('hmath_user');
        saveReturnPath();
        navigate('/login');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, user]);

  if (loading) {
    return <div className="glass-panel mx-auto flex max-w-md flex-col items-center justify-center rounded-[2rem] px-6 py-16 text-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" /><p className="mt-4 text-sm font-medium text-slate-500">Đang đồng bộ phiên đăng nhập...</p></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
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
  const user = useMemo(() => readLocalUser(), [location.pathname]);
  const navItems = [
    { to: '/', label: 'Luyện thi', icon: BookOpen },
    { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/history', label: 'Lịch sử', icon: History },
    { to: '/upgrade', label: 'Nâng cấp', icon: Sparkles },
    { to: '/profile', label: 'Tài khoản', icon: User },
  ];
  const isActive = (itemPath: string) => path === itemPath || (itemPath === '/upgrade' && path === '/checkout');
  const getLinkClass = (p: string) => `flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition-all ${path === p ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {user ? <aside className="glass-panel rounded-[2rem] p-4 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:self-start"><div className="rounded-[1.5rem] bg-gradient-to-br from-indigo-600 via-slate-900 to-slate-950 px-5 py-5 text-white shadow-xl shadow-slate-950/10"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75"><Sparkles className="h-3.5 w-3.5" /> Học sinh</div><div className="mt-4 text-2xl font-bold leading-tight">{user.name || user.fullName || 'Học sinh'}</div><p className="mt-2 text-sm text-white/70">Tiếp tục luyện đề, xem tiến trình và quản lý tài khoản.</p></div><nav className="mt-4 space-y-1.5">{navItems.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} className={getLinkClass(isActive(item.to) ? item.to : '')}><Icon className="h-4 w-4" /><span>{item.label}</span></Link>; })}</nav><div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><div className="flex items-center gap-2 text-slate-900 font-semibold"><Sparkles className="h-4 w-4 text-indigo-600" /> Trạng thái</div><p className="mt-2 text-sm leading-6">Tài khoản được đồng bộ tự động với Firebase và Firestore.</p></div></aside> : null}

      <div className="min-w-0 space-y-6">
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/dashboard" element={<RequireLogin><StudentDashboard /></RequireLogin>} />
          <Route path="/history" element={<RequireLogin><StudentHistory /></RequireLogin>} />
          <Route path="/upgrade" element={<RequireLogin><StudentUpgradeHub /></RequireLogin>} />
          <Route path="/checkout" element={<RequireLogin><StudentCheckout /></RequireLogin>} />
          <Route path="/profile" element={<RequireLogin><StudentProfile /></RequireLogin>} />
        </Routes>
      </div>
    </div>
  );
}

function StudentHome() {
  return <div className="glass-panel rounded-[2rem] p-8 text-sm text-slate-500">Đang tải...</div>;
}
