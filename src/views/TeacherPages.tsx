import { useState, useEffect } from 'react';
import { ExamManager } from '../components/ExamManager';
import { Users, Shield } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';


export function TeacherExams() {
  return (
    <div className="animate-in fade-in duration-500">
       <ExamManager />
    </div>
  );
}

export function TeacherUsers() {
   const [students, setStudents] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
     const q = query(collection(db, 'users'), where('role', '==', 'student'));
     const unsubscribe = onSnapshot(q, (snapshot) => {
       const studentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setStudents(studentList);
       setIsLoading(false);
     }, (err) => {
       console.error("Error fetching students:", err);
       setIsLoading(false);
     });
     
     return () => unsubscribe();
   }, []);

   if (isLoading) {
      return <div className="py-20 text-center animate-pulse text-slate-500">Đang tải danh sách học sinh...</div>;
   }

   return (
     <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
       <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
         <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
           <Users className="w-6 h-6"/>
         </div>
         <div>
           <h2 className="text-2xl font-bold text-slate-800">Học sinh & Lớp học</h2>
           <p className="text-slate-500 text-sm">Quản lý danh sách học sinh trên hệ thống</p>
         </div>
       </div>

       <div className="overflow-x-auto">
         <table className="w-full text-left">
           <thead>
             <tr className="border-b border-slate-200 text-slate-500 text-sm">
               <th className="pb-3 font-semibold px-4">Họ và tên</th>
               <th className="pb-3 font-semibold px-4">Email</th>
               <th className="pb-3 font-semibold px-4">Zalo</th>
             </tr>
           </thead>
           <tbody>
             {students.map(s => (
               <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                 <td className="py-4 px-4 font-bold text-slate-700">{s.fullName || s.name || 'Chưa cập nhật'}</td>
                 <td className="py-4 px-4 text-slate-600">{s.email}</td>
                 <td className="py-4 px-4 text-slate-600 font-mono">{s.zalo || 'Chưa có'}</td>
               </tr>
             ))}
             {students.length === 0 && (
               <tr>
                 <td colSpan={3} className="py-8 text-center text-slate-500">Chưa có học sinh nào trên hệ thống</td>
               </tr>
             )}
           </tbody>
         </table>
       </div>
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
      sepayApiKey: '',
      sepayBankId: '',
      sepayAccountNo: '',
      sepayAccountName: ''
   });
   const [isSaving, setIsSaving] = useState(false);
   const [message, setMessage] = useState('');

   useEffect(() => {
     const fetchSettings = async () => {
       try {
         const docRef = doc(db, 'settings', 'global');
         const docSnap = await getDoc(docRef);
         if (docSnap.exists()) {
            setSettings(prev => ({ ...prev, ...docSnap.data() }));
         }
       } catch (err) {
         console.error("Error loading settings:", err);
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
     <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-500 max-w-4xl mx-auto">
       <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
         <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
           <Shield className="w-6 h-6"/>
         </div>
         <div>
           <h2 className="text-2xl font-bold text-slate-800">Cài đặt hệ thống</h2>
           <p className="text-slate-500 text-sm">Cấu hình phân quyền và quản lý thông tin chung của tài khoản.</p>
         </div>
       </div>

       <div className="space-y-8 max-w-3xl">
         {/* General Settings */}
         <div className="space-y-5">
           <h3 className="text-md font-bold text-slate-800 border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-xs">Cấu hình chung</h3>
           
           <div>
             <label className="flex items-center gap-3 cursor-pointer">
               <input type="checkbox" checked={settings.allowPublicRegistration} onChange={e => setSettings({...settings, allowPublicRegistration: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
               <span className="font-semibold text-slate-700">Cho phép học sinh tự do đăng ký tài khoản</span>
             </label>
             <p className="text-sm text-slate-500 ml-8 mt-1">Nếu tắt, học sinh chỉ có thể đăng nhập bằng tài khoản được giáo viên cấp.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div>
               <label className="block font-semibold text-slate-700 mb-2">Thời gian thi mặc định (phút)</label>
               <input type="number" value={settings.defaultExamTimeLimit} onChange={e => setSettings({...settings, defaultExamTimeLimit: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-medium" />
             </div>

             <div>
               <label className="block font-semibold text-slate-700 mb-2">Mức độ chống gian lận</label>
               <select value={settings.antiCheatStrictness} onChange={e => setSettings({...settings, antiCheatStrictness: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-medium bg-white">
                 <option value="low">Thấp (Chỉ cảnh báo)</option>
                 <option value="medium">Trung bình (Ghi nhận số lần vi phạm)</option>
                 <option value="high">Cao (Cấm thi quá 3 lần vi phạm)</option>
               </select>
             </div>
           </div>
         </div>

         {/* VIP Pricing Settings */}
         <div className="space-y-5 pt-6 border-t border-slate-100">
           <h3 className="text-md font-bold text-slate-800 border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-xs">Cấu hình giá bán gói VIP</h3>
           <p className="text-sm text-slate-500">Giáo viên tự cấu hình mức giá (VND) cho từng loại VIP để hiển thị cho học sinh nâng cấp.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mức giá VIP 1 tháng (30 ngày)</label>
               <div className="relative">
                 <input type="number" value={settings.vip1MonthPrice} onChange={e => setSettings({...settings, vip1MonthPrice: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 outline-none focus:border-indigo-500 font-medium" />
                 <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">đ</span>
               </div>
             </div>

             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mức giá VIP 6 tháng (180 ngày)</label>
               <div className="relative">
                 <input type="number" value={settings.vip6MonthPrice} onChange={e => setSettings({...settings, vip6MonthPrice: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 outline-none focus:border-indigo-500 font-medium" />
                 <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">đ</span>
               </div>
             </div>

             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mức giá VIP 1 năm (365 ngày)</label>
               <div className="relative">
                 <input type="number" value={settings.vip1YearPrice} onChange={e => setSettings({...settings, vip1YearPrice: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 outline-none focus:border-indigo-500 font-medium" />
                 <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">đ</span>
               </div>
             </div>
           </div>
         </div>

         {/* SePay Account Settings */}
         <div className="space-y-5 pt-6 border-t border-slate-100">
           <h3 className="text-md font-bold text-slate-800 border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-xs">Kết nối thanh toán qua SePay QR</h3>
           <p className="text-sm text-slate-500">Giúp học sinh tự động quét mã QR, hệ thống tự đối soát và kích hoạt VIP ngay lập tức khi tiền về tài khoản ngân hàng của bạn thông qua cổng SePay.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngân hàng thụ hưởng</label>
               <select value={settings.sepayBankId || ''} onChange={e => setSettings({...settings, sepayBankId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-medium bg-white">
                 <option value="">-- Chọn ngân hàng --</option>
                 <option value="MB">MB Bank (Ngân hàng Quân Đội)</option>
                 <option value="VCB">Vietcombank</option>
                 <option value="TCB">Techcombank</option>
                 <option value="ACB">ACB Bank</option>
                 <option value="BIDV">BIDV</option>
                 <option value="ICB">VietinBank</option>
                 <option value="VBA">Agribank</option>
                 <option value="VPB">VPBank</option>
                 <option value="TPB">TPBank</option>
                  <option value="MSB">MSB (Ngân hàng Hàng Hải Việt Nam)</option>
               </select>
             </div>

             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1.5">Số tài khoản ngân hàng</label>
               <input type="text" placeholder="Nhập số tài khoản" value={settings.sepayAccountNo || ''} onChange={e => setSettings({...settings, sepayAccountNo: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-medium" />
             </div>

             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên chủ tài khoản (Viết hoa không dấu)</label>
               <input type="text" placeholder="Ví dụ: NGUYEN VAN A" value={settings.sepayAccountName || ''} onChange={e => setSettings({...settings, sepayAccountName: e.target.value.toUpperCase()})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-medium" />
             </div>

             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1.5">SePay API API Token (Authorization Bearer Token)</label>
               <input type="password" placeholder="sepay_apitoken_..." value={settings.sepayApiKey || ''} onChange={e => setSettings({...settings, sepayApiKey: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-medium" />
             </div>
           </div>
         </div>

         <div className="pt-6 border-t border-slate-100 flex items-center gap-4">
           <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm">
             {isSaving ? 'Đang lưu...' : 'Lưu cài đặt cấu hình'}
           </button>
           {message && (
             <span className={`font-semibold text-sm ${message.includes('lỗi') ? 'text-rose-600' : 'text-emerald-600'}`}>
                {message}
             </span>
           )}
         </div>
       </div>
     </div>
   );
}
