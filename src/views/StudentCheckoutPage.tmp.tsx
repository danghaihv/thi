import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { auth } from '../lib/firebase';

type CheckoutPack = { amount: number; days: number; name: string };

export function StudentCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [pack, setPack] = useState<CheckoutPack | null>(null);
  const [intentId, setIntentId] = useState('');
  const [memo, setMemo] = useState('');
  const [bankId, setBankId] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [message, setMessage] = useState('Đang tạo hóa đơn thanh toán...');
  const [copied, setCopied] = useState<string | null>(null);

  const planCode = useMemo(() => {
    const p = new URLSearchParams(location.search).get('plan') || 'vip_1m';
    if (p === 'vip_6m' || p === 'vip_1y' || p === 'vip_1m') return p;
    return 'vip_1m';
  }, [location.search]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1600);
  };

  const downloadQr = async () => {
    if (!qrUrl) return;
    const r = await fetch(qrUrl);
    const b = await r.blob();
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sepay-qr-${memo || 'hmath'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const createIntent = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setMessage('Phiên đăng nhập chưa sẵn sàng. Vui lòng đăng nhập lại.');
      setIsLoading(false);
      return;
    }

    try {
      const resp = await fetch('/api/payment/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, planCode })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMessage(data.error || 'Không thể tạo hóa đơn thanh toán.');
        setIsLoading(false);
        return;
      }

      setIntentId(data.intentId || '');
      setMemo(data.memo || '');
      setBankId(data.bankId || '');
      setAccountNo(data.accountNo || '');
      setAccountName(data.accountName || '');
      setPack({ amount: Number(data.amount || 0), days: Number(data.days || 0), name: data.label || 'Gói VIP' });
      setMessage('Đang chờ hệ thống ghi nhận thanh toán...');
    } catch (e: any) {
      setMessage('Lỗi kết nối khi tạo hóa đơn: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIntent = async () => {
    if (!intentId) return;
    setIsChecking(true);
    try {
      const resp = await fetch(`/api/payment/intents/${intentId}`);
      const data = await resp.json();
      if (!resp.ok) {
        setMessage(data.error || 'Không thể kiểm tra trạng thái.');
        return;
      }
      const status = data?.intent?.status;
      if (status === 'fulfilled') {
        setMessage('Đã nhận thanh toán! Tài khoản của bạn đã được nâng cấp VIP thành công 🎉!');
        setTimeout(() => navigate('/profile'), 2000);
        return;
      }
      if (status === 'expired') {
        setMessage('Mã thanh toán đã hết hạn. Vui lòng quay lại chọn gói để tạo mã mới.');
        return;
      }
      setMessage('Đang chờ hệ thống ghi nhận thanh toán...');
    } catch (e: any) {
      setMessage('Lỗi kiểm tra trạng thái thanh toán: ' + e.message);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => { createIntent(); }, [planCode]);
  useEffect(() => {
    if (!intentId) return;
    const t = setInterval(() => { checkIntent(); }, 5000);
    return () => clearInterval(t);
  }, [intentId]);

  const qrUrl = bankId && accountNo && pack
    ? `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${pack.amount}&addInfo=${memo}&accountName=${encodeURIComponent(accountName)}`
    : '';

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Thanh toán nâng cấp VIP</h2>
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 animate-pulse">Đang tạo hóa đơn thanh toán...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 text-center">
            <h3 className="font-extrabold text-indigo-600 text-sm mb-4">QUÉT MÃ QR ĐỂ THANH TOÁN</h3>
            {qrUrl ? <img src={qrUrl} alt="VietQR" className="mx-auto w-64 h-64 object-contain bg-white p-2 rounded-xl border" /> : <div className="h-64 bg-slate-100 rounded-xl" />}
            <button onClick={downloadQr} className="mt-4 px-3 py-2 rounded-lg bg-white border text-slate-700 font-semibold">Tải mã QR</button>
          </div>

          <div className="space-y-4">
            <div className="text-sm border rounded-xl p-4 bg-slate-50">
              <div className="flex justify-between py-1"><span>Ngân hàng:</span><b>{bankId || '-'}</b></div>
              <div className="flex justify-between py-1"><span>Số tài khoản:</span><b>{accountNo || '-'}</b></div>
              <div className="flex justify-between py-1"><span>Chủ tài khoản:</span><b>{accountName || '-'}</b></div>
              <div className="flex justify-between py-1"><span>Số tiền:</span><b>{pack ? pack.amount.toLocaleString('vi-VN') + ' đ' : '-'}</b></div>
              <div className="flex justify-between items-center py-1"><span>Nội dung:</span><b className="font-mono">{memo || '-'}</b></div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleCopy(accountNo, 'stk')} className="text-xs px-2 py-1 rounded bg-white border">{copied === 'stk' ? 'Đã chép STK' : 'Chép STK'}</button>
                <button onClick={() => handleCopy(memo, 'memo')} className="text-xs px-2 py-1 rounded bg-white border">{copied === 'memo' ? 'Đã chép ND' : 'Chép nội dung'}</button>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-indigo-600 ${isChecking ? 'animate-spin' : ''}`} />
              Hệ thống tự động đối soát thanh toán mỗi 5 giây.
            </div>

            <div className={`p-3 rounded-xl text-sm font-semibold border ${message.includes('thành công') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : message.includes('Lỗi') ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
              {message}
            </div>

            <div className="flex gap-3">
              <button onClick={checkIntent} disabled={isChecking} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl">Tôi đã chuyển khoản - Kiểm tra ngay</button>
              <button onClick={() => navigate('/profile')} className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl">Quay lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
