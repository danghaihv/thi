import { useEffect, useState } from 'react';
import { BookOpen, Trophy, Clock, Target, CalendarDays, History as HistoryIcon, FileText, Eye, X, User, Phone, Mail, Save, Sparkles, ShieldCheck, Check, Copy, RefreshCw, Star, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { LatexRenderer } from '../components/LatexRenderer';

export function StudentDashboard() {
   const [mockHistory, setMockHistory] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   
   useEffect(() => {
     // Wait for auth to be ready
     if (!auth.currentUser) {
       const unsub = auth.onAuthStateChanged((user) => {
         if (user) {
           fetchHistory();
         }
       });
       return () => unsub();
     }
     
     fetchHistory();
   }, []);

   const fetchHistory = async () => {
     if (!auth.currentUser) {
       setError('Chưa đăng nhập');
       setIsLoading(false);
       return;
     }
     
     try {
       setError(null);
       setIsLoading(true);
       const q = query(collection(db, 'submissions'), where('studentId', '==', auth.currentUser.uid));
       const snapshot = await getDocs(q);
       const list: any[] = [];
       snapshot.forEach(doc => {
         list.push({ id: doc.id, ...doc.data() });
       });
       setMockHistory(list);
       setIsLoading(false);
     } catch (err: any) {
       console.error('Error fetching history:', err);
       setError(err.message || 'Không thể tải dữ liệu');
       setIsLoading(false);
     }
   };

   const getLast7DaysData = () => {
     const result = [];
     const today = new Date();
     today.setHours(0, 0, 0, 0);

     for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const dayHistory = mockHistory.filter(h => {
           const d = new Date(h.submittedAt);
           return d >= startOfDay && d <= endOfDay;
        });
        
        const avgScore = dayHistory.length > 0 
           ? dayHistory.reduce((acc, curr) => acc + (curr.scoreEarned !== undefined ? curr.scoreEarned : ((curr.score / curr.total) * (curr.examTotalScore || 10))), 0) / dayHistory.length
           : 0;
           
        const dayName = date.toLocaleDateString('vi-VN', { weekday: 'short' });
        result.push({
           name: dayName,
           diem: Number(avgScore.toFixed(1))
        });
     }
     return result;
   };

   const chartData = getLast7DaysData();

   const totalSeconds = mockHistory.reduce((acc, curr) => acc + (curr.timeSpent || 1800), 0);
   const hours = Math.floor(totalSeconds / 3600);
   const minutes = Math.floor((totalSeconds % 3600) / 60);
   const timeString = mockHistory.length === 0 ? '0 phút' : (hours > 0 ? `${hours}h ${minutes}p` : `${minutes} phút`);

   if (isLoading) {
     return (
       <div className="py-20 text-center">
         <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
         <p className="text-slate-500">Đang tải dữ liệu...</p>
       </div>
     );
   }

   if (error) {
     return (
       <div className="py-20 text-center">
         <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-6 py-3 rounded-lg border border-red-200">
           <AlertCircle className="w-5 h-5" />
           <span>{error}</span>
         </div>
       </div>
     );
   }

   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <div className="mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Tổng quan học tập</h2>
            <p className="text-slate-500 mt-1">Theo dõi tiến trình và kết quả rèn luyện của bản thân.</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard title="Đề đã làm" value={mockHistory.length.toString()} icon={<BookOpen className="w-6 h-6 text-indigo-600"/>} />
            <StatCard title="Điểm trung bình" value={mockHistory.length > 0 ? (mockHistory.reduce((acc, curr) => acc + (curr.scoreEarned !== undefined ? curr.scoreEarned : ((curr.score / curr.total) * (curr.examTotalScore || 10))), 0) / mockHistory.length).toFixed(1) : "0"} icon={<Trophy className="w-6 h-6 text-amber-500"/>} />
            <StatCard title="Thời gian học" value={timeString} icon={<Clock className="w-6 h-6 text-emerald-600"/>} />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
               <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">Biểu đồ điểm số 7 ngày qua</h3>
               <div className="h-64 absolute bottom-0 left-0 right-0 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDiem" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 10]} dx={-10} />
                        <Tooltip contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px'}} />
                        <Area type="monotone" dataKey="diem" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorDiem)" name="Điểm số" />
                     </AreaChart>
                   </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
               <h3 className="font-bold text-slate-800 mb-6">Hoạt động gần đây</h3>
               <div className="space-y-4">
                 {mockHistory.slice(0,4).map(h => (
                    <div key={h.id} className="flex gap-4 group hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors cursor-pointer">
                       <div className="mt-1 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                         <FileText className="w-5 h-5"/>
                       </div>
                       <div>
                         <p className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-indigo-700 transition-colors">{h.examId} (Bài nộp)</p>
                         <div className="flex gap-2 text-xs text-slate-500 mt-2 font-medium">
                           <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5"/> {new Date(h.submittedAt).toLocaleDateString()}</span>
                           <span>•</span>
                           <span className="text-emerald-600">Điểm: {((h.scoreEarned !== undefined ? h.scoreEarned : ((h.score / h.total) * h.examTotalScore))).toFixed(1)}</span>
                         </div>
                       </div>
                    </div>
                 ))}
                 {mockHistory.length === 0 && <div className="text-sm text-slate-500">Chưa có hoạt động.</div>}
               </div>
            </div>
         </div>
      </div>
   )
}

