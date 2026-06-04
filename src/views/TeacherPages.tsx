import { useState, useEffect } from 'react';
import { ExamManager } from '../components/ExamManager';
import { Users, Shield, Loader2, BadgeCheck, Settings2, Sparkles } from 'lucide-react';
import { collection, query, where, doc, setDoc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export function TeacherExams() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="glass-panel mb-6 rounded-[2rem] p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Bộ đề
        </div>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title">Quản lý đề thi</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tạo, lọc, chỉnh sửa và xuất bản đề thi với bố cục gọn hơn để thao tác nhanh.</p>
      </div>
      <ExamManager />
    </div>
  );
}

export function TeacherUsers() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [vipDays, setVipDays] = useState(30);
  const [isGranting, setIsGranting] = useState(false);
  const [grantMessage, setGrantMessage] = useState('');
  const [grantError, setGrantError] = useState('');
  const [lastGrantedUserId, setLastGrantedUserId] = useState('');
  const [lastGrantedExpiry, setLastGrantedExpiry] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentList = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }));
      setStudents(studentList);
      setIsLoading(false);
    }, (err) => {
      console.error('Error fetching students:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return String(s.fullName || s.name || '').toLowerCase().includes(q) || String(s.email || '').toLowerCase().includes(q) || String(s.zalo || '').toLowerCase().includes(q);
  });

  const grantVip = async () => {
    if (!selectedStudent) return;
    setIsGranting(true);
    setGrantError('');
    setGrantMessage('');
    try {
      const now = Date.now();
      const currentExpiryMs = selectedStudent.vipExpiry ? new Date(selectedStudent.vipExpiry).getTime() : 0;
      const base = currentExpiryMs > now ? currentExpiryMs : now;
      const nextExpiry = new Date(base + vipDays * 24 * 60 * 60 * 1000).toISOString();

      await updateDoc(doc(db, 'users', selectedStudent.id), {
        vipType: `${vipDays} ngày`,
        vipExpiry: nextExpiry,
        vipGrantedAt: new Date().toISOString(),
      });

      setLastGrantedUserId(selectedStudent.id);
      setLastGrantedExpiry(nextExpiry);
      setGrantMessage(`Đã cấp VIP ${vipDays} ngày thành công.`);
      setSelectedStudent(null);
      setVipDays(30);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setGrantError(`Cấp VIP thất bại: ${msg}`);
      console.error('Grant VIP failed:', err);
    } finally {
      setIsGranting(false);
    }
  };

  const revokeVip = async (student: any) => {
    setGrantError('');
    setGrantMessage('');
    try {
      await updateDoc(doc(db, 'users', student.id), {
        vipType: '',
        vipExpiry: '',
        vipGrantedAt: new Date().toISOString(),
      });
      setLastGrantedUserId(student.id);
      setLastGrantedExpiry('');
      setGrantMessage(`Đã hạ VIP cho ${student.fullName || student.name || student.email}.`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setGrantError(`Hạ VIP thất bại: ${msg}`);
      console.error('Revoke VIP failed:', err);
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-sm font-medium text-slate-500 animate-pulse">Đang tải danh sách học sinh...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass-panel rounded-[2rem] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Users className="h-3.5 w-3.5 text-indigo-600" /> Học sinh
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title">Danh sách học sinh</h2>
            <p className="mt-2 text-sm text-slate-500">Quản lý trạng thái tài khoản, cấp VIP và xem nhanh hồ sơ.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tổng học sinh đang học</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-950">{students.length}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] p-5 shadow-sm space-y-4">
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm theo tên / email / zalo..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        {grantMessage && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{grantMessage}{lastGrantedExpiry ? <span className="ml-2 text-emerald-600">(Hạn mới: {new Date(lastGrantedExpiry).toLocaleString('vi-VN')})</span> : null}</div>}
        {grantError && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{grantError}</div>}
      </div>

      <div className="glass-panel overflow-hidden rounded-[2rem] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="px-5 py-4 font-semibold">Họ và tên</th>
                <th className="px-5 py-4 font-semibold">Email</th>
                <th className="px-5 py-4 font-semibold">Zalo</th>
                <th className="px-5 py-4 font-semibold">VIP</th>
                <th className="px-5 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const isVip = student.vipExpiry && new Date(student.vipExpiry).getTime() > Date.now();
                const isJustGranted = lastGrantedUserId === student.id;
                return (
                  <tr key={student.id} className={`border-b border-slate-100 transition-colors hover:bg-slate-50/60 ${isJustGranted ? 'bg-emerald-50/60' : ''}`}>
                    <td className="px-5 py-4 font-semibold text-slate-900">{student.fullName || student.name || 'Chưa cập nhật'}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{student.email}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{student.zalo || 'Chưa có'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isVip ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {isVip ? `VIP đến ${new Date(student.vipExpiry).toLocaleDateString('vi-VN')}` : 'Miễn phí'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedStudent(student)} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700">Cấp VIP</button>
                        {isVip && <button onClick={() => revokeVip(student)} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700">Hạ VIP</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">Không có học sinh phù hợp</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <BadgeCheck className="h-3.5 w-3.5 text-indigo-600" /> Cấp VIP
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-950">{selectedStudent.fullName || selectedStudent.name || selectedStudent.email}</h3>
            <p className="mt-2 text-sm text-slate-500">Chọn số ngày VIP muốn cộng thêm.</p>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {[30, 180, 365, 7].map((days) => (
                <button key={days} onClick={() => setVipDays(days)} className={`rounded-xl border px-2 py-2 text-xs font-bold ${vipDays === days ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                  {days} ngày
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedStudent(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200">Hủy</button>
              <button onClick={grantVip} disabled={isGranting} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">{isGranting ? 'Đang cấp...' : 'Xác nhận cấp VIP'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeacherSettings() {
  const [settings, setSettings] = useState({
    allowPublicRegistration: true,
    defaultExamTimeLimit: 45,
    antiCheatStrictness: 'medium',
    vip1MonthPrice: 50000,
    vip6MonthPrice: 240000,
    vip1YearPrice: 450000,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setSettings((prev) => ({ ...prev, ...docSnap.data() }));
      } catch (err) {
        console.error('Error loading settings:', err);
        handleFirestoreError(err, OperationType.GET, 'settings/global');
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      setMessage('Lưu cấu hình thành công!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Có lỗi xảy ra khi lưu.');
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="glass-panel rounded-[2rem] p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          <Settings2 className="h-3.5 w-3.5 text-indigo-600" /> Cài đặt
        </div>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title">Cài đặt hệ thống</h2>
        <p className="mt-2 text-sm text-slate-500">Cấu hình phân quyền, thời gian thi và giá bán các gói VIP.</p>
      </div>

      <div className="glass-panel rounded-[2rem] p-6 shadow-sm space-y-8">
        <div className="space-y-4">
          <h3 className="border-l-4 border-indigo-500 pl-3 text-xs font-bold uppercase tracking-wider text-slate-500">Cấu hình chung</h3>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Thời gian thi mặc định (phút)">
              <input type="number" value={settings.defaultExamTimeLimit} onChange={(e) => setSettings({ ...settings, defaultExamTimeLimit: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </Field>
            <Field label="Mức độ chống gian lận">
              <select value={settings.antiCheatStrictness} onChange={(e) => setSettings({ ...settings, antiCheatStrictness: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="low">Thấp (Chỉ cảnh báo)</option>
                <option value="medium">Trung bình (Ghi nhận số lần vi phạm)</option>
                <option value="high">Cao (Cấm thi quá 3 lần vi phạm)</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="border-l-4 border-indigo-500 pl-3 text-xs font-bold uppercase tracking-wider text-slate-500">Giá gói VIP</h3>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="VIP 1 tháng">
              <MoneyInput value={settings.vip1MonthPrice} onChange={(value) => setSettings({ ...settings, vip1MonthPrice: value })} />
            </Field>
            <Field label="VIP 6 tháng">
              <MoneyInput value={settings.vip6MonthPrice} onChange={(value) => setSettings({ ...settings, vip6MonthPrice: value })} />
            </Field>
            <Field label="VIP 1 năm">
              <MoneyInput value={settings.vip1YearPrice} onChange={(value) => setSettings({ ...settings, vip1YearPrice: value })} />
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
          <button onClick={handleSave} disabled={isSaving} className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? 'Đang lưu...' : 'Lưu cài đặt cấu hình'}
          </button>
          {message ? <span className={`text-sm font-semibold ${message.includes('lỗi') ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</span> : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="relative">
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span>
    </div>
  );
}
