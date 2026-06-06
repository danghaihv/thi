import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Copy, History as HistoryIcon, RefreshCw, ShieldCheck, Sparkles, Star, User, X } from 'lucide-react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getExpectedPack } from '../lib/checkout';

function PriceCard({ title, period, price, onChoose, cta, ctaHint, featured = false }: { title: string; period: string; price: number; onChoose: () => void; cta: string; ctaHint?: string; featured?: boolean }) {
  return (
    <div className={`flex flex-col justify-between rounded-[1.5rem] border p-4 text-center shadow-sm transition-all ${featured ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
      <div><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${featured ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-500'}`}>{period}</span><h5 className="mt-2 text-sm font-bold text-slate-950">{title}</h5><p className="mt-3 text-lg font-extrabold text-indigo-600">{price.toLocaleString('vi-VN')}đ</p>{ctaHint ? <span className="text-[10px] text-slate-400">{ctaHint}</span> : null}</div>
      <button onClick={onChoose} type="button" className={`mt-4 w-full rounded-2xl px-4 py-2 text-xs font-bold transition-all ${featured ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-950 text-white hover:-translate-y-0.5'}`}>{cta}</button>
    </div>
  );
}

function FieldRow({ label, value, onCopy, copyValue, copied, highlight = false, mono = false, badge = false }: { label: string; value: string; onCopy?: () => void; copyValue?: string; copied?: boolean; highlight?: boolean; mono?: boolean; badge?: boolean }) {
  return (<div className="flex items-center justify-between gap-3 border-b border-slate-200/80 py-2.5 last:border-b-0 last:pb-0"><span className="text-sm font-medium text-slate-500">{label}</span><div className="flex items-center gap-2 text-right"><span className={`text-sm font-bold ${highlight ? 'text-indigo-600' : 'text-slate-900'} ${mono ? 'font-mono' : ''} ${badge ? 'rounded-md bg-amber-100 px-2 py-1 text-xs tracking-wide text-amber-800' : ''}`}>{value}</span>{onCopy && copyValue ? <button onClick={onCopy} className="rounded-lg border border-slate-200 bg-white p-1.5 text-indigo-600 transition hover:bg-slate-50" title="Sao chép">{copied ? 'Đã chép' : <Copy className="h-3.5 w-3.5" />}</button> : null}</div></div>);
}

