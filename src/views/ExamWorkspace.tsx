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

      const cacheKey = `hmath_monthly_exam_count_${auth.currentUser.uid}`;
      const nextCount = Number(localStorage.getItem(cacheKey) || '0') + 1;
      localStorage.setItem(cacheKey, String(nextCount));
      window.dispatchEvent(new CustomEvent('hmath:submission-updated', { detail: { studentId: auth.currentUser.uid, monthlyExamCount: nextCount } }));
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
    return <div className="py-20 text-center text-slate-500 animate-pulse">Đang kiểm tra quyền truy cập...</div>;
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
            Tính năng này chỉ dành cho tài khoản VIP. Hãy nâng cấp để xem đáp án và lời giải chi tiết.
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
    const finalScoreNum = result.scoreEarned !== undefined ? result.scoreEarned : (result.score / result.total) * result.examTotalScore;
    const isGood = (finalScoreNum / (result.examTotalScore || 10)) >= 0.8;
    const finalScore = finalScoreNum.toFixed(2).replace(/\.?0*$/, '');

    return (
      <div className="mx-auto w-full max-w-5xl space-y-8 animate-in fade-in zoom-in-95 duration-500 px-4 py-6 lg:py-10">
        <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
          {warnings > 0 && exam.config?.antiCheat && (
            <div className="absolute right-6 top-6 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              {warnings} lần rời trang
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành
              </div>
              <h2 className="section-title mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">Kết quả bài thi</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {result.showResultAfter ? 'Bạn có thể xem điểm tổng quan ngay bên dưới và mở chi tiết bài làm nếu có quyền.' : 'Bài thi đã được nộp an toàn. Kết quả đang được ẩn theo cấu hình của giáo viên.'}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
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
                    className="rounded-2xl border border-indigo-200 bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700"
                  >
                    Xem đáp án chi tiết
                  </button>
                )}
              </div>
            </div>

            <div className={`rounded-[2rem] border p-6 shadow-sm ${isGood ? 'border-emerald-100 bg-emerald-50/70' : 'border-indigo-100 bg-indigo-50/70'}`}>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Điểm số</div>
              <div className="mt-3 flex items-end gap-2">
                <div className="text-5xl font-black tracking-tight text-slate-950">{finalScore}</div>
                <div className="pb-1 text-2xl font-semibold text-slate-400">/{result.examTotalScore}</div>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-600">
                {isGood ? 'Kết quả rất tốt. Tiếp tục giữ nhịp luyện tập để nâng độ ổn định.' : 'Chưa đạt ngưỡng cao, nhưng đã có dữ liệu đủ để xem lại từng câu sai và cải thiện.'}
              </p>
              {!result.showResultAfter ? (
                <div className="mt-5 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600">
                  Giáo viên đang ẩn điểm sau khi nộp bài.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {recommendedExams && (
          <div className="glass-panel space-y-6 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950 md:text-xl">Đề xuất ôn tập tiếp theo</h3>
                <p className="mt-1 text-sm text-slate-500">Các đề cùng khối được ưu tiên theo chuyên đề và độ khó.</p>
              </div>
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>

            {loadingRecommendations ? (
              <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-sm font-medium text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                Đang tìm đề phù hợp...
              </div>
            ) : recommendedExams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {recommendedExams.map((recExam) => {
                  const matchCat = recExam.category === exam.category;
                  const matchDiff = (recExam.difficulty || 'Trung bình') === (exam.difficulty || 'Trung bình');
                  return (
                    <button
                      key={recExam.id}
                      className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                      onClick={() => navigate(`/exam/${recExam.id}`)}
                    >
                      <div className="flex flex-wrap gap-2">
                        {matchCat && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">Cùng chuyên đề</span>}
                        {matchDiff && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Cùng mức độ</span>}
                      </div>
                      <h4 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-indigo-700">
                        {recExam.title}
                      </h4>
                      <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {recExam.grade === 5 ? 'Thi vào lớp 6' : `Lớp ${recExam.grade}`} • {recExam.questions?.length || 0} câu
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-indigo-600">
                        <span>Bắt đầu thi</span>
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chưa có đề thi liên quan trực tiếp khác trong cùng lớp này.
              </div>
            )}
          </div>
        )}

        {showDetailedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Chi tiết bài làm</h3>
                  <p className="mt-1 text-sm text-slate-500">Từng câu hỏi, đáp án và lời giải của bài thi.</p>
                </div>
                <button onClick={() => setShowDetailedResult(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  <span className="sr-only">Đóng</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-6 text-left">
                {result.results.map((r: any, idx: number) => (
                  <div key={idx} className={`rounded-[1.5rem] border p-5 ${r.isCorrect ? 'border-emerald-100 bg-emerald-50/60' : 'border-rose-100 bg-rose-50/60'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-slate-700">Câu {idx + 1}</span>
                      <span className={`text-sm font-bold ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>{r.isCorrect ? 'Đúng' : 'Sai'}</span>
                    </div>
                    {r.content && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800">
                        <LatexRenderer content={r.content} />
                        {r.imageUrl && (
                          <div className="mt-3 inline-block rounded-xl border border-slate-100 bg-slate-50 p-2">
                            <img src={r.imageUrl} alt={`Hình ảnh Câu ${idx + 1}`} className="max-h-36 rounded-lg object-contain" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    )}

                    {(() => {
                      const options = r.options || exam.questions.find((q: any) => q.id === r.questionId)?.options || [];
                      if (!options || options.length === 0) return null;
                      return (
                        <div className="mt-4 space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Các phương án</div>
                          {options.map((opt: string, optIdx: number) => {
                            const isSelected = r.studentAnswer === optIdx;
                            const isCorrectOption = r.correctAnswer === optIdx;
                            return (
                              <div key={optIdx} className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${isCorrectOption ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : isSelected ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-slate-200 bg-white text-slate-700'}`}>
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${isCorrectOption ? 'border-emerald-600 bg-emerald-600 text-white' : isSelected ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </div>
                                <div className="flex-1"><LatexRenderer content={opt} /></div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <div className="rounded-xl bg-white px-3 py-2 font-medium text-slate-600">
                        Đã chọn: <span className={`font-semibold ${r.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{r.studentAnswer >= 0 ? `Đáp án ${String.fromCharCode(65 + r.studentAnswer)}` : 'Chưa chọn'}</span>
                      </div>
                      {!r.isCorrect && (
                        <div className="rounded-xl bg-white px-3 py-2 font-medium text-slate-600">
                          Đáp án đúng: <span className="font-semibold text-emerald-700">Đáp án {String.fromCharCode(65 + r.correctAnswer)}</span>
                        </div>
                      )}
                      <div className="rounded-xl bg-white px-3 py-2 font-medium text-slate-600">
                        Điểm: <span className="font-semibold text-slate-800">{r.pointsEarned} / {r.pointsPossible}</span>
                      </div>
                    </div>

                    {r.explanation && (
                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                        <div className="mb-2 text-sm font-bold text-blue-800">Lời giải chi tiết</div>
                        <div className="text-sm leading-relaxed text-blue-950">
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
      <div ref={workspaceRef} className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl items-center px-4 py-8 animate-in fade-in duration-300">
        <div className="glass-panel relative w-full overflow-hidden rounded-[2rem] p-6 shadow-sm md:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
            <Maximize className="h-10 w-10" />
          </div>
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Lock className="h-3.5 w-3.5 text-indigo-600" /> Môi trường an toàn
            </div>
            <h2 className="section-title mt-4 text-3xl font-extrabold tracking-tight text-slate-950">Bật toàn màn hình để bắt đầu</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Chế độ thi sẽ ghi nhận hành vi rời trang nếu bài làm có chống gian lận được bật.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              onClick={enterFullscreen}
              className="rounded-2xl bg-slate-950 px-6 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Bật toàn màn hình
            </button>
            <button
              onClick={() => setFullscreenBypassed(true)}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Làm tiếp trên cửa sổ hiện tại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = exam.questions[currentIndex];

  return (
    <div ref={workspaceRef} className="min-h-[100dvh] w-full bg-transparent px-3 py-3 sm:px-4 lg:px-6 lg:py-6 animate-in fade-in duration-300">
      {submitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-rose-100 bg-rose-50 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Không thể nộp bài</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Phiên làm bài đang gặp gián đoạn. Bạn có thể thử nộp lại hoặc đóng thông báo để kiểm tra trạng thái hiện tại.
            </p>
            <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-medium text-rose-700">
              {submitError}
            </div>
            <div className="mt-6 flex w-full gap-3">
              <button onClick={() => setSubmitError(null)} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Đóng</button>
              <button onClick={() => { setSubmitError(null); handleSubmit(); }} className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">Thử lại</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-emerald-100 bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Xác nhận nộp bài</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Hãy kiểm tra nhanh số câu đã làm trước khi hoàn tất.</p>
            <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Đã làm</span>
                <span className="font-bold text-indigo-600">{Object.keys(answers).length} / {exam.questions.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Còn trống</span>
                <span className="font-bold text-slate-700">{exam.questions.length - Object.keys(answers).length} câu</span>
              </div>
            </div>
            <div className="mt-6 flex w-full gap-3">
              <button onClick={() => setShowConfirmSubmit(false)} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Làm tiếp</button>
              <button onClick={() => { setShowConfirmSubmit(false); handleSubmit(); }} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">Nộp ngay</button>
            </div>
          </div>
        </div>
      )}

      {showTimeWarning && !timeWarningDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel flex w-full max-w-sm flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-rose-100 bg-rose-50 text-rose-600">
              <Clock className="h-10 w-10 animate-pulse" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-950">Sắp hết giờ</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Bạn chỉ còn dưới 5 phút. Hãy rà soát lại bài làm và chuẩn bị nộp.</p>
            <button onClick={() => setTimeWarningDismissed(true)} className="mt-6 w-full rounded-2xl bg-rose-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-rose-700">Đã hiểu, tiếp tục</button>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                Câu <span className="text-indigo-600">{(currentIndex + 1).toString().padStart(2, '0')}</span> / {exam.questions.length.toString().padStart(2, '0')}
              </span>
              <div className="flex items-center gap-3">
                {warnings > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> Rời trang ({warnings})
                  </span>
                )}
                <div className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-lg font-bold shadow-sm ${timeLeft < 300 ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-800'}`}>
                  <Clock className="h-5 w-5" /> {formatTime(timeLeft)}
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 300 ? 'bg-rose-500' : timeLeft < exam.timeLimit * 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(0, (timeLeft / (exam.timeLimit || 1)) * 100)}%` }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-4xl">
              <div className="prose prose-slate max-w-none text-lg font-medium leading-relaxed text-slate-900 md:text-xl">
                <LatexRenderer content={currentQ.content} />
                {currentQ.imageUrl && (
                  <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <img src={currentQ.imageUrl} alt="Hình ảnh câu hỏi" className="mx-auto max-h-[320px] object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-3">
                {currentQ.options.map((opt: string, idx: number) => {
                  const isSelected = answers[currentQ.id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      className={`group flex w-full items-center gap-4 rounded-[1.5rem] border-2 p-4 text-left transition hover:-translate-y-0.5 ${isSelected ? 'border-indigo-500 bg-indigo-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-black transition ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-500 group-hover:border-indigo-300 group-hover:text-indigo-600'}`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className={`flex-1 text-base md:text-lg ${isSelected ? 'font-semibold text-indigo-950' : 'text-slate-700'}`}>
                        <LatexRenderer content={opt} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
              <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Câu trước</span><span className="sm:hidden">Trước</span>
              </button>
              <button onClick={() => setShowMobileNav(true)} className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 lg:hidden">
                <List className="h-4 w-4" /> Bảng câu hỏi
              </button>
              <button onClick={() => setCurrentIndex(i => Math.min(exam.questions.length - 1, i + 1))} disabled={currentIndex === exam.questions.length - 1} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-30">
                <span className="hidden sm:inline">Câu tiếp</span><span className="sm:hidden">Tiếp</span> <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden w-full shrink-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:flex lg:w-80 lg:flex-col">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Bảng điều hướng</div>
          <div className="mt-5 grid grid-cols-4 gap-2.5">
            {exam.questions.map((q: any, i: number) => {
              const hasAnswered = answers[q.id] !== undefined;
              const isCurrent = i === currentIndex;
              return (
                <button key={q.id} onClick={() => setCurrentIndex(i)} className={`flex h-11 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${isCurrent ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : hasAnswered ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1 border-r border-slate-200 pr-3">
                <div className="text-2xl font-black text-indigo-600">{Object.keys(answers).length}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Đã làm</div>
              </div>
              <div className="text-center flex-1 pl-3">
                <div className="text-2xl font-black text-slate-700">{exam.questions.length - Object.keys(answers).length}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Còn lại</div>
              </div>
            </div>
            <button onClick={() => setShowConfirmSubmit(true)} disabled={isSubmitting} className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
              {isSubmitting ? 'Đang nộp...' : 'Nộp bài thi ngay'}
            </button>
          </div>
        </div>

        {showMobileNav && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileNav(false)}>
            <div className="ml-auto flex h-full w-full max-w-sm flex-col rounded-l-[2rem] border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><List className="h-5 w-5 text-indigo-500" /> Bảng câu hỏi</div>
                <button onClick={() => setShowMobileNav(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2.5 overflow-y-auto">
                {exam.questions.map((q: any, i: number) => {
                  const hasAnswered = answers[q.id] !== undefined;
                  const isCurrent = i === currentIndex;
                  return (
                    <button key={q.id} onClick={() => { setCurrentIndex(i); setShowMobileNav(false); }} className={`flex h-11 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${isCurrent ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : hasAnswered ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto border-t border-slate-200 pt-5">
                <button onClick={() => { setShowMobileNav(false); setShowConfirmSubmit(true); }} disabled={isSubmitting} className="w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                  {isSubmitting ? 'Đang nộp...' : 'Nộp bài thi ngay'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showVipModalToViewSolution && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel relative flex w-full max-w-md flex-col items-center rounded-[2rem] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowVipModalToViewSolution(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-amber-100 bg-amber-50 text-amber-600">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-950">Đặc quyền Thành viên VIP</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Tài khoản miễn phí không thể mở đáp án chi tiết. Nâng cấp để xem toàn bộ lời giải.</p>
              <div className="mt-6 flex w-full flex-col gap-2">
                <button onClick={() => { setShowVipModalToViewSolution(false); navigate('/profile'); }} className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">
                  Nâng cấp VIP nhận trọn giải chi tiết
                </button>
                <button onClick={() => setShowVipModalToViewSolution(false)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
