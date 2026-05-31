import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Maximize, AlertTriangle, List, X, Sparkles, ArrowRight, GraduationCap, Lock } from 'lucide-react';
import { LatexRenderer } from '../components/LatexRenderer';
import { getDoc, doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { generateId } from '../utils/parser';

function cleanUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = cleanUndefined(val);
      }
    }
    return res;
  }
  return obj;
}

export default function ExamWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceRef = useRef<HTMLDivElement>(null);
  
  const [exam, setExam] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenBypassed, setFullscreenBypassed] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [timeWarningDismissed, setTimeWarningDismissed] = useState(false);
  const [showDetailedResult, setShowDetailedResult] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [recommendedExams, setRecommendedExams] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkLimitError, setCheckLimitError] = useState<string | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [showVipModalToViewSolution, setShowVipModalToViewSolution] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Reset all state when loading or changing exam
    setExam(null);
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft(0);
    setResult(null);
    setWarnings(0);
    setShowTimeWarning(false);
    setTimeWarningDismissed(false);
    setShowDetailedResult(false);
    setShowMobileNav(false);
    setSubmitError(null);
    setShowConfirmSubmit(false);
    setRecommendedExams([]);

    const fetchExam = async () => {
      try {
        const docRef = doc(db, 'exams', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          let procQuestions = [...data.questions];
          
          if (data.config?.shuffleOptions) {
            procQuestions = procQuestions.map((q: any) => {
              const optionsWithIdx = q.options.map((opt: string, i: number) => ({ opt, index: i }));
              optionsWithIdx.sort(() => Math.random() - 0.5);
              return {
                ...q,
                options: optionsWithIdx.map((o: any) => o.opt),
                correctAnswer: optionsWithIdx.findIndex((o: any) => o.index === q.correctAnswer)
              };
            });
          }
          
          if (data.config?.shuffleQuestions) {
            procQuestions.sort(() => Math.random() - 0.5);
          }
          
          setExam({ ...data, id: docSnap.id, questions: procQuestions });
          setTimeLeft(data.timeLimit);
        } else {
          navigate('/');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'exams/' + id);
      }
    };
    fetchExam();
  }, [id, navigate]);

  useEffect(() => {
    let unsubAuth: (() => void) | null = null;

    const checkSubLimit = async (uid: string) => {
      if (!id) return;
      setCheckingLimit(true);
      setCheckLimitError(null);

      try {
        const uDoc = await getDoc(doc(db, 'users', uid));
        if (uDoc.exists()) {
          const uData = uDoc.data();
          setCurrentUser(uData);

          if (uData.role === 'admin' || uData.role === 'teacher') {
            setCheckingLimit(false);
            return;
          }

          const hasVip = uData.vipExpiry && new Date(uData.vipExpiry).getTime() > Date.now();
          if (hasVip) {
            setCheckingLimit(false);
            return;
          }

          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          const startOfMonthISO = startOfMonth.toISOString();

          const subQ = query(
            collection(db, 'submissions'),
            where('studentId', '==', uid),
            where('submittedAt', '>=', startOfMonthISO)
          );
          const subSnap = await getDocs(subQ);
          if (subSnap.size >= 10) {
            setCheckLimitError("Tài khoản Miễn phí của bạn đã đạt giới hạn làm 10 đề thi/tháng. Hãy nâng cấp lên VIP để luyện đề không giới hạn!");
          }
        }
      } catch (err) {
        console.error("Error checking student monthly limit:", err);
      } finally {
        setCheckingLimit(false);
      }
    };

    if (auth.currentUser?.uid) {
      checkSubLimit(auth.currentUser.uid);
    } else {
      unsubAuth = auth.onAuthStateChanged((user) => {
        if (user?.uid) {
          checkSubLimit(user.uid);
        } else {
          setCheckingLimit(false);
        }
      });
    }

    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, [id]);

  useEffect(() => {
    if (!result || !exam) return;
    
    const fetchRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        const examsCol = collection(db, 'exams');
        // Let's query exams for the same grade (khối)
        const q = query(examsCol, where('grade', '==', exam.grade));
        const querySnapshot = await getDocs(q);
        const list: any[] = [];
        querySnapshot.forEach(docSnap => {
          if (docSnap.id !== id) {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              ...data
            });
          }
        });

        // Calculate relevance/similarity score
        // Same category: +10 pts
        // Same difficulty: +5 pts
        const scored = list.map(item => {
          let score = 0;
          if (item.category === exam.category) {
            score += 10;
          }
          if ((item.difficulty || 'Trung bình') === (exam.difficulty || 'Trung bình')) {
            score += 5;
          }
          return { ...item, similarityScore: score };
        });

        // Sort by score descending
        scored.sort((a, b) => b.similarityScore - a.similarityScore);

        // Take top 3 recommendations
        setRecommendedExams(scored.slice(0, 3));
      } catch (err) {
        console.error("Lỗi khi tải đề xuất học tập:", err);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [result, exam, id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleVisibilityChange = () => {
      if (document.hidden && !result) {
        setWarnings(w => w + 1);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [result]);

  useEffect(() => {
    if (exam && !result && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && exam && !result) {
      setShowConfirmSubmit(false);
      handleSubmit();
    }
  }, [timeLeft, exam, result]);

  useEffect(() => {
    if (timeLeft > 0 && timeLeft <= 300 && !timeWarningDismissed && !result && !showTimeWarning) {
      setShowTimeWarning(true);
    }
  }, [timeLeft, timeWarningDismissed, result, showTimeWarning]);

  const enterFullscreen = () => {
    if (workspaceRef.current && typeof workspaceRef.current.requestFullscreen === 'function') {
      workspaceRef.current.requestFullscreen()
        .then(() => {
          setFullscreenBypassed(false);
        })
        .catch(err => {
          console.error("Error attempting to enable fullscreen:", err);
          // If fullscreen request is blocked or fails, allow students to proceed anyway so they aren't blocked on mobile/Wefire/iframes
          setFullscreenBypassed(true);
        });
    } else {
      console.warn("Fullscreen API is not supported on this device/browser.");
      // Bypassed automatically if not supported
      setFullscreenBypassed(true);
    }
  };

  const handleOptionSelect = (optionIdx: number) => {
    if (result) return; // Prevent edits after submission
    const currentQ = exam.questions[currentIndex];
    setAnswers(prev => ({ ...prev, [currentQ.id]: optionIdx }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!auth.currentUser || !id) throw new Error("Not authenticated");
      
      const userStr = localStorage.getItem('hmath_user');
      const user = userStr ? JSON.parse(userStr) : { name: auth.currentUser.displayName || "Online Student" };
      
      let definedPointsTotal = 0;
      let undefinedCount = 0;
      exam.questions.forEach((q: any) => {
        if (q.points !== undefined && q.points !== null) {
          definedPointsTotal += q.points;
        } else {
          undefinedCount++;
        }
      });
      const examTotal = exam.totalScore || 10;
      let defaultPoints = 0;
      if (undefinedCount > 0) {
        defaultPoints = Math.max(0, (examTotal - definedPointsTotal) / undefinedCount);
      }
      
      let correctCount = 0;
      let scoreEarned = 0;
      
      const results = exam.questions.map((q: any) => {
        const studentAnswer = answers[q.id];
        const isCorrect = studentAnswer === q.correctAnswer;
        const qPoints = q.points !== undefined && q.points !== null ? q.points : defaultPoints;
        
        if (isCorrect) {
          correctCount++;
          scoreEarned += qPoints;
        }
        
        return {
          questionId: q.id,
          isCorrect,
          correctAnswer: q.correctAnswer,
          studentAnswer: studentAnswer !== undefined ? studentAnswer : -1,
          pointsEarned: isCorrect ? qPoints : 0,
          pointsPossible: qPoints,
          content: q.content,
          imageUrl: q.imageUrl || '',
          options: q.options || [],
          explanation: q.explanation // Include explanation optionally
        };
      });

      const submission = {
        examId: id,
        examOwnerId: exam.ownerId,
        studentName: user.name,
        score: correctCount, // raw number correct
        scoreEarned: scoreEarned,
        total: exam.questions.length,
        examTotalScore: examTotal,
        timeSpent: exam.timeLimit ? Math.max(0, exam.timeLimit - timeLeft) : 0,
        showResultAfter: exam.config?.showResultAfter !== false,
        results,
        submittedAt: new Date().toISOString(),
        studentId: auth.currentUser.uid
      };
      
      const subId = "sub_" + generateId();
      await setDoc(doc(db, 'submissions', subId), cleanUndefined(submission));
      
      // Submit successful! Exit fullscreen now
      try {
        if (typeof document !== 'undefined' && document.fullscreenElement && typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen().catch(err => console.warn("Exit fullscreen failed:", err));
        }
      } catch (err) {
        console.warn("Fullscreen exit error:", err);
      }

      setResult(submission);
    } catch (e: any) {
      console.error(e);
      let errMsg = e instanceof Error ? e.message : String(e);
      // Clean JSON error message if thrown from handleFirestoreError
      if (typeof errMsg === 'string' && errMsg.startsWith('{')) {
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed && typeof parsed === 'object' && parsed.error) {
            errMsg = parsed.error;
          }
        } catch (_) {}
      }
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingLimit) {
    return <div className="py-20 text-center text-slate-500 animate-pulse">Đang đối soát quyền hạn thành viên...</div>;
  }

  if (checkLimitError) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center px-4 animate-in fade-in duration-300">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6 border border-amber-100 animate-bounce">
            <Lock className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">Đạt giới hạn lượt thi!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm">
            Tài khoản Thường của bạn đã thi tối đa 10 đề trong tháng này.
            Vui lòng nâng cấp gói thành viên VIP để tiếp tục làm đề thi không giới hạn và mở khóa đầy đủ lời giải chi tiết.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => navigate('/profile')}
              className="bg-indigo-600 text-white font-extrabold text-sm py-4 rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-102 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 fill-white" />
              Nâng cấp lên VIP ngay
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 rounded-xl transition-all cursor-pointer"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return <div className="py-20 text-center text-slate-500 animate-pulse font-medium">Đang tải đề thi...</div>;
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (result) {
    let finalScoreNum = result.scoreEarned !== undefined ? result.scoreEarned : ((result.score / result.total) * result.examTotalScore);
    const isGood = (finalScoreNum / (result.examTotalScore || 10)) >= 0.8;
    const finalScore = finalScoreNum.toFixed(2).replace(/\.?0*$/, '');
    
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 mt-20">
        <div className="text-center py-12 px-6 bg-white rounded-3xl shadow-sm border border-slate-100 relative">
           {warnings > 0 && exam.config?.antiCheat && (
             <div className="absolute top-0 right-0 m-4 bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-sm font-medium border border-orange-200">
               ⚠️ Hệ thống ghi nhận {warnings} lần thoát trang trong lúc thi.
             </div>
           )}
           <h2 className="text-3xl font-bold text-slate-800 mb-6">Hoàn thành bài thi!</h2>
           
           {!result.showResultAfter ? (
             <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-8 max-w-sm mx-auto">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-sm">
                  <CheckCircle2 className="w-8 h-8"/>
                </div>
                <div className="font-semibold text-slate-700 mb-2">Đã nộp bài an toàn</div>
                <div className="text-sm text-slate-500">Giáo viên đã cấu hình ẩn điểm sau khi nộp (Azota Mode). Chờ giáo viên công bố kết quả nhé!</div>
             </div>
           ) : (
             <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-5xl font-bold mb-6 shadow-sm border-8 ${isGood ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
               {finalScore}<span className="text-2xl text-slate-400 mx-1">/</span><span className="text-2xl text-slate-500">{result.examTotalScore}</span>
             </div>
           )}
           
           <div className="flex justify-center gap-3">
             <button 
               onClick={() => navigate('/')}
               className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-8 py-3 rounded-xl font-medium transition-colors"
             >
               Về trang chủ
             </button>
             {result.showResultAfter && (
               <button 
                 onClick={() => {
                   const isVipUser = currentUser?.vipExpiry && new Date(currentUser.vipExpiry).getTime() > Date.now();
                   const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'teacher';
                   if (isVipUser || isStaff) {
                     setShowDetailedResult(true);
                   } else {
                     window.alert('Tính năng xem đáp án chi tiết chỉ dành cho tài khoản VIP. Bạn sẽ được chuyển đến trang nâng cấp.');
                     navigate('/profile');
                   }
                 }}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-sm"
               >
                 Xem đáp án chi tiết
               </button>
             )}
           </div>
        </div>

        {recommendedExams && (
         <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 text-left">
           <div>
             <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
               <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
               Đề xuất ôn tập tiếp theo
             </h3>
           </div>

           {loadingRecommendations ? (
             <div className="flex items-center justify-center py-8 gap-2.5 text-slate-500 text-sm font-medium">
               <div className="w-5 h-5 rounded-full border-2 border-slate-350 border-t-indigo-600 animate-spin"></div>
               Đang tìm kiếm đề thi phù hợp...
             </div>
           ) : recommendedExams.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {recommendedExams.map((recExam) => {
                 const matchCat = recExam.category === exam.category;
                 const matchDiff = (recExam.difficulty || 'Trung bình') === (exam.difficulty || 'Trung bình');
                 return (
                   <div 
                     key={recExam.id} 
                     className="group relative bg-slate-50 hover:bg-indigo-55/60 border border-slate-100 hover:border-indigo-150 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-md cursor-pointer"
                     onClick={() => {
                        navigate(`/exam/${recExam.id}`);
                     }}
                   >
                     <div>
                       <div className="flex flex-wrap gap-1 mb-2.5">
                         {matchCat && (
                           <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                             Cùng Chuyên Đề
                           </span>
                         )}
                         {matchDiff && (
                           <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                             Cùng Mức Độ
                           </span>
                         )}
                       </div>
                       <h4 className="font-bold text-slate-800 text-xs md:text-sm line-clamp-2 leading-snug group-hover:text-indigo-950 transition-colors mb-2">
                         {recExam.title}
                       </h4>
                       <p className="text-[11px] text-slate-500 mb-4 flex items-center gap-1 font-medium">
                         <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                         {recExam.grade === 5 ? 'Thi vào lớp 6' : `Lớp ${recExam.grade}`} • {recExam.questions?.length || 0} câu
                       </p>
                     </div>
                     <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700 pt-2.5 border-t border-slate-200/50 mt-auto">
                       <span>Bắt đầu thi</span>
                       <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                     </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
               Chưa có đề thi liên quan trực tiếp khác trong cùng lớp này. Hãy quay lại trang chủ để tìm kiếm nhé!
             </div>
           )}
         </div>
        )}

        {showDetailedResult && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-800">Chi tiết bài làm</h3>
                  <button onClick={() => setShowDetailedResult(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
                     <span className="sr-only">Đóng</span>✕
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
                  {result.results.map((r: any, idx: number) => (
                     <div key={idx} className={`p-5 rounded-2xl border ${r.isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                        <div className="flex items-start justify-between mb-3">
                           <span className="font-bold text-slate-700">Câu {idx + 1}</span>
                           <span className={`text-sm font-bold ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {r.isCorrect ? 'Đúng' : 'Sai'}
                           </span>
                        </div>
                        {r.content && (
                           <div className="text-sm font-medium text-slate-800 mb-4 bg-white p-4 rounded-xl border border-slate-100">
                              <LatexRenderer content={r.content} />
                              {r.imageUrl && (
                                 <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-2 inline-block">
                                    <img src={r.imageUrl} alt={`Hình ảnh Câu ${idx + 1}`} className="max-h-36 rounded-lg object-contain" referrerPolicy="no-referrer" />
                                 </div>
                              )}
                           </div>
                        )}

                        {(() => {
                           const options = r.options || exam.questions.find((q: any) => q.id === r.questionId)?.options || [];
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

                        <div className="space-y-2 text-sm">
                           <div className="flex gap-2">
                              <span className="text-slate-500 shrink-0">Đã chọn:</span>
                              <span className={`font-semibold ${r.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                 {r.studentAnswer >= 0 ? `Đáp án ${String.fromCharCode(65 + r.studentAnswer)}` : 'Chưa chọn'}
                              </span>
                           </div>
                           {!r.isCorrect && (
                              <div className="flex gap-2">
                                 <span className="text-slate-500 shrink-0">Đáp án đúng:</span>
                                 <span className="font-semibold text-emerald-700">Đáp án {String.fromCharCode(65 + r.correctAnswer)}</span>
                              </div>
                           )}
                           <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200/50">
                              <span className="text-slate-500">Điểm:</span>
                              <span className="font-semibold text-slate-700">{r.pointsEarned} / {r.pointsPossible}</span>
                           </div>
                        </div>
                        {r.explanation && (
                           <div className="mt-5 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                              <div className="font-bold text-blue-800 text-sm mb-2">Lời giải chi tiết:</div>
                              <div className="text-sm text-blue-900 leading-relaxed font-medium">
                                 <LatexRenderer content={r.explanation} />
                              </div>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
             </div>
           </div>
        )}
      </div>
    );
  }

  if (!isFullscreen && !fullscreenBypassed && exam.config?.antiCheat) {
     return (
        <div ref={workspaceRef} className="max-w-xl mx-auto py-20 text-center animate-in zoom-in duration-300">
           <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Maximize className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Môi trường thi an toàn</h2>
              <p className="text-slate-500 mb-8">
                Bạn cần vào chế độ toàn màn hình để bắt đầu tính giờ thi. Hệ thống sẽ ghi nhận lịch sử thoát trang nếu bạn gian lận.
              </p>
              <button 
                 onClick={enterFullscreen}
                 className="bg-indigo-600 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all w-full"
              >
                 Bật toàn màn hình và Bắt đầu thi
              </button>
           </div>
        </div>
     );
  }

  const currentQ = exam.questions[currentIndex];

  return (
    <div ref={workspaceRef} className="flex flex-col lg:flex-row gap-6 h-[100dvh] w-full bg-slate-50 p-4 animate-in fade-in duration-300">
      {/* Submit Error Popup */}
      {submitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-5 border border-red-100">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Lỗi nộp bài thi!</h3>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              Môi trường làm bài thi mất kết nối hoặc phiên đăng nhập của bạn bị gián đoạn.
              <br />
              <span className="text-red-500 font-semibold text-xs bg-red-50 px-3 py-1.5 rounded-lg inline-block mt-3 border border-red-100 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {submitError}
              </span>
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setSubmitError(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setSubmitError(null);
                  handleSubmit();
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
              >
                Thử nộp lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Submit Popup */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 animate-none">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300 border border-slate-100/50">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-5 border border-emerald-100">
              <CheckCircle2 className="w-8 h-8 animate-none" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Xác nhận nộp bài</h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              Bạn có chắc chắn muốn nộp câu trả lời và hoàn thành bài thi?
            </p>
            
            {/* Answer completion status box */}
            <div className="w-full bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-left space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Số câu đã hoàn thành:</span>
                <span className="font-bold text-indigo-600 text-sm">{Object.keys(answers).length} / {exam.questions.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Số câu còn bỏ trống:</span>
                {exam.questions.length - Object.keys(answers).length > 0 ? (
                  <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 text-xs">
                     {exam.questions.length - Object.keys(answers).length} câu chưa làm
                  </span>
                ) : (
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-xs flex items-center gap-1">
                     ✓ Hoàn thành tất cả
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 rounded-xl transition-all text-sm cursor-pointer"
              >
                Làm tiếp
              </button>
              <button
                onClick={() => {
                  setShowConfirmSubmit(false);
                  handleSubmit();
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Warning Popup */}
      {showTimeWarning && !timeWarningDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Sắp hết giờ!</h3>
            <p className="text-slate-600 mb-8 font-medium">Bạn chỉ còn dưới 5 phút. Vui lòng rà soát lại bài làm và chuẩn bị nộp bài.</p>
            <button
              onClick={() => setTimeWarningDismissed(true)}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              Đã hiểu, tiếp tục làm bài
            </button>
          </div>
        </div>
      )}
      
      {/* CỘT NỘI DUNG CÂU HỎI */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 items-center overflow-hidden">
        {/* Header Indicator */}
        <div className="flex flex-col w-full border-b border-slate-100 bg-slate-50/50">
          <div className="px-6 py-4 flex w-full items-center justify-between">
            <span className="font-semibold text-slate-600 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm">
              Câu <span className="text-indigo-600">{(currentIndex + 1).toString().padStart(2, '0')}</span> / {exam.questions.length.toString().padStart(2, '0')}
            </span>
            {warnings > 0 && (
               <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 font-medium px-3 py-1.5 rounded-lg border border-orange-200 animate-pulse">
                 <AlertTriangle className="w-4 h-4"/> Rời trang ({warnings})
               </span>
            )}
            <div className={`flex items-center gap-2 font-mono font-bold text-xl px-4 py-2 rounded-lg bg-white border shadow-sm ${timeLeft < 300 ? 'text-red-500 border-red-200 animate-pulse' : 'text-slate-700 border-slate-200'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          </div>
          {/* Time Progress Bar */}
          <div className="h-1.5 w-full bg-slate-200">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 300 ? 'bg-red-500' : timeLeft < exam.timeLimit * 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.max(0, (timeLeft / (exam.timeLimit || 1)) * 100)}%` }}
            ></div>
          </div>
        </div>
        
        {/* Question Area */}
        <div className="p-6 md:p-10 flex-1 overflow-y-auto w-full max-w-4xl mx-auto">
          <div className="prose prose-slate max-w-none text-xl md:text-2xl font-medium text-slate-900 leading-relaxed mb-10">
            <LatexRenderer content={currentQ.content} />
            {currentQ.imageUrl && (
              <div className="mt-6 flex justify-center bg-slate-50 border border-slate-100 rounded-3xl p-6 overflow-hidden shadow-inner">
                <img src={currentQ.imageUrl} alt="Hình ảnh câu hỏi" className="max-h-[320px] object-contain rounded-xl shadow-md hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {currentQ.options.map((opt: string, idx: number) => {
              const isSelected = answers[currentQ.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full text-left p-5 md:p-6 rounded-2xl border-2 transition-all flex items-center gap-5 group ${isSelected ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 hover:border-indigo-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all shadow-sm ${isSelected ? 'bg-indigo-600 text-white scale-110' : 'bg-white border border-slate-200 text-slate-500 group-hover:border-indigo-300 group-hover:text-indigo-600'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className={`flex-1 text-lg ${isSelected ? 'text-indigo-950 font-medium' : 'text-slate-700'}`}>
                    <LatexRenderer content={opt} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="p-4 border-t border-slate-100 bg-white flex w-full max-w-4xl mx-auto items-center justify-between gap-2">
          <button 
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 rounded-xl text-slate-600 font-medium hover:bg-slate-100 disabled:opacity-30 transition-colors text-sm md:text-base"
          >
            <ChevronLeft className="w-5 h-5"/> <span className="hidden sm:inline">Câu trước</span><span className="sm:hidden">Trước</span>
          </button>
          
          <button
            onClick={() => setShowMobileNav(true)}
            className="lg:hidden flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm border border-indigo-100 transition-colors shadow-sm cursor-pointer"
            title="Mở bảng điều hướng câu hỏi"
          >
            <List className="w-4 h-4" /> Bảng câu hỏi ({currentIndex + 1}/{exam.questions.length})
          </button>
          
          <button 
            onClick={() => setCurrentIndex(i => Math.min(exam.questions.length - 1, i + 1))}
            disabled={currentIndex === exam.questions.length - 1}
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 rounded-xl text-slate-600 font-medium hover:bg-slate-100 disabled:opacity-30 transition-colors text-sm md:text-base"
          >
            <span className="hidden sm:inline">Câu tiếp</span><span className="sm:hidden">Tiếp</span> <ChevronRight className="w-5 h-5"/>
          </button>
        </div>
      </div>

      {/* CỘT DANH SÁCH CÂU HỎI (HIỂN THỊ TRÊN DESKTOP) */}
      <div className="hidden lg:flex w-full lg:w-80 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex-col h-auto lg:h-full shrink-0">
        <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2"><CheckCircle2 className="text-emerald-500 w-5 h-5" /> Bảng điều hướng</h3>
        <div className="grid grid-cols-4 gap-2.5 mb-6 overflow-y-auto pr-2 pb-4">
          {exam.questions.map((q: any, i: number) => {
            const hasAnswered = answers[q.id] !== undefined;
            const isCurrent = i === currentIndex;
            
            let btnClass = "h-11 rounded-lg border-2 transition-all flex items-center justify-center text-sm font-semibold ";
            
            if (isCurrent) {
              btnClass += "border-indigo-600 bg-indigo-600 text-white shadow-md scale-105 ";
            } else if (hasAnswered) {
              btnClass += "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ";
            } else {
              btnClass += "border-slate-100 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 ";
            }

            return (
              <button 
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={btnClass}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
        
        <div className="mt-auto pt-6 border-t border-slate-100 space-y-3">
          <div className="flex bg-slate-50 rounded-xl p-4 gap-4 justify-between border border-slate-100">
             <div className="text-center flex-1 border-r border-slate-200">
               <div className="text-2xl font-bold text-indigo-600">{Object.keys(answers).length}</div>
               <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Đã làm</div>
             </div>
             <div className="text-center flex-1">
               <div className="text-2xl font-bold text-slate-600">{exam.questions.length - Object.keys(answers).length}</div>
               <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Còn lại</div>
             </div>
          </div>
          
          <button 
            onClick={() => setShowConfirmSubmit(true)}
            disabled={isSubmitting}
            className="w-full mt-4 flex justify-center items-center gap-2 bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Đang nộp...' : 'Nộp bài thi ngay'}
          </button>
        </div>
      </div>

      {/* BẢNG ĐIỀU HƯỚNG DI ĐỘNG (NAV DRAWER OVERLAY) */}
      {showMobileNav && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs md:max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" /> Bảng điều hướng
              </h3>
              <button 
                onClick={() => setShowMobileNav(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-2.5 mb-6">
                {exam.questions.map((q: any, i: number) => {
                  const hasAnswered = answers[q.id] !== undefined;
                  const isCurrent = i === currentIndex;
                  
                  let btnClass = "h-11 rounded-lg border-2 transition-all flex items-center justify-center text-sm font-bold ";
                  
                  if (isCurrent) {
                    btnClass += "border-indigo-600 bg-indigo-600 text-white shadow-md ";
                  } else if (hasAnswered) {
                    btnClass += "border-indigo-200 bg-indigo-50 text-indigo-700 ";
                  } else {
                    btnClass += "border-slate-100 bg-white text-slate-500 ";
                  }

                  return (
                    <button 
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(i);
                        setShowMobileNav(false);
                      }}
                      className={btnClass}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex bg-slate-50 rounded-xl p-4 gap-4 justify-between border border-slate-100">
                <div className="text-center flex-1 border-r border-slate-200">
                  <div className="text-xl font-bold text-indigo-600">{Object.keys(answers).length}</div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Đã làm</div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-xl font-bold text-slate-600">{exam.questions.length - Object.keys(answers).length}</div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">Còn lại</div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setShowMobileNav(false);
                  setShowConfirmSubmit(true);
                }}
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Đang nộp...' : 'Nộp bài thi ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVipModalToViewSolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl relative border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowVipModalToViewSolution(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-5 border border-amber-100 animate-pulse">
              <Sparkles className="w-8 h-8 fill-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Đặc quyền Thành viên VIP</h3>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              Bạn đang sử dụng tài khoản Miễn phí, do đó không được phép xem đáp án và giải chi tiết của đề thi. Nhận đặc quyền VIP ngay để đột phá kết quả học tập!
            </p>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => {
                  setShowVipModalToViewSolution(false);
                  navigate('/profile');
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 fill-white animate-pulse" />
                Nâng cấp VIP nhận trọn giải chi tiết
              </button>
              <button
                onClick={() => setShowVipModalToViewSolution(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
