/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, LogOut, ChevronRight, FileText, ShieldCheck, Mail } from 'lucide-react';
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

function StaticPageShell({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-700 px-6 py-10 text-white shadow-xl sm:px-10">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
          {icon}
          <span>Thông tin hệ thống</span>
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">{description}</p>
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
          {children}
        </div>
      </section>
    </div>
  );
}

function PolicyPage() {
  return (
    <StaticPageShell
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Chính sách"
      description="Các nguyên tắc cơ bản về cách HMath Exam thu thập, sử dụng và bảo vệ thông tin khi học sinh sử dụng nền tảng luyện đề trực tuyến."
    >
      <h2>1. Thông tin được sử dụng</h2>
      <p>HMath Exam có thể lưu các thông tin cần thiết để vận hành hệ thống như họ tên, email đăng nhập, lịch sử làm bài và trạng thái tài khoản.</p>
      <h2>2. Mục đích sử dụng</h2>
      <p>Dữ liệu được dùng để xác thực đăng nhập, hiển thị lịch sử học tập, hỗ trợ luyện đề trực tuyến và cải thiện trải nghiệm sử dụng.</p>
      <h2>3. Bảo mật dữ liệu</h2>
      <p>Hệ thống áp dụng các cơ chế xác thực và kiểm soát truy cập để hạn chế việc truy cập trái phép. Người dùng cần tự bảo mật tài khoản Google của mình khi đăng nhập.</p>
      <h2>4. Chia sẻ thông tin</h2>
      <p>Thông tin người dùng không được chia sẻ cho bên thứ ba ngoài phạm vi cần thiết để vận hành hệ thống, trừ khi có yêu cầu từ cơ quan có thẩm quyền theo quy định pháp luật.</p>
      <h2>5. Cập nhật chính sách</h2>
      <p>Nội dung chính sách có thể được điều chỉnh theo nhu cầu vận hành thực tế. Phiên bản mới sẽ có hiệu lực ngay khi được công bố trên hệ thống.</p>
    </StaticPageShell>
  );
}

function TermsPage() {
  return (
    <StaticPageShell
      icon={<FileText className="h-4 w-4" />}
      title="Điều khoản sử dụng"
      description="Các điều kiện cơ bản áp dụng khi người dùng truy cập, đăng nhập và sử dụng các tính năng luyện đề, theo dõi kết quả và nâng cấp tài khoản trên HMath Exam."
    >
      <h2>1. Phạm vi sử dụng</h2>
      <p>Người dùng được phép sử dụng hệ thống cho mục đích học tập và luyện đề trực tuyến phù hợp với các chức năng hiện có.</p>
      <h2>2. Trách nhiệm tài khoản</h2>
      <p>Người dùng chịu trách nhiệm với mọi hoạt động phát sinh từ tài khoản của mình và cần đảm bảo thông tin đăng nhập được giữ an toàn.</p>
      <h2>3. Nội dung và hành vi</h2>
      <p>Không sử dụng hệ thống để phát tán nội dung vi phạm pháp luật, nội dung gây hại hoặc thực hiện các hành vi làm ảnh hưởng đến an toàn, ổn định của nền tảng.</p>
      <h2>4. Quyền thay đổi dịch vụ</h2>
      <p>HMath Exam có thể cập nhật, thay đổi hoặc tạm dừng một phần chức năng để bảo trì, nâng cấp hoặc cải thiện chất lượng dịch vụ mà không cần thông báo trước trong mọi trường hợp.</p>
      <h2>5. Giới hạn trách nhiệm</h2>
      <p>Người dùng cần chủ động kiểm tra lại dữ liệu quan trọng. Hệ thống nỗ lực vận hành ổn định nhưng không cam kết loại bỏ hoàn toàn mọi gián đoạn kỹ thuật.</p>
    </StaticPageShell>
  );
}

function ContactPage() {
  return (
    <StaticPageShell
      icon={<Mail className="h-4 w-4" />}
      title="Liên hệ"
      description="Nếu bạn cần hỗ trợ về tài khoản, truy cập đề thi, lỗi kỹ thuật hoặc các vấn đề liên quan đến hệ thống, vui lòng liên hệ qua các kênh bên dưới."
    >
      <h2>1. Hỗ trợ kỹ thuật</h2>
      <p>Bạn có thể dùng trang này để cung cấp thông tin về lỗi gặp phải, thời điểm xảy ra lỗi và ảnh chụp màn hình nếu có để giúp việc xử lý nhanh hơn.</p>
      <h2>2. Thông tin liên hệ</h2>
      <p>Mọi vấn đề liên hệ qua email: <strong>contact.hmath@gmail.com</strong></p>
      <h2>3. Nội dung nên gửi kèm</h2>
      <ul>
        <li>Họ tên hoặc email đăng nhập</li>
        <li>Trang đang sử dụng khi xảy ra lỗi</li>
        <li>Mô tả ngắn gọn thao tác trước khi lỗi xuất hiện</li>
      </ul>
      <h2>4. Hợp tác và góp ý</h2>
      <p>Nếu bạn muốn góp ý tính năng mới, cải thiện giao diện hoặc trải nghiệm luyện đề, vui lòng gửi phản hồi chi tiết qua email liên hệ.</p>
    </StaticPageShell>
  );
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
    localStorage.removeItem('hmath_after_login');
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
            <Route path="/chinh-sach" element={<PolicyPage />} />
            <Route path="/dieu-khoan-su-dung" element={<TermsPage />} />
            <Route path="/lien-he" element={<ContactPage />} />
            <Route path="/*" element={<StudentApp />} />
            <Route path="/admin/*" element={<TeacherApp />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="border-t border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">HMath Exam</div>
              <div className="text-xs text-slate-500">Nền tảng luyện đề toán trực tuyến cho học sinh</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
            <Link to="/chinh-sach" className="transition-colors hover:text-slate-900">Chính sách</Link>
            <span className="text-slate-300">•</span>
            <Link to="/dieu-khoan-su-dung" className="transition-colors hover:text-slate-900">Điều khoản sử dụng</Link>
            <span className="text-slate-300">•</span>
            <Link to="/lien-he" className="transition-colors hover:text-slate-900">Liên hệ</Link>
          </div>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} HMath. Designed for focused learning.</p>
        </div>
      </footer>
    </div>
  );
}
