import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Copy, Phone, RefreshCw, Save, ShieldCheck, Sparkles, Star, User, X } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getExpectedPack } from '../lib/checkout';

function FieldRow({ label, value, onCopy, copyValue, copied, highlight = false, mono = false, badge = false }: { label: string; value: string; onCopy?: () => void; copyValue?: string; copied?: boolean; highlight?: boolean; mono?: boolean; badge?: boolean }) {
  return (<div className="flex items-center justify-between gap-3 border-b border-slate-200/80 py-2.5 last:border-b-0 last:pb-0"><span className="text-sm font-medium text-slate-500">{label}</span><div className="flex items-center gap-2 text-right"><span className={`text-sm font-bold ${highlight ? 'text-indigo-600' : 'text-slate-900'} ${mono ? 'font-mono' : ''} ${badge ? 'rounded-md bg-amber-100 px-2 py-1 text-xs tracking-wide text-amber-800' : ''}`}>{value}</span>{onCopy && copyValue ? <button onClick={onCopy} className="rounded-lg border border-slate-200 bg-white p-1.5 text-indigo-600 transition hover:bg-slate-50" title="Sao chép">{copied ? 'Đã chép' : <Copy className="h-3.5 w-3.5" />}</button> : null}</div></div>);
}

export function StudentProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [zalo, setZalo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pricing, setPricing] = useState({ vip1MonthPrice: 50000, vip6MonthPrice: 240000, vip1YearPrice: 450000, sepayBankId: '', sepayAccountNo: '', sepayAccountName: '' });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPack, setCheckoutPack] = useState<any>(null);
  const [paymentMemo, setPaymentMemo] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutDetails, setCheckoutDetails] = useState<{ amount: number; days: number; name: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchUserAndStats = async () => {
    if (!auth.currentUser) return;
    setIsLoadingUser(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const saved = localStorage.getItem('hmath_user');
        const parsed = saved ? JSON.parse(saved) : {};
        const mergedUser = { ...parsed, ...userData, name: userData.fullName || userData.name || parsed.name || auth.currentUser?.displayName || 'Học sinh', avatar: userData.avatar || parsed.avatar || auth.currentUser?.photoURL || '' };
        setUser(mergedUser);
        setDisplayName(mergedUser.name || '');
        setZalo(mergedUser.zalo || '');
        localStorage.setItem('hmath_user', JSON.stringify(mergedUser));
      } else {
        const fallbackUser = { name: auth.currentUser?.displayName || 'Học sinh', email: auth.currentUser?.email || '', avatar: auth.currentUser?.photoURL || '' };
        setUser(fallbackUser);
        setDisplayName(fallbackUser.name || '');
      }
      const setSnap = await getDoc(doc(db, 'settings', 'global'));
      if (setSnap.exists()) { const sData = setSnap.data() as any; setPricing((prev) => ({ ...prev, vip1MonthPrice: sData.vip1MonthPrice ?? 50000, vip6MonthPrice: sData.vip6MonthPrice ?? 240000, vip1YearPrice: sData.vip1YearPrice ?? 450000, sepayBankId: sData.sepayBankId || '', sepayAccountNo: sData.sepayAccountNo || '', sepayAccountName: sData.sepayAccountName || '' })); }
    } catch (err) { console.error('Error loading profile stats:', err); }
  };

  useEffect(() => { let unsubAuth: (() => void) | null = null; fetchUserAndStats(); if (!auth.currentUser) { unsubAuth = auth.onAuthStateChanged((user) => { if (user) fetchUserAndStats(); }); } return () => { if (unsubAuth) unsubAuth(); }; }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    setMessage('');
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { name: displayName, fullName: displayName, zalo });
      const saved = localStorage.getItem('hmath_user');
      if (saved) { const parsed = JSON.parse(saved); parsed.name = displayName; parsed.fullName = displayName; parsed.zalo = zalo; localStorage.setItem('hmath_user', JSON.stringify(parsed)); }
      setMessage('Cập nhật thành công!');
      setTimeout(() => setMessage(''), 3000);
      fetchUserAndStats();
    } catch (err) { console.error(err); setMessage('Có lỗi xảy ra, vui lòng thử lại.'); } finally { setIsSaving(false); }
  };

  const initiateCheckout = async (packType: '1m' | '6m' | '1y') => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setCheckMessage('Phiên đăng nhập chưa sẵn sàng. Vui lòng tải lại trang hoặc đăng nhập lại.'); return; }
    const expectedPack = getExpectedPack(pricing, packType);
    setIsCheckoutOpen(true);
    setCheckoutStatus('loading');
    setCheckoutError('');
    setCheckMessage('Đang tạo mã thanh toán...');
    setPaymentIntentId('');
    setPaymentMemo('');
    setCheckoutPack({ type: packType, ...expectedPack });
    setCheckoutDetails({ ...expectedPack });
    try {
      const planCode = packType === '1m' ? 'vip_1m' : packType === '6m' ? 'vip_6m' : 'vip_1y';
      const response = await fetch('/api/payment/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, packType, planCode }) });
      const data = await response.json();
      if (!response.ok) { setCheckoutStatus('error'); setCheckoutError(data.error || data.message || 'Không thể tạo hóa đơn. Vui lòng thử lại.'); setCheckMessage(data.error || data.message || 'Không thể tạo hóa đơn. Vui lòng thử lại.'); return; }
      if (!data.bankId || !data.accountNo) { setCheckoutStatus('error'); setCheckoutError('Chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ admin.'); setCheckMessage('Chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ admin.'); return; }
      setCheckoutPack({ type: packType, amount: data.amount, days: data.days, name: data.label });
      setCheckoutDetails({ amount: data.amount, days: data.days, name: data.label });
      setPaymentIntentId(data.intentId || '');
      setPaymentMemo(data.memo);
      setCheckoutStatus('ready');
      setCheckMessage('Đang chờ hệ thống ghi nhận thanh toán...');
    } catch (err: any) { setCheckoutStatus('error'); setCheckoutError('Lỗi kết nối server: ' + err.message); setCheckMessage('Lỗi kết nối server: ' + err.message); setCheckoutPack({ type: packType, amount: 0, days: 0, name: 'Lỗi tạo hóa đơn' }); } finally { setIsCheckingPayment(false); }
  };

  const handleCopy = async (text: string, label: string) => { await navigator.clipboard.writeText(text); setCopiedField(label); setTimeout(() => setCopiedField(null), 2000); };
  useEffect(() => { if (!isCheckoutOpen || !paymentIntentId) return; const interval = setInterval(() => fetchUserAndStats(), 5000); return () => clearInterval(interval); }, [isCheckoutOpen, paymentIntentId]);

  if (isLoadingUser && !user) return <div className="py-20 text-center text-sm font-medium text-slate-500 animate-pulse">Đang tải thông tin...</div>;
  if (!user) return <div className="py-20 text-center text-sm font-medium text-slate-500">Không thể tải thông tin tài khoản.</div>;

  const isVip = user.vipExpiry && new Date(user.vipExpiry).getTime() > Date.now();
  const daysRemaining = isVip ? Math.ceil((new Date(user.vipExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
  const qrUrl = pricing.sepayBankId && pricing.sepayAccountNo ? `https://img.vietqr.io/image/${pricing.sepayBankId}-${pricing.sepayAccountNo}-compact2.png?amount=${checkoutPack?.amount}&addInfo=${paymentMemo}&accountName=${encodeURIComponent(pricing.sepayAccountName)}` : '';

  return (<div className="space-y-8 animate-in fade-in duration-500"><section className="glass-panel overflow-hidden rounded-[2rem] p-6 shadow-sm md:p-8"><div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center"><div className="flex justify-center lg:justify-start"><div className="relative"><div className="absolute -inset-3 rounded-[2rem] bg-indigo-500/10 blur-2xl" /><div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-lg">{user.avatar ? <img src={user.avatar} alt={displayName || user.name || user.fullName || 'Học sinh'} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full w-full items-center justify-center bg-indigo-50 text-4xl font-extrabold uppercase text-indigo-700">{(displayName || user.name || user.fullName || 'U')[0]}</div>}</div></div></div><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"><User className="h-3.5 w-3.5 text-indigo-600" /> Hồ sơ cá nhân</div><h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title">{user.name || user.fullName || 'Học sinh'}</h2></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-sm"><div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Email</div><div className="mt-1 text-sm font-semibold">{user.email}</div></div></div></div></div></section><div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"><section className="glass-panel rounded-[2rem] p-6 shadow-sm"><h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Phone className="h-5 w-5 text-indigo-600" /> Thông tin cá nhân</h3><p className="mt-2 text-sm text-slate-500">Cập nhật tên hiển thị và số Zalo để đồng bộ hồ sơ.</p><div className="mt-6 space-y-4"><div><label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400"><User className="h-3.5 w-3.5" /> Tên hiển thị</label><input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nhập tên hiển thị..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></div><div><label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400"><Phone className="h-3.5 w-3.5" /> Số điện thoại Zalo</label><input type="text" value={zalo} onChange={(e) => setZalo(e.target.value)} placeholder="Nhập số điện thoại Zalo..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></div><div className="flex items-center gap-3"><button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" /> {isSaving ? 'Đang lưu...' : 'Lưu lại'}</button>{message ? <span className={`text-xs font-semibold ${message.includes('lỗi') ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</span> : null}</div></div></section><section className="glass-panel rounded-[2rem] p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-indigo-600" /> Tài khoản</h3></div>{isVip ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700"><Star className="h-3.5 w-3.5 fill-amber-700" /> VIP</span> : null}</div><div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">{isVip ? <div className="flex gap-4"><div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Sparkles className="h-6 w-6 fill-amber-700" /></div><div><h4 className="font-bold text-slate-950">Thành viên VIP đang hoạt động</h4><p className="mt-1 text-sm leading-6 text-slate-600">Bạn đang có đặc quyền học tập cao cấp: luyện đề không giới hạn, xem giải thích chi tiết và theo dõi tiến trình sâu hơn.</p><div className="mt-3 inline-flex rounded-full bg-amber-200/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">Hạn VIP còn {daysRemaining} ngày · {new Date(user.vipExpiry).toLocaleDateString('vi-VN')}</div></div></div> : <div className="flex gap-4"><div className="rounded-2xl bg-white p-3 text-slate-500 shadow-sm"><User className="h-6 w-6" /></div><div className="flex-1"><h4 className="font-bold text-slate-950">Thành viên miễn phí</h4><p className="mt-1 text-sm leading-6 text-slate-600">Giới hạn 10 đề mỗi tháng và không xem được đáp án chi tiết.</p></div></div>}</div></section></div>{isCheckoutOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-md"><div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col gap-8 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl md:flex-row md:p-8"><button onClick={() => { setIsCheckoutOpen(false); setPaymentIntentId(''); setPaymentMemo(''); setCheckoutPack(null); setCheckoutDetails(null); setCheckoutStatus('idle'); setCheckoutError(''); setCheckMessage(''); }} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>{!pricing.sepayBankId || !pricing.sepayAccountNo ? <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center text-slate-500"><div className="h-16 w-16 text-amber-500"><AlertCircle className="h-16 w-16 text-amber-500" /></div><h4 className="text-lg font-bold text-slate-950">Cổng thanh toán chưa sẵn sàng</h4><p className="max-w-md text-sm leading-6">Giáo viên / Admin chưa thiết lập tài khoản ngân hàng thụ hưởng qua SePay trong Cài đặt hệ thống.</p></div> : <><div className="flex-1 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center md:p-6"><h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.22em] text-indigo-600">Quét mã QR để thanh toán</h4>{qrUrl ? <img src={qrUrl} alt="VietQR SePay VIP Code" className="mx-auto w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" referrerPolicy="no-referrer" /> : <div className="mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-2xl bg-slate-100 text-slate-400">Mã QR thất bại</div>}<div className="mt-4 space-y-2 text-xs text-slate-500"><div className="flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> Hỗ trợ mọi ngân hàng</div><div>Mở ứng dụng ngân hàng và bấm &quot;Quét mã&quot;</div>{qrUrl ? <button type="button" onClick={async () => { if (!qrUrl) return; const response = await fetch(qrUrl); const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = objectUrl; a.download = `sepay-qr-${paymentMemo || 'hmath'}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(objectUrl); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50">Tải mã QR</button> : null}</div></div><div className="flex-1 space-y-6"><div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-600">Thanh toán hóa đơn tự động</span><h3 className="mt-3 text-2xl font-bold text-slate-950">Nâng cấp gói {checkoutDetails?.name || checkoutPack?.name || 'đang tạo...'}</h3><p className="mt-1 text-sm text-slate-500">Giao dịch được đối soát hoàn toàn tự động dựa trên nội dung chuyển khoản.</p></div><div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><FieldRow label="Ngân hàng" value={pricing.sepayBankId || 'Đang tạo...'} /><FieldRow label="Số tài khoản" value={pricing.sepayAccountNo || 'Đang tạo...'} copyValue={pricing.sepayAccountNo} copied={copiedField === 'stk'} onCopy={() => handleCopy(pricing.sepayAccountNo, 'stk')} /><FieldRow label="Chủ tài khoản" value={pricing.sepayAccountName || 'Đang tạo...'} /><FieldRow label="Số tiền" value={`${(checkoutDetails?.amount ?? checkoutPack?.amount ?? 0).toLocaleString('vi-VN')} đ`} copyValue={String(checkoutDetails?.amount ?? checkoutPack?.amount ?? 0)} copied={copiedField === 'amount'} onCopy={() => handleCopy(String(checkoutDetails?.amount ?? checkoutPack?.amount ?? 0), 'amount')} highlight /><FieldRow label="Nội dung (CỰC KỲ QUAN TRỌNG)" value={paymentMemo || 'Đang tạo...'} copyValue={paymentMemo} copied={copiedField === 'memo'} onCopy={() => handleCopy(paymentMemo, 'memo')} mono badge /></div><div className="space-y-3"><div className="flex items-center gap-3 text-xs text-slate-500"><RefreshCw className={`h-4 w-4 text-indigo-600 ${checkoutStatus === 'loading' || isCheckingPayment ? 'animate-spin' : ''}`} /><p>{checkoutStatus === 'loading' ? 'Đang tạo và đồng bộ mã thanh toán. Vui lòng chờ một chút.' : 'Hệ thống tự động đồng bộ tài khoản. Không tải lại trang này khi tiền đang xử lý.'}</p></div>{checkMessage ? <div className={`rounded-2xl border p-3.5 text-xs font-bold leading-normal ${checkMessage.includes('thành công') ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : checkMessage.toLowerCase().includes('đang') ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>{checkMessage}</div> : null}<div className="flex gap-3"><button onClick={() => { setIsCheckoutOpen(false); setPaymentIntentId(''); setPaymentMemo(''); setCheckoutPack(null); setCheckoutDetails(null); setCheckoutStatus('idle'); setCheckoutError(''); setCheckMessage(''); }} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button></div></div></div></>}</div></div>)}
    </div>);
}
