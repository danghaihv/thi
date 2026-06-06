import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Maximize, AlertTriangle, List, X, Sparkles, ArrowRight, GraduationCap, Lock } from 'lucide-react';
import { LatexRenderer } from '../components/LatexRenderer';
import ExamWorkspacePlay from './ExamWorkspacePlay';
import { getDoc, doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { loadRecommendedExams } from '../lib/examWorkspaceRecommendations';
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
        const recommended = await loadRecommendedExams(id || '', exam);
        setRecommendedExams(recommended);
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
              onClick={() => navigate('/upgrade')}
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
                        navigate('/upgrade');
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
                  return (
                    <button
                      key={recExam.id}
                      className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                      onClick={() => navigate(`/exam/${recExam.id}`)}
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">Cùng khối lớp</span>
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
                Chưa tìm thấy đề cùng khối lớp khác để gợi ý.
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

  return (
    <ExamWorkspacePlay
      exam={exam}
      answers={answers}
      currentIndex={currentIndex}
      timeLeft={timeLeft}
      isSubmitting={isSubmitting}
      showConfirmSubmit={showConfirmSubmit}
      submitError={submitError}
      showTimeWarning={showTimeWarning}
      timeWarningDismissed={timeWarningDismissed}
      showMobileNav={showMobileNav}
      fullscreenBypassed={fullscreenBypassed}
      isFullscreen={isFullscreen}
      showVipModalToViewSolution={showVipModalToViewSolution}
      warnings={warnings}
      navigate={navigate}
      handleOptionSelect={handleOptionSelect}
      enterFullscreen={enterFullscreen}
      handleSubmit={handleSubmit}
      setSubmitError={setSubmitError}
      setShowConfirmSubmit={setShowConfirmSubmit}
      setTimeWarningDismissed={setTimeWarningDismissed}
      setShowMobileNav={setShowMobileNav}
      setCurrentIndex={setCurrentIndex}
      setShowVipModalToViewSolution={setShowVipModalToViewSolution}
    />
  );
}