export function StudentUpgradeHub() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
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
  const [upgradeHistory, setUpgradeHistory] = useState<any[]>([]);

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
        localStorage.setItem('hmath_user', JSON.stringify(mergedUser));
      }
      const setSnap = await getDoc(doc(db, 'settings', 'global'));
      if (setSnap.exists()) { const sData = setSnap.data() as any; setPricing((prev) => ({ ...prev, vip1MonthPrice: sData.vip1MonthPrice ?? 50000, vip6MonthPrice: sData.vip6MonthPrice ?? 240000, vip1YearPrice: sData.vip1YearPrice ?? 450000, sepayBankId: sData.sepayBankId || '', sepayAccountNo: sData.sepayAccountNo || '', sepayAccountName: sData.sepayAccountName || '' })); }
      const q = query(collection(db, 'payment_intents'), where('userId', '==', auth.currentUser.uid));
      const subSnap = await getDocs(q);
      const items: any[] = []; subSnap.forEach((snapshotDoc) => items.push({ id: snapshotDoc.id, ...snapshotDoc.data() }));
      items.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
      setUpgradeHistory(items.slice(0, 5));
    } catch (err) { console.error('Error loading upgrade hub:', err); } finally { setIsLoadingUser(false); }
  };

  useEffect(() => { let unsubAuth: (() => void) | null = null; fetchUserAndStats(); if (!auth.currentUser) { unsubAuth = auth.onAuthStateChanged((currentUser) => { if (currentUser) fetchUserAndStats(); else setIsLoadingUser(false); }); } return () => { if (unsubAuth) unsubAuth(); }; }, []);

  const initiateCheckout = async (packType: '1m' | '6m' | '1y') => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setCheckMessage('Phiên đăng nhập chưa sẵn sàng. Vui lòng tải lại trang hoặc đăng nhập lại.');
      return;
    }

    const expectedPack = getExpectedPack(pricing, packType);
    setIsCheckoutOpen(true);
    setIsCheckingPayment(true);
    setCheckoutStatus('loading');
    setCheckMessage('');
    setPaymentIntentId('');
    setPaymentMemo('');
    setCheckoutPack({ type: packType, amount: expectedPack.amount, days: expectedPack.days, name: expectedPack.name });

    try {
      const planCode = packType === '1m' ? 'vip_1m' : packType === '6m' ? 'vip_6m' : 'vip_1y';
      const response = await fetch('/api/payment/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, packType, planCode }) });
      const data = await response.json();
      if (!response.ok) {
        setCheckMessage(data.error || data.message || 'Không thể tạo hóa đơn. Vui lòng thử lại.');
        setCheckoutStatus('error');
        return;
      }
      if (!data.bankId || !data.accountNo) {
        setCheckMessage('Chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ admin.');
        setCheckoutStatus('error');
        return;
      }
      setCheckoutPack({ type: packType, amount: data.amount ?? expectedPack.amount, days: data.days ?? expectedPack.days, name: data.label ?? expectedPack.name });
      setCheckoutDetails({ amount: data.amount ?? expectedPack.amount, days: data.days ?? expectedPack.days, name: data.label ?? expectedPack.name });
      setPaymentIntentId(data.intentId || data.memo || '');
      setPaymentMemo(data.memo || data.paymentMemo || '');
      setCheckMessage('Đang chờ hệ thống ghi nhận thanh toán...');
      setCheckoutStatus('ready');
    } catch (err: any) {
      setCheckMessage('Lỗi kết nối server: ' + err.message);
      setCheckoutStatus('error');
    } finally {
      setIsCheckingPayment(false);
    }
  };
  const handleCopy = async (text: string, label: string) => { await navigator.clipboard.writeText(text); setCopiedField(label); setTimeout(() => setCopiedField(null), 2000); };
  useEffect(() => { if (!isCheckoutOpen || !paymentIntentId) return; const interval = setInterval(() => fetchUserAndStats(), 5000); return () => clearInterval(interval); }, [isCheckoutOpen, paymentIntentId]);

  if (isLoadingUser && !user) return <div className="py-20 text-center text-sm font-medium text-slate-500 animate-pulse">Đang tải thông tin...</div>;
  if (!user) return <div className="py-20 text-center text-sm font-medium text-slate-500">Không thể tải thông tin tài khoản.</div>;
  const isVip = user.vipExpiry && new Date(user.vipExpiry).getTime() > Date.now();
  const daysRemaining = isVip ? Math.ceil((new Date(user.vipExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
  const qrUrl = pricing.sepayBankId && pricing.sepayAccountNo ? `https://img.vietqr.io/image/${pricing.sepayBankId}-${pricing.sepayAccountNo}-compact2.png?amount=${checkoutPack?.amount ?? 0}&addInfo=${encodeURIComponent(paymentMemo)}&accountName=${encodeURIComponent(pricing.sepayAccountName)}` : '';

  return (<div className="space-y-8 animate-in fade-in duration-500"><section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_38%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_52%,_#eef2ff_100%)] p-6 shadow-sm md:p-8"><div className="absolute right-[-80px] top-[-90px] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" /><div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end"><div><div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700 backdrop-blur"><Sparkles className="h-3.5 w-3.5" /> Nâng cấp tài khoản</div><h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title md:text-5xl">Mở khóa trải nghiệm học tập mạnh hơn</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">VIP giúp bạn xem đáp án chi tiết, theo dõi tiến trình sâu hơn và luyện đề với cảm giác liền mạch hơn mỗi ngày.</p></div><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">{[['Xem lời giải','Mở chi tiết đáp án và phân tích sau mỗi bài làm.'],['Theo dõi tiến bộ','Nhìn rõ nhịp độ, lịch sử và xu hướng học tập.'],['Luyện đề thoải mái','Giảm ma sát khi học, tăng tốc độ ôn tập.']].map(([title, desc]) => <div key={title} className="rounded-[1.4rem] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur"><div className="text-sm font-bold text-slate-950">{title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{desc}</div></div>)}</div></div></section><div className="space-y-8"><section className="glass-panel rounded-[2rem] p-6 shadow-sm"><h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-indigo-600" /> Trạng thái tài khoản</h3><p className="mt-2 text-sm text-slate-500">Tài khoản VIP mở khóa xem đáp án, lời giải và giới hạn luyện đề cao hơn.</p><div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">{isVip ? <div className="flex gap-4"><div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Sparkles className="h-6 w-6 fill-amber-700" /></div><div><h4 className="font-bold text-slate-950">Thành viên VIP đang hoạt động</h4><p className="mt-1 text-sm leading-6 text-slate-600">Bạn đang có đặc quyền học tập cao cấp: luyện đề không giới hạn, xem giải thích chi tiết và theo dõi tiến trình sâu hơn.</p><div className="mt-3 inline-flex rounded-full bg-amber-200/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">Hạn VIP còn {daysRemaining} ngày · {new Date(user.vipExpiry).toLocaleDateString('vi-VN')}</div></div></div> : <div className="flex gap-4"><div className="rounded-2xl bg-white p-3 text-slate-500 shadow-sm"><User className="h-6 w-6" /></div><div className="flex-1"><h4 className="font-bold text-slate-950">Thành viên miễn phí</h4><p className="mt-1 text-sm leading-6 text-slate-600">Giới hạn 10 đề mỗi tháng và không xem được đáp án chi tiết.</p></div></div>}</div><div className="mt-6 space-y-4"><PriceCard title="Gói 1 tháng" period="30 ngày" price={pricing.vip1MonthPrice} onChoose={() => initiateCheckout('1m')} cta={isVip ? 'Gia hạn 30 ngày' : 'Nâng cấp ngay'} /><PriceCard title="Gói 6 tháng" period="180 ngày" price={pricing.vip6MonthPrice} onChoose={() => initiateCheckout('6m')} cta={isVip ? 'Gia hạn 180 ngày' : 'Nâng cấp ngay'} ctaHint="Tiết kiệm khoảng 20%" /><PriceCard title="Gói 1 năm" period="365 ngày" price={pricing.vip1YearPrice} onChoose={() => initiateCheckout('1y')} cta={isVip ? 'Gia hạn 365 ngày' : 'Nâng cấp ngay'} ctaHint="Tiết kiệm khoảng 25%" /></div></section><section className="glass-panel rounded-[2rem] p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-bold text-slate-950"><HistoryIcon className="h-5 w-5 text-indigo-600" /> Lịch sử nâng cấp</h3><p className="mt-1 text-sm text-slate-500">Hiển thị gói đã chọn, thời gian tạo hóa đơn và trạng thái xử lý.</p></div><span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Gần đây</span></div><div className="mt-4 space-y-3">{upgradeHistory.length ? upgradeHistory.map((item) => { const status = String(item.status || 'awaiting_payment'); const statusLabel = status === 'fulfilled' || status === 'completed' ? 'Thành công' : status === 'expired' ? 'Hết hạn' : status === 'canceled' ? 'Đã hủy' : status === 'paid' ? 'Đã thanh toán' : 'Đang chờ'; const statusClass = status === 'fulfilled' || status === 'completed' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : status === 'expired' || status === 'canceled' ? 'border-rose-100 bg-rose-50 text-rose-700' : status === 'paid' ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-indigo-100 bg-indigo-50 text-indigo-700'; const planName = item.planCode === 'vip_6m' ? 'VIP 6 tháng' : item.planCode === 'vip_1y' ? 'VIP 1 năm' : 'VIP 1 tháng'; const timeLabel = item.createdAt || item.updatedAt ? new Date(item.createdAt || item.updatedAt).toLocaleString('vi-VN') : 'Mới đây'; return (<div key={item.id} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold text-slate-950">{planName}</div><div className="mt-1 text-xs text-slate-500">{timeLabel}</div></div><span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClass}`}>{statusLabel}</span></div><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><div><span className="font-semibold text-slate-500">Mã hóa đơn:</span> {item.intentId || item.id}</div><div><span className="font-semibold text-slate-500">Mã chuyển khoản:</span> {item.memo || '—'}</div><div><span className="font-semibold text-slate-500">Số tiền:</span> {typeof item.amountExpected === 'number' ? `${item.amountExpected.toLocaleString('vi-VN')} đ` : (item.amount ? `${Number(item.amount).toLocaleString('vi-VN')} đ` : '—')}</div><div><span className="font-semibold text-slate-500">Xử lý:</span> {item.fulfilledAt || item.paidAt ? new Date(item.fulfilledAt || item.paidAt).toLocaleString('vi-VN') : 'Chưa hoàn tất'}</div></div></div>); }) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có lịch sử nâng cấp.</div>}</div></section></div>{isCheckoutOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-md"><div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col gap-8 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl md:flex-row md:p-8"><button onClick={() => setIsCheckoutOpen(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>{!pricing.sepayBankId || !pricing.sepayAccountNo ? <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center text-slate-500"><AlertCircle className="h-16 w-16 text-amber-500" /><h4 className="text-lg font-bold text-slate-950">Cổng thanh toán chưa sẵn sàng</h4><p className="max-w-md text-sm leading-6">Giáo viên / Admin chưa thiết lập tài khoản ngân hàng thụ hưởng qua SePay trong Cài đặt hệ thống.</p></div> : <><div className="flex-1 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center md:p-6"><h4 className="mb-4 text-sm font-extrabold uppercase tracking-[0.22em] text-indigo-600">Quét mã QR để thanh toán</h4>{qrUrl ? <img src={qrUrl} alt="VietQR SePay VIP Code" className="mx-auto w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" referrerPolicy="no-referrer" /> : <div className="mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-2xl bg-slate-100 text-slate-400">Mã QR thất bại</div>}<div className="mt-4 space-y-2 text-xs text-slate-500"><div className="flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> Hỗ trợ mọi ngân hàng</div><div>Mở ứng dụng ngân hàng và bấm &quot;Quét mã&quot;</div>{qrUrl ? <button type="button" onClick={async () => { if (!qrUrl) return; const response = await fetch(qrUrl); const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = objectUrl; a.download = `sepay-qr-${paymentMemo || 'hmath'}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(objectUrl); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50">Tải mã QR</button> : null}</div></div><div className="flex-1 space-y-6"><div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-600">Thanh toán hóa đơn tự động</span><h3 className="mt-3 text-2xl font-bold text-slate-950">Nâng cấp gói {checkoutPack?.name || 'đang tạo...'}</h3><p className="mt-1 text-sm text-slate-500">Giao dịch được đối soát hoàn toàn tự động dựa trên nội dung chuyển khoản.</p></div><div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><FieldRow label="Ngân hàng" value={pricing.sepayBankId || 'Đang tạo...'} /><FieldRow label="Số tài khoản" value={pricing.sepayAccountNo || 'Đang tạo...'} copyValue={pricing.sepayAccountNo} copied={copiedField === 'stk'} onCopy={() => handleCopy(pricing.sepayAccountNo, 'stk')} /><FieldRow label="Chủ tài khoản" value={pricing.sepayAccountName || 'Đang tạo...'} /><FieldRow label="Số tiền" value={`${(checkoutPack?.amount ?? 0).toLocaleString('vi-VN')} đ`} copyValue={String(checkoutPack?.amount ?? 0)} copied={copiedField === 'amount'} onCopy={() => handleCopy(String(checkoutPack?.amount ?? 0), 'amount')} highlight /><FieldRow label="Nội dung" value={paymentMemo || 'Đang tạo...'} copyValue={paymentMemo} copied={copiedField === 'memo'} onCopy={() => handleCopy(paymentMemo, 'memo')} mono badge /></div><div className="space-y-3"><div className="flex items-center gap-3 text-xs text-slate-500"><RefreshCw className={`h-4 w-4 text-indigo-600 ${isCheckingPayment ? 'animate-spin' : ''}`} /><p>Hệ thống tự động đồng bộ tài khoản. Không tải lại trang này khi tiền đang xử lý.</p></div>{checkMessage ? <div className={`rounded-2xl border p-3.5 text-xs font-bold leading-normal ${checkMessage.includes('thành công') ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : checkMessage.toLowerCase().includes('đang') ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>{checkMessage}</div> : null}<div className="flex gap-3"><button onClick={() => { setIsCheckoutOpen(false); setPaymentIntentId(''); setPaymentMemo(''); setCheckoutPack(null); setCheckoutDetails(null); setCheckoutStatus('idle'); setCheckoutError(''); setCheckMessage(''); }} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button></div></div></div></>}</div></div>)}
    </div>);
}
