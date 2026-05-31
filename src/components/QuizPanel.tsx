import { useState, useEffect } from 'react';
import { Question, QuizState } from '../types';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, List, X } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';

interface Props {
  questions: Question[];
}

export function QuizPanel({ questions }: Props) {
  const [state, setState] = useState<QuizState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(questions.length * 60); // 1 minute per question default
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    if (state === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (state === 'playing' && timeLeft === 0) {
      handleFinish();
    }
  }, [state, timeLeft]);

  const handleStart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft(questions.length * 60);
    setState('playing');
  };

  const handleOptionSelect = (optionIdx: number) => {
    if (state !== 'playing') return;
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: optionIdx }));
  };

  const handleFinish = () => {
    setState('finished');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-medium text-slate-700">Ngân hàng câu hỏi trống</h2>
        <p className="text-slate-500 mt-2">Vui lòng quay lại Trình quản lý để thêm đề thi.</p>
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-white rounded-2xl shadow-sm border border-slate-100 animate-in zoom-in-95 duration-300">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Sẵn sàng thi!</h2>
        <p className="text-slate-500 mb-8">
          Đề thi môn Toán gồm <span className="font-semibold text-indigo-600">{questions.length} câu hỏi</span>.<br/>
          Thời gian làm bài: <span className="font-semibold text-indigo-600">{Math.floor((questions.length * 60)/60)} phút</span>.
        </p>
        <button 
          onClick={handleStart}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-xl font-semibold shadow-sm transition-all"
        >
          Bắt đầu tính giờ thi
        </button>
      </div>
    );
  }

  if (state === 'finished') {
    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) score++;
    });

    const isGood = score / questions.length >= 0.8;
    const isPass = score / questions.length >= 0.5;

    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="text-center py-12 px-6 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border-4 ${isGood ? 'bg-emerald-100 border-emerald-50 text-emerald-600' : isPass ? 'bg-indigo-100 border-indigo-50 text-indigo-600' : 'bg-red-100 border-red-50 text-red-500'}`}>
            <span>{score}</span>
            <span className="text-xl mx-1 text-slate-400">/</span>
            <span className="text-xl text-slate-500">{questions.length}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Hoàn thành bài thi!</h2>
          <p className="text-slate-500 mb-6">Bạn đã xem và chọn đáp án kết thúc bài làm.</p>
          <button 
            onClick={() => setState('idle')}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Thi lại từ đầu
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-4">Chi tiết đáp án</h3>
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const selected = answers[q.id];
              const isCorrect = selected === q.correctAnswer;
              const hasAnswered = selected !== undefined;
              
              return (
                <div key={q.id} className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-start mb-3 gap-3">
                    <span className={`flex-shrink-0 mt-0.5 px-2 py-1 rounded text-xs font-semibold ${hasAnswered ? (isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700') : 'bg-slate-200 text-slate-600'}`}>
                      Câu {idx + 1}
                    </span>
                    <div className="font-medium text-slate-800 flex-1">
                      <LatexRenderer content={q.content} />
                      {q.imageUrl && (
                        <div className="mt-3 bg-white border border-slate-200/60 rounded-xl p-2 inline-block max-w-full">
                          <img src={q.imageUrl} alt={`Hình ảnh Câu ${idx + 1}`} className="max-h-40 rounded-lg object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-[3.25rem] grid gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selected === oIdx;
                      const isActuallyCorrect = q.correctAnswer === oIdx;
                      
                      let styleClass = "border-slate-200 bg-white text-slate-600";
                      if (isActuallyCorrect) styleClass = "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium";
                      else if (isSelected && !isCorrect) styleClass = "border-red-300 bg-red-50 text-red-800";

                      return (
                         <div key={oIdx} className={`text-sm py-2 px-3 rounded-lg border ${styleClass} flex items-baseline gap-2`}>
                           <span className="font-semibold">{String.fromCharCode(65 + oIdx)}.</span>
                           <div className="flex-1"><LatexRenderer content={opt} /></div>
                         </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    );
  }

  // PLAYING STATE
  const currentQ = questions[currentIndex];
  
  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300 h-[calc(100vh-120px)] min-h-[600px]">
      
      {/* CỘT NỘI DUNG CÂU HỎI */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
        {/* Header Indicator */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="font-medium text-slate-500">Câu <span className="text-indigo-600 font-bold">{currentIndex + 1}</span> / {questions.length}</span>
          <div className={`flex items-center gap-2 font-mono font-medium ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
        
        {/* Question Area */}
        <div className="p-6 md:p-10 flex-1 overflow-y-auto">
          <div className="text-xl md:text-2xl font-medium text-slate-900 leading-relaxed mb-8">
            <LatexRenderer content={currentQ.content} />
            {currentQ.imageUrl && (
              <div className="mt-4 flex justify-center bg-slate-50 border border-slate-100 rounded-2xl p-4 overflow-hidden shadow-inner">
                <img src={currentQ.imageUrl} alt="Hình ảnh câu hỏi" className="max-h-[300px] object-contain rounded-lg shadow-sm hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {currentQ.options.map((opt, idx) => {
              const isSelected = answers[currentQ.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all flex items-center gap-4 group ${isSelected ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-indigo-300 bg-white hover:bg-slate-50'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className={`flex-1 ${isSelected ? 'text-indigo-950 font-medium' : 'text-slate-700'}`}>
                    <LatexRenderer content={opt} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-1.5 md:gap-4">
          <button 
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-all text-sm"
          >
            <ChevronLeft className="w-5 h-5"/> Trước
          </button>
          
          <button
            onClick={() => setShowMobileNav(true)}
            className="lg:hidden flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs sm:text-sm border border-indigo-100 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            title="Mở bảng điều hướng"
          >
            <List className="w-4 h-4" /> Bảng câu hỏi ({currentIndex + 1}/{questions.length})
          </button>
          
          {currentIndex === questions.length - 1 ? (
             <button 
               onClick={handleFinish}
               className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-white font-medium bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm text-sm"
             >
               Nộp bài <CheckCircle2 className="w-5 h-5"/>
             </button>
          ) : (
            <button 
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-indigo-600 font-medium hover:bg-indigo-50 transition-all text-sm"
            >
              Tiếp <ChevronRight className="w-5 h-5"/>
            </button>
          )}
        </div>
      </div>

      {/* CỘT DANH SÁCH CÂU HỎI (HIỂN THỊ TRÊN DESKTOP) */}
      <div className="hidden lg:flex w-full lg:w-72 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex-col h-auto lg:h-full shrink-0">
        <h3 className="font-medium text-slate-800 mb-4 border-b border-slate-100 pb-3">Phễu câu hỏi</h3>
        <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 mb-6">
          {questions.map((q, i) => {
            const hasAnswered = answers[q.id] !== undefined;
            const isCurrent = i === currentIndex;
            
            let btnClass = "h-10 rounded border-2 transition-all flex items-center justify-center text-sm font-medium ";
            
            if (isCurrent) {
              btnClass += "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ";
            } else if (hasAnswered) {
              btnClass += "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ";
            } else {
              btnClass += "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-300 ";
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
        
        <div className="mt-auto pt-4 border-t border-slate-100 grid gap-2">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-50"></div>
            <span>Đã làm ({Object.keys(answers).length})</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="w-4 h-4 rounded border-2 border-slate-100 bg-slate-50"></div>
            <span>Chưa làm ({questions.length - Object.keys(answers).length})</span>
          </div>
          <button 
            onClick={handleFinish}
            className="w-full mt-4 flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg text-red-600 font-medium border border-red-100 hover:bg-red-50 transition-all font-sm"
          >
            Nộp bài sớm
          </button>
        </div>
      </div>

      {/* BẢNG ĐIỀU HƯỚNG DI ĐỘNG (NAV DRAWER OVERLAY) */}
      {showMobileNav && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" /> Danh sách câu hỏi
              </h3>
              <button 
                onClick={() => setShowMobileNav(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-2 mb-6">
                {questions.map((q, i) => {
                  const hasAnswered = answers[q.id] !== undefined;
                  const isCurrent = i === currentIndex;
                  
                  let btnClass = "h-11 rounded-lg border-2 transition-all flex items-center justify-center text-sm font-bold ";
                  
                  if (isCurrent) {
                    btnClass += "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm ";
                  } else if (hasAnswered) {
                    btnClass += "border-emerald-500 bg-emerald-50 text-emerald-700 ";
                  } else {
                    btnClass += "border-slate-100 bg-slate-50 text-slate-500 ";
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
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded border border-emerald-500 bg-emerald-50 inline-block"></span>
                    Đã làm
                  </span>
                  <span className="font-bold text-emerald-600">{Object.keys(answers).length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded border border-slate-100 bg-slate-50 inline-block"></span>
                    Chưa làm
                  </span>
                  <span className="font-bold text-slate-600">{questions.length - Object.keys(answers).length}</span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setShowMobileNav(false);
                  handleFinish();
                }}
                className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
              >
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