function StatCard({title, value, icon}: any) {
   return (
       <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
           <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-500">{title}</div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                 {icon}
              </div>
           </div>
           <div className="text-3xl font-extrabold text-slate-800">{value}</div>
       </div>
   )
}

export function StudentHistory() {
   const [mockHistory, setMockHistory] = useState<any[]>([]);
   const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
   const [loadedExam, setLoadedExam] = useState<any | null>(null);
   const [isLoadingExam, setIsLoadingExam] = useState<boolean>(false);
   const [currentUser, setCurrentUser] = useState<any>(null);
   const [examTitleMap, setExamTitleMap] = useState<Record<string, string>>({});

   useEffect(() => {
      if (!selectedSubmission) {
         setLoadedExam(null);
         return;
      }
      const needsExamFetch = selectedSubmission.results?.some((r: any) => !r.options || r.options.length === 0);
      if (needsExamFetch) {
         setIsLoadingExam(true);
         const fetchExam = async () => {
            try {
               const examDoc = await getDoc(doc(db, 'exams', selectedSubmission.examId));
               if (examDoc.exists()) {
                  setLoadedExam(examDoc.data());
               }
            } catch (err) {
               console.error("Lỗi khi tải thông tin đề thi để lấy các phương án:", err);
            } finally {
               setIsLoadingExam(false);
            }
         };
         fetchExam();
      }
   }, [selectedSubmission]);
   
   useEffect(() => {
     const fetchHistory = async () => {
       if (!auth.currentUser) return;
       try {
         const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
         if (userDoc.exists()) {
           setCurrentUser(userDoc.data());
         }

         const q = query(collection(db, 'submissions'), where('studentId', '==', auth.currentUser.uid));
         const snapshot = await getDocs(q);
         const list: any[] = [];
         const examIds = new Set<string>();

         snapshot.forEach(doc => {
           const row = { id: doc.id, ...doc.data() } as any;
           list.push(row);
           if (row.examId) examIds.add(String(row.examId));
         });

         const nextTitleMap: Record<string, string> = {};
         await Promise.all(Array.from(examIds).map(async (examId) => {
           try {
             const examDoc = await getDoc(doc(db, 'exams', examId));
             if (examDoc.exists()) {
               const examData: any = examDoc.data();
               nextTitleMap[examId] = examData.title || examId;
             }
           } catch {
             nextTitleMap[examId] = examId;
           }
         }));

         setExamTitleMap(nextTitleMap);
         setMockHistory(list);
       } catch (err) {
         handleFirestoreError(err, OperationType.LIST, 'submissions');
       }
     };
     fetchHistory();
   }, []);

   const isVipUser = currentUser?.vipExpiry && new Date(currentUser.vipExpiry).getTime() > Date.now();
   const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
   const canViewDetail = Boolean(isVipUser || isStaff);

   const getOptionLabel = (idx: number) => {
      if (idx < 0) return 'Chưa chọn';
      return String.fromCharCode(65 + idx); // 0 -> A, 1 -> B
   }

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Lịch sử làm bài</h2>
            <p className="text-slate-500 mt-1">Toàn bộ danh sách các đề thi bạn đã hoàn thành.</p>
         </div>
         
         <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                        <th className="font-semibold p-5 pl-6">Tên đề thi</th>
                        <th className="font-semibold p-5">Mã Đề thi</th>
                        <th className="font-semibold p-5">Ngày nộp</th>
                        <th className="font-semibold p-5">Câu đúng</th>
                        <th className="font-semibold p-5">Điểm hệ 10</th>
                        <th className="font-semibold p-5 pr-6 text-right">Thao tác</th>
                     </tr>
                  </thead>
                  <tbody>
                     {mockHistory.map(h => (
                       <tr key={h.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50/50 transition-colors">
                          <td className="p-5 pl-6 font-semibold text-slate-800">
                            {h.examTitle || h.examName || h.title || examTitleMap[String(h.examId)] || h.examId}
                          </td>
                          <td className="p-5 font-semibold text-slate-700">
                            {h.examId}
                          </td>
                          <td className="p-5 text-slate-600 text-sm font-medium">
                            <div className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-slate-400"/> {new Date(h.submittedAt).toLocaleString()}</div>
                          </td>
                          <td className="p-5 text-slate-600 text-sm font-medium">
                            <div className="flex items-center gap-1.5">{h.score} / {h.total}</div>
                          </td>
                          <td className="p-5">
                            <span className={`inline-block px-3.5 py-1.5 rounded-full text-sm font-bold shadow-sm ${((h.scoreEarned !== undefined ? h.scoreEarned : ((h.score / h.total) * h.examTotalScore))) >= 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {((h.scoreEarned !== undefined ? h.scoreEarned : ((h.score / h.total) * h.examTotalScore))).toFixed(1)}
                            </span>
                          </td>
                          <td className="p-5 pr-6 text-right">
                             {h.showResultAfter !== false && h.results && (
                               <button
                                 onClick={() => {
                                   if (canViewDetail) {
                                     setSelectedSubmission(h);
                                   } else {
                                     window.alert('Tính năng xem đáp án chi tiết chỉ dành cho tài khoản VIP. Bạn sẽ được chuyển đến trang nâng cấp.');
                                     window.location.hash = '#/profile';
                                   }
                                 }}
                                 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-sm font-medium transition-colors"
                               >
                                 <Eye className="w-4 h-4" /> {canViewDetail ? 'Xem chi tiết' : 'Nâng VIP để xem'}
                               </button>
                             )}
                          </td>
                       </tr>
                     ))}
                     {mockHistory.length === 0 && (
                        <tr><td colSpan={6} className="p-5 text-center text-slate-500">Chưa có bài thi nào</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {selectedSubmission && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100">
                     <div>
                        <h3 className="text-xl font-bold text-slate-800">Chi tiết bài làm</h3>
                        <p className="text-sm text-slate-500 mt-1">Mã đề: {selectedSubmission.examId}</p>
                     </div>
                     <button onClick={() => setSelectedSubmission(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                     {isLoadingExam && (
                        <div className="text-center py-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 animate-pulse text-sm font-medium">
                           🔄 Đang tải các phương án của đề thi để đối chiếu...
                        </div>
                     )}
                     {selectedSubmission.results ? selectedSubmission.results.map((r: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-2xl border ${r.isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                           <div className="flex items-start justify-between mb-2">
                              <span className="font-bold text-slate-700">Câu {idx + 1}</span>
                              <span className={`text-sm font-bold ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {r.isCorrect ? 'Đúng' : 'Sai'}
                              </span>
                           </div>
                           {r.content && (
                              <div className="text-sm font-medium text-slate-800 mb-3 bg-white p-3 rounded-xl border border-slate-100">
                                 <LatexRenderer content={r.content} />
                                 {r.imageUrl && (
                                    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-2 inline-block">
                                       <img src={r.imageUrl} alt={`Hình ảnh Câu ${idx + 1}`} className="max-h-36 rounded-lg object-contain" referrerPolicy="no-referrer" />
                                    </div>
                                 )}
                              </div>
                           )}

                           {(() => {
                              const options = r.options || loadedExam?.questions?.find((q: any) => q.id === r.questionId)?.options || [];
                              if (!options || options.length === 0) return null;
                              return (
                                 <div className="mb-4 mt-2 space-y-2">
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Các phương án lựa chọn:</div>
                                    <div className="grid grid-cols-1 gap-2 mb-4">
                                       {options.map((opt: string, optIdx: number) => {
                                          const isSelected = r.studentAnswer === optIdx;
                                          const isCorrectOption = r.correctAnswer === optIdx;
                                          
                                          let optStyle = "border-slate-100 bg-white text-slate-700";
                                          let badgeStyle = "bg-white border-slate-200 text-slate-500";
                                          
                                          if (isCorrectOption) {
                                             optStyle = "border-emerald-200 bg-emerald-50/50 text-emerald-950 font-medium";
                                             badgeStyle = "bg-emerald-600 border-emerald-600 text-white";
                                          } else if (isSelected) {
                                             optStyle = "border-rose-200 bg-rose-50/50 text-rose-950 font-medium";
                                             badgeStyle = "bg-rose-600 border-rose-600 text-white";
                                          }
                                          
                                          return (
                                             <div key={optIdx} className={`flex items-center gap-3 p-3.5 text-sm transition-all rounded-xl border ${optStyle}`}>
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border shadow-sm ${badgeStyle}`}>
                                                   {String.fromCharCode(65 + optIdx)}
                                                </div>
                                                <div className="flex-1">
                                                   <LatexRenderer content={opt} />
                                                </div>
                                                {isCorrectOption && (
                                                   <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0">Đúng</span>
                                                )}
                                                {isSelected && !isCorrectOption && (
                                                   <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0">Đã chọn</span>
                                                )}
                                             </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              );
                           })()}

                           <div className="space-y-1 text-sm bg-slate-50/60 p-3 rounded-xl border border-slate-100/50">
                              <div className="flex gap-2">
                                 <span className="text-slate-500 shrink-0">Đã chọn:</span>
                                 <span className={`font-semibold ${r.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>Đáp án {getOptionLabel(r.studentAnswer)}</span>
                              </div>
                              {!r.isCorrect && (
                                 <div className="flex gap-2">
                                    <span className="text-slate-500 shrink-0">Đáp án đúng:</span>
                                    <span className="font-semibold text-emerald-700">Đáp án {getOptionLabel(r.correctAnswer)}</span>
                                 </div>
                              )}
                              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/50">
                                 <span className="text-slate-500">Điểm:</span>
                                 <span className="font-semibold text-slate-700">{r.pointsEarned} / {r.pointsPossible}</span>
                              </div>
                           </div>
                           {r.explanation && (
                              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                 <div className="font-bold text-blue-800 text-sm mb-1">Lời giải chi tiết:</div>
                                 <div className="text-sm text-blue-900 leading-relaxed font-medium">
                                    <LatexRenderer content={r.explanation} />
                                 </div>
                              </div>
                           )}
                        </div>
                     )) : (
                        <div className="text-center text-slate-500 py-8">Không có dữ liệu chi tiết.</div>
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
   )
}

export function StudentProfile() {
   const [user, setUser] = useState<any>(null);
   const [zalo, setZalo] = useState('');
   const [isSaving, setIsSaving] = useState(false);
   const [message, setMessage] = useState('');

   // VIP & Pricing States
   const [monthlyExamCount, setMonthlyExamCount] = useState(0);
   const [pricing, setPricing] = useState({
      vip1MonthPrice: 50000,
      vip6MonthPrice: 240000,
      vip1YearPrice: 450000,
      sepayBankId: '',
      sepayAccountNo: '',
      sepayAccountName: ''
   });

   // Checkout Modal States
   const [checkoutPack, setCheckoutPack] = useState<any>(null);
   const [paymentMemo, setPaymentMemo] = useState('');
   const [isCheckingPayment, setIsCheckingPayment] = useState(false);
   const [checkMessage, setCheckMessage] = useState('');
   const [copiedField, setCopiedField] = useState<string | null>(null);

   const fetchUserAndStats = async () => {
      if (!auth.currentUser) return;
      try {
         // Load user profile
         const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
         if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(userData);
            setZalo(userData.zalo || '');
            
            // Sync to local storage for consistency
            const saved = localStorage.getItem('hmath_user');
            if (saved) {
               const parsed = JSON.parse(saved);
               localStorage.setItem('hmath_user', JSON.stringify({ ...parsed, ...userData }));
            }
         }

         // Load prices & payment settings
         const setSnap = await getDoc(doc(db, 'settings', 'global'));
         if (setSnap.exists()) {
            const sData = setSnap.data() as any;
            setPricing(prev => ({
               ...prev,
               vip1MonthPrice: sData.vip1MonthPrice ?? 50000,
               vip6MonthPrice: sData.vip6MonthPrice ?? 240000,
               vip1YearPrice: sData.vip1YearPrice ?? 450000,
               sepayBankId: sData.sepayBankId || '',
               sepayAccountNo: sData.sepayAccountNo || '',
               sepayAccountName: sData.sepayAccountName || ''
            }));
         }

         // Load exams taken this month
         const startOfMonth = new Date();
         startOfMonth.setDate(1);
         startOfMonth.setHours(0, 0, 0, 0);
         const startOfMonthISO = startOfMonth.toISOString();
         
         const subQ = query(
            collection(db, 'submissions'),
            where('studentId', '==', auth.currentUser.uid),
            where('submittedAt', '>=', startOfMonthISO)
         );
         const subSnap = await getDocs(subQ);
         setMonthlyExamCount(subSnap.size);
      } catch (err) {
         console.error("Error loading profile stats:", err);
      }
   };

   useEffect(() => {
      let unsubSubmissions: (() => void) | null = null;
      let unsubAuth: (() => void) | null = null;

      const setupRealtimeCount = async (uid: string) => {
         const startOfMonth = new Date();
         startOfMonth.setDate(1);
         startOfMonth.setHours(0, 0, 0, 0);
         const startOfMonthISO = startOfMonth.toISOString();

         const subQ = query(
            collection(db, 'submissions'),
            where('studentId', '==', uid),
            where('submittedAt', '>=', startOfMonthISO)
         );

         unsubSubmissions = onSnapshot(subQ, (subSnap) => {
            setMonthlyExamCount(subSnap.size);
         }, (err) => {
            console.error('Realtime submissions counter error:', err);
         });
      };

      fetchUserAndStats();

      if (auth.currentUser) {
         setupRealtimeCount(auth.currentUser.uid);
      } else {
         unsubAuth = auth.onAuthStateChanged((user) => {
            if (user) {
               setupRealtimeCount(user.uid);
            }
         });
      }

      return () => {
         if (unsubSubmissions) unsubSubmissions();
         if (unsubAuth) unsubAuth();
      };
   }, []);

   const handleSave = async () => {
      if (!auth.currentUser) return;
      setIsSaving(true);
      setMessage('');
      try {
         await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            zalo: zalo
         });
         
         const saved = localStorage.getItem('hmath_user');
         if (saved) {
            const parsed = JSON.parse(saved);
            parsed.zalo = zalo;
            localStorage.setItem('hmath_user', JSON.stringify(parsed));
         }

         setMessage('Cập nhật thành công!');
         setTimeout(() => setMessage(''), 3000);
         fetchUserAndStats();
      } catch (err) {
         console.error(err);
         setMessage('Có lỗi xảy ra, vui lòng thử lại.');
      } finally {
         setIsSaving(false);
      }
   };

   const initiateCheckout = (packType: '1m' | '6m' | '1y') => {
      let amount = pricing.vip1MonthPrice;
      let days = 30;
      let name = "VIP 1 tháng";

      if (packType === '6m') {
         amount = pricing.vip6MonthPrice;
         days = 180;
         name = "VIP 6 tháng";
      } else if (packType === '1y') {
         amount = pricing.vip1YearPrice;
         days = 365;
         name = "VIP 1 năm";
      }

      // Generate a short 6-character unique code for the memo
      const randomCode = Math.random().toString(36).substring(3, 9).toUpperCase();
      setPaymentMemo(`HMVIP${randomCode}`);
      setCheckoutPack({ type: packType, amount, days, name });
      setCheckMessage('');
   };

   const handleCopy = (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
   };

   const verifyPayment = async () => {
      if (!auth.currentUser || !checkoutPack) return;
      setIsCheckingPayment(true);
      setCheckMessage('Đang kết nối cổng SePay đối soát giao dịch...');
      
      try {
         const response = await fetch("/api/payment/verify", {
            method: "POST",
            headers: {
               "Content-Type": "application/json"
            },
            body: JSON.stringify({
               userId: auth.currentUser.uid,
               memo: paymentMemo,
               amount: checkoutPack.amount,
               days: checkoutPack.days
            })
         });

         const contentType = response.headers.get("content-type") || "";
         let data: any = null;

         if (contentType.includes("application/json")) {
            data = await response.json();
         } else {
            const rawText = await response.text();
            const snippet = rawText.slice(0, 200).replace(/\s+/g, ' ').trim();
            console.error("SePay verify returned non-JSON response", {
               status: response.status,
               contentType,
               snippet
            });
            return;
         }

         if (!response.ok) {
            setCheckMessage(data?.error || data?.message || "Giao dịch lỗi, vui lòng thử lại sau.");
            return;
         }

         if (data?.success) {
            setCheckMessage("Đã nhận thanh toán! Tài khoản của bạn đã được nâng cấp VIP thành công 🎉!");
            setTimeout(() => {
               setCheckoutPack(null);
               fetchUserAndStats();
            }, 3000);
         } else {
            setCheckMessage(data.message || "Hệ thống chưa tìm thấy giao dịch tương ứng. Nếu bạn vừa chuyển khoản, vui lòng đợi vài giây rồi thử lại.");
         }
      } catch (err: any) {
         console.error("Payment check error:", err);
         setCheckMessage("Đã có lỗi xảy ra kết nối Server đối soát: " + err.message);
      } finally {
         setIsCheckingPayment(false);
      }
   };

   // Polling when modal is open
   useEffect(() => {
      if (!checkoutPack) return;
      const interval = setInterval(() => {
         verifyPayment();
      }, 7000); // Poll every 7s
      return () => clearInterval(interval);
   }, [checkoutPack, paymentMemo]);

   if (!user) {
      return <div className="py-20 text-center text-slate-500 animate-pulse">Đang tải thông tin...</div>;
   }

   const isVip = user.vipExpiry && new Date(user.vipExpiry).getTime() > Date.now();
   const daysRemaining = isVip ? Math.ceil((new Date(user.vipExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

   // VietQR Link
   const qrUrl = pricing.sepayBankId && pricing.sepayAccountNo
      ? `https://img.vietqr.io/image/${pricing.sepayBankId}-${pricing.sepayAccountNo}-compact2.png?amount=${checkoutPack?.amount}&addInfo=${paymentMemo}&accountName=${encodeURIComponent(pricing.sepayAccountName)}`
      : '';

   return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
         {/* Profile summary & Zalo */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
               <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
                  <div className="h-24 bg-gradient-to-br from-indigo-500 to-slate-900"></div>
                  <div className="px-6 pb-6">
                     <div className="flex justify-between items-end -mt-10 mb-4">
                        <div className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-100 flex items-center justify-center">
                           <div className="w-full h-full bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl uppercase">
                              {user.fullName ? user.fullName[0] : 'U'}
                           </div>
                        </div>
                     </div>

                     <h2 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
                        {user.fullName}
                        {isVip && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-amber-700"/> VIP</span>}
                     </h2>
                     <p className="text-slate-500 text-sm font-medium">Học sinh - Hệ thống HMath</p>

                     <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                        <div>
                           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                              <Mail className="w-3.5 h-3.5" /> Địa chỉ Email
                           </label>
                           <input 
                              type="text" 
                              value={user.email} 
                              disabled 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-600 font-medium opacity-70 cursor-not-allowed text-sm"
                           />
                        </div>

                        <div>
                           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                              <Phone className="w-3.5 h-3.5" /> Số điện thoại Zalo
                           </label>
                           <input 
                              type="text" 
                              value={zalo} 
                              onChange={(e) => setZalo(e.target.value)}
                              placeholder="Nhập số điện thoại Zalo..."
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                           />
                        </div>

                        <div className="pt-2 flex items-center gap-3">
                           <button 
                              onClick={handleSave}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                           >
                              <Save className="w-4 h-4" />
                              {isSaving ? 'Đang lưu...' : 'Lưu lại'}
                           </button>
                           {message && (
                              <span className={`font-semibold text-xs ${message.includes('lỗi') ? 'text-rose-600' : 'text-emerald-600'}`}>
                                 {message}
                              </span>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Subscription & VIP upgrade options */}
            <div className="lg:col-span-7 space-y-6">
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 text-md mb-4 flex items-center gap-2">
                     <ShieldCheck className="w-5 h-5 text-indigo-600" /> Trạng thái tài khoản
                  </h3>

                  {isVip ? (
                     <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-2xl">
                        <div className="flex items-start gap-4">
                           <div className="bg-amber-100 text-amber-700 p-2.5 rounded-xl">
                              <Sparkles className="w-6 h-6 fill-amber-700" />
                           </div>
                           <div>
                              <h4 className="font-bold text-amber-900">Thành viên VIP tích cực</h4>
                              <p className="text-sm text-amber-800/85 mt-1">Bạn đang có đặc quyền học tập cao cấp nhất: luyện đề không giới hạn, xem giải thích chi tiết, xem biểu đồ nâng cao.</p>
                              <div className="mt-3 flex items-center gap-2 font-bold text-xs text-amber-700 uppercase bg-amber-200/50 w-max px-3 py-1 rounded-full">
                                 Sẵn có • Hạn VIP còn lại: {daysRemaining} ngày ({new Date(user.vipExpiry).toLocaleDateString('vi-VN')})
                              </div>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-start gap-4">
                           <div className="bg-slate-200 text-slate-600 p-2.5 rounded-xl">
                              <User className="w-6 h-6" />
                           </div>
                           <div className="flex-1">
                              <h4 className="font-bold text-slate-800">Thành viên Miễn phí</h4>
                              <p className="text-sm text-slate-500 mt-1">Giới hạn thời gian luyện tối đa 10 đề mỗi tháng và không hỗ trợ xem đáp án, lời giải chi tiết.</p>
                              
                              <div className="mt-4 pt-4 border-t border-slate-200 leading-snug">
                                 <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                    <span>Lượt thi tháng này:</span>
                                    <span>{monthlyExamCount} / 10 đề thi</span>
                                 </div>
                                 <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                    <div 
                                       className={`h-full transition-all duration-500 ${monthlyExamCount >= 10 ? 'bg-red-500' : 'bg-indigo-600'}`} 
                                       style={{ width: `${Math.min(100, (monthlyExamCount / 10) * 100)}%` }}
                                    ></div>
                                 </div>
                                 {monthlyExamCount >= 10 && (
                                    <p className="text-xs text-red-500 font-bold mt-2">Bạn đã hoàn thành 10 đề thi tháng này. Vui lòng nâng cấp VIP để thi tiếp không giới hạn!</p>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Pricing grid */}
                  <div className="mt-8 space-y-4">
                     <div className="text-center">
                        <h4 className="font-bold text-slate-800 text-sm">CÁC GÓI NÂNG CẤP THÀNH VIÊN VIP</h4>
                        <p className="text-xs text-slate-500 mt-1">Luyện đề thỏa thích • Mở khóa giải thích chi tiết đáp án siêu tốc</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        {/* 1 Month */}
                        <div className="border border-slate-150 rounded-2xl p-4 text-center hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between">
                           <div>
                              <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">30 ngày</span>
                              <h5 className="font-bold text-slate-800 text-sm mt-2">Gói 1 tháng</h5>
                              <p className="text-indigo-600 font-extrabold text-lg mt-3">{(pricing.vip1MonthPrice).toLocaleString('vi-VN')}đ</p>
                           </div>
                           <button 
                              onClick={() => initiateCheckout('1m')}
                              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                           >
                              {isVip ? 'Gia hạn 30 ngày' : 'Nâng cấp ngay'}
                           </button>
                        </div>

                        {/* 6 Months */}
                        <div className="border-2 border-indigo-500 bg-indigo-50/25 rounded-2xl p-4 text-center relative hover:shadow-sm transition-all flex flex-col justify-between">
                           <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-extrabold bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Phổ biến</span>
                           <div>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded-full block w-max mx-auto mt-1">180 ngày</span>
                              <h5 className="font-bold text-slate-800 text-sm mt-2">Gói 6 tháng</h5>
                              <p className="text-indigo-600 font-extrabold text-lg mt-3">{(pricing.vip6MonthPrice).toLocaleString('vi-VN')}đ</p>
                              <span className="text-[10px] text-slate-400">Tiết kiệm khoảng 20%</span>
                           </div>
                           <button 
                              onClick={() => initiateCheckout('6m')}
                              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                           >
                              {isVip ? 'Gia hạn 180 ngày' : 'Nâng cấp ngay'}
                           </button>
                        </div>

                        {/* 1 Year */}
                        <div className="border border-slate-150 rounded-2xl p-4 text-center hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between">
                           <div>
                              <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">365 ngày</span>
                              <h5 className="font-bold text-slate-800 text-sm mt-2">Gói 1 năm</h5>
                              <p className="text-indigo-600 font-extrabold text-lg mt-3">{(pricing.vip1YearPrice).toLocaleString('vi-VN')}đ</p>
                              <span className="text-[10px] text-slate-400">Tiết kiệm khoảng 25%</span>
                           </div>
                           <button 
                              onClick={() => initiateCheckout('1y')}
                              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                           >
                              {isVip ? 'Gia hạn 365 ngày' : 'Nâng cấp ngay'}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Automated VietQR + SePay polling checkout overlay */}
         {checkoutPack && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
               <div className="bg-white rounded-3xl w-full max-w-4xl p-6 md:p-8 relative shadow-2xl border border-slate-100 flex flex-col md:flex-row gap-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  
                  {/* Close button */}
                  <button 
                     onClick={() => setCheckoutPack(null)}
                     className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                  >
                     <X className="w-5 h-5" />
                  </button>

                  {!pricing.sepayBankId || !pricing.sepayAccountNo ? (
                     <div className="flex-1 py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                        <AlertCircle className="w-16 h-16 text-amber-500" />
                        <h4 className="font-bold text-lg text-slate-800">Cổng thanh toán chưa sẵn sàng</h4>
                        <p className="text-sm max-w-md">Giáo viên / Admin chưa thiết lập tài khoản ngân hàng thụ hưởng qua SePay trong Cài đặt hệ thống. Vui lòng liên hệ giáo viên để thực hiện kích hoạt VIP thủ công!</p>
                     </div>
                  ) : (
                     <>
                        {/* Column 1: QR Image */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl p-4 md:p-6 border border-slate-100">
                           <h4 className="font-extrabold text-indigo-600 text-sm mb-4">QUÉT MÃ QR QR-PAY ĐỂ THANH TOÁN</h4>
                           
                           {qrUrl ? (
                              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 aspect-square w-full max-w-[240px] flex items-center justify-center relative">
                                 <img 
                                    src={qrUrl} 
                                    alt="VietQR SePay VIP Code" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-contain"
                                 />
                              </div>
                           ) : (
                              <div className="w-[240px] h-[240px] bg-slate-100 text-slate-400 flex items-center justify-center rounded-2xl">Mã QR thất bại</div>
                           )}

                           <div className="mt-4 text-xs text-slate-500 flex flex-col items-center gap-1.5 font-medium">
                              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-500" /> Hỗ trợ mọi ngân hàng (MB, VCB, Techcombank,...)</span>
                              <span>Mở ứng dụng ngân hàng và bấm "Quét mã"</span>
                           </div>
                        </div>

                        {/* Column 2: Information and Checks */}
                        <div className="flex-1 flex flex-col justify-between space-y-6">
                           <div>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase">Thanh toán hóa đơn tự động</span>
                              <h3 className="text-xl font-bold text-slate-800 mt-2">Nâng cấp gói {checkoutPack.name}</h3>
                              <p className="text-xs text-slate-500 mt-1">Giao dịch được đối soát hoàn toàn tự động dựa trên nội dung chuyển khoản.</p>
                           </div>

                           <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                 <span className="text-slate-500 font-medium">Ngân hàng:</span>
                                 <div className="flex items-center gap-1 font-bold text-slate-800">
                                    <span>{pricing.sepayBankId}</span>
                                 </div>
                              </div>

                              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                 <span className="text-slate-500 font-medium">Số tài khoản:</span>
                                 <div className="flex items-center gap-2 font-bold text-slate-800">
                                    <span>{pricing.sepayAccountNo}</span>
                                    <button 
                                       onClick={() => handleCopy(pricing.sepayAccountNo, 'stk')}
                                       className="text-indigo-600 hover:text-indigo-800 text-xs p-1 bg-white border border-slate-200 rounded hover:shadow-xs transition-all cursor-pointer"
                                       title="Sao chép"
                                    >
                                       {copiedField === 'stk' ? 'Đã chép' : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                 </div>
                              </div>

                              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                 <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
                                 <span className="font-bold text-slate-800">{pricing.sepayAccountName}</span>
                              </div>

                              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                 <span className="text-slate-500 font-medium">Số tiền:</span>
                                 <div className="flex items-center gap-2 font-extrabold text-indigo-600">
                                    <span>{(checkoutPack.amount).toLocaleString('vi-VN')} đ</span>
                                    <button 
                                       onClick={() => handleCopy(checkoutPack.amount.toString(), 'amount')}
                                       className="text-indigo-600 hover:text-indigo-800 text-xs p-1 bg-white border border-slate-200 rounded hover:shadow-xs transition-all cursor-pointer"
                                       title="Sao chép"
                                    >
                                       {copiedField === 'amount' ? 'Đã chép' : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                 </div>
                              </div>

                              <div className="flex justify-between items-center text-sm">
                                 <span className="text-slate-500 font-medium">Nội dung (CỰC KỲ QUAN TRỌNG):</span>
                                 <div className="flex items-center gap-2 font-extrabold text-indigo-600">
                                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs select-all font-mono tracking-wider">{paymentMemo}</span>
                                    <button 
                                       onClick={() => handleCopy(paymentMemo, 'memo')}
                                       className="text-indigo-600 hover:text-indigo-800 text-xs p-1 bg-white border border-slate-200 rounded hover:shadow-xs transition-all cursor-pointer"
                                       title="Sao chép"
                                    >
                                       {copiedField === 'memo' ? 'Đã chép' : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-3 pt-2">
                              <div className="flex items-center gap-3 text-xs text-slate-500 leading-snug">
                                 <RefreshCw className={`w-4 h-4 text-indigo-600 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                                 <p>Hệ thống tự động đồng bộ tài khoản. Không tải lại trang này khi tiền đang xử lý.</p>
                              </div>

                              {checkMessage && (
                                 <div className={`p-3.5 rounded-xl border text-xs font-bold leading-normal flex gap-2 ${
                                    checkMessage.includes('thành công') 
                                       ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                       : checkMessage.includes('đang') || checkMessage.includes('Đang')
                                          ? 'bg-indigo-50/50 text-indigo-700 border-indigo-100'
                                          : 'bg-amber-50 text-amber-700 border-amber-100'
                                 }`}>
                                    <div className="pt-0.5">•</div>
                                    <p className="flex-1">{checkMessage}</p>
                                 </div>
                              )}

                              <div className="flex gap-3">
                                 <button 
                                    onClick={verifyPayment}
                                    disabled={isCheckingPayment}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                                 >
                                    <RefreshCw className={`w-4 h-4 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                                    Tôi đã chuyển khoản - Kiểm tra ngay
                                 </button>
                                 
                                 <button 
                                    onClick={() => setCheckoutPack(null)}
                                    className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-3 rounded-xl transition-all cursor-pointer"
                                 >
                                    Hủy
                                 </button>
                              </div>
                           </div>
                        </div>
                     </>
                     )}
                  
               </div>
            </div>
         )}
      </div>
   );
}
