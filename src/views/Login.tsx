import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, BookOpenCheck, GraduationCap, Sparkles, ShieldCheck } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const initialUserData = {
        email: user.email,
        name: user.displayName || 'Google User',
        role: user.email === 'pdanghai.mmo@gmail.com' ? 'teacher' : 'student',
        uid: user.uid,
      };

      onLogin(initialUserData);
      localStorage.setItem('hmath_user', JSON.stringify(initialUserData));

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc?.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            name: user.displayName || 'Google User',
            role: user.email === 'pdanghai.mmo@gmail.com' ? 'teacher' : 'student',
          });
        } else if (user.email === 'pdanghai.mmo@gmail.com') {
          await setDoc(userDocRef, { role: 'teacher' }, { merge: true });
        }
      } catch (firestoreErr) {
        console.warn('Firestore sync failed (non-blocking):', firestoreErr);
      }

      const savedTarget = localStorage.getItem('hmath_after_login');
      setTimeout(() => {
        if (savedTarget && initialUserData.role === 'student') {
          localStorage.removeItem('hmath_after_login');
          navigate(savedTarget);
        } else {
          navigate(initialUserData.role === 'student' ? '/' : '/admin');
        }
      }, 100);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-11rem)] max-w-6xl items-center px-4 py-8">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden bg-slate-950 px-8 py-10 text-white sm:px-10 sm:py-12">
          <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at top left, rgba(99,102,241,0.35), transparent 40%), radial-gradient(circle at bottom right, rgba(16,185,129,0.20), transparent 36%)' }} />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px] opacity-20" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-white/80">
                <Sparkles className="h-4 w-4" /> HMath Exam
              </div>
              <h1 className="section-title max-w-md text-4xl font-bold leading-[1.05] sm:text-5xl">
                Luyện thi toán với trải nghiệm rõ ràng, gọn và tập trung.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-white/72 sm:text-base">
                Một không gian học tập cho học sinh, giáo viên và quản trị đề thi — đồng bộ từ luyện đề, lịch sử, nâng cấp VIP đến quản lý hệ thống.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Luyện đề', 'Bộ đề theo khối, mức độ và chuyên đề.'],
                ['Quản lý', 'Tạo, sửa, lọc và xuất bản đề nhanh.'],
                ['Nâng cấp', 'VIP, thanh toán và theo dõi trạng thái.'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                  <div className="font-semibold">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-white/65">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mx-auto flex max-w-md flex-col justify-center">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="section-title text-2xl font-bold text-slate-950">Đăng nhập</div>
                <div className="text-sm text-slate-500">Vào hệ thống với tài khoản Google</div>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p>Hệ thống tự đồng bộ hồ sơ người dùng và tự điều hướng theo vai trò học sinh hoặc giáo viên.</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="animate-pulse">Đang kết nối Google...</span>
              ) : (
                <>
                  <BookOpenCheck className="h-5 w-5" />
                  <span>Tiếp tục với Google</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-6 text-xs leading-5 text-slate-500">
              Sau khi đăng nhập, bạn sẽ được đưa về đúng vai trò và không cần thao tác lại.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
