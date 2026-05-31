import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Question } from '../types';
import { parseDocx, parseTextToQuestions, generateId } from '../utils/parser';
import { Upload, Plus, Trash2, CheckCircle2, ChevronLeft, Save, Settings, Edit3, ShieldAlert, Table, Filter } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

export type ExamCategory = 'Đề ôn tập bài học/chương' | 'Đề ôn tập GHK1' | 'Đề ôn tập HK1' | 'Đề ôn tập GHK2' | 'Đề ôn tập HK2' | 'Đề khảo sát' | 'Đề HSG';

interface Exam {
  id: string;
  title: string;
  grade: number;
  timeLimit: number;
  totalScore: number;
  questions: Question[];
  createdAt: string;
  ownerId: string;
  isPublic?: boolean;
  difficulty?: 'Cơ bản' | 'Trung bình' | 'Nâng cao';
  category?: ExamCategory;
  config: {
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showResultAfter: boolean;
    antiCheat: boolean;
  };
}

export const getCategoryBadgeStyle = (category?: string) => {
  switch (category) {
    case 'Đề ôn tập bài học/chương':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'Đề ôn tập GHK1':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'Đề ôn tập HK1':
      return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    case 'Đề ôn tập GHK2':
      return 'bg-orange-50 text-orange-700 border-orange-100';
    case 'Đề ôn tập HK2':
      return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100';
    case 'Đề khảo sát':
      return 'bg-teal-50 text-teal-700 border-teal-100';
    case 'Đề HSG':
      return 'bg-rose-50 text-rose-700 border-rose-100 font-bold';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

export function ExamManager() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<number | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExamCategory>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Cơ bản' | 'Trung bình' | 'Nâng cao'>('all');
  const [publishFilter, setPublishFilter] = useState<'all' | 'published' | 'draft'>('all');
  
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id?: string;
    isBatch?: boolean;
    title?: string;
  } | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    if (!auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      let role = '';

      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as { role?: string };
          role = userData.role || '';
        }
      } catch {
        const userStr = localStorage.getItem('hmath_user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        role = currentUser?.role || '';
      }

      const isPrivileged = role === 'admin' || role === 'teacher';
      const q = isPrivileged
        ? query(collection(db, 'exams'))
        : query(collection(db, 'exams'), where('ownerId', '==', uid));

      const querySnapshot = await getDocs(q);
      const data: Exam[] = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data() as Exam);
      });
      setExams(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'exams');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedExams(new Set(exams.map(ex => ex.id)));
    } else {
      setSelectedExams(new Set());
    }
  };

  const handleSelectExam = (id: string, checked: boolean) => {
    const newSet = new Set(selectedExams);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedExams(newSet);
  };

  const handleBatchDeleteTrigger = () => {
    setDeleteConfirm({ isBatch: true });
  };

  const handleCreateNew = () => {
    setEditingExam({
      id: "exam_" + generateId(),
      title: "Đề thi mới",
      grade: 9,
      timeLimit: 2700,
      totalScore: 10,
      questions: [],
      createdAt: new Date().toISOString(),
      ownerId: auth.currentUser?.uid || '',
      difficulty: 'Trung bình',
      category: 'Đề ôn tập bài học/chương',
      isPublic: true,
      config: {
        shuffleQuestions: true,
        shuffleOptions: true,
        showResultAfter: true,
        antiCheat: true
      }
    });
  };

  const handleSaveExam = async (examToSave: Exam) => {
    try {
      const docRef = doc(db, 'exams', examToSave.id);
      const exists = exams.some(e => e.id === examToSave.id);
      
      const normalizedExam = {
        ...examToSave,
        isPublic: examToSave.isPublic ?? true,
      };

      if (exists) {
         await updateDoc(docRef, {
            ...normalizedExam
         });
         setExams(exams.map(e => e.id === examToSave.id ? normalizedExam : e));
      } else {
         await setDoc(docRef, normalizedExam);
         setExams([...exams, normalizedExam]);
      }
      setEditingExam(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'exams');
    }
  };

  const handleDeleteExamClick = (id: string, title: string) => {
    setDeleteConfirm({ id, title, isBatch: false });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.isBatch) {
        await Promise.all(
          Array.from(selectedExams).map(id => deleteDoc(doc(db, 'exams', id)))
        );
        setExams(exams.filter(e => !selectedExams.has(e.id)));
        setSelectedExams(new Set());
      } else if (deleteConfirm.id) {
        await deleteDoc(doc(db, 'exams', deleteConfirm.id));
        setExams(exams.filter(e => e.id !== deleteConfirm.id));
        const newSelected = new Set(selectedExams);
        newSelected.delete(deleteConfirm.id);
        setSelectedExams(newSelected);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'exams');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchGrade = filterMode === 'all' || String(exam.grade) === String(filterMode);
    const matchCategory = categoryFilter === 'all' || exam.category === categoryFilter;
    const matchDifficulty = difficultyFilter === 'all' || (exam.difficulty || 'Trung bình') === difficultyFilter;
    const matchPublish = publishFilter === 'all' || (publishFilter === 'published' ? exam.isPublic === true : exam.isPublic !== true);
    return matchGrade && matchCategory && matchDifficulty && matchPublish;
  });

  const handleSelectAllFiltered = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedExams(new Set(filteredExams.map(ex => ex.id)));
    } else {
      setSelectedExams(new Set());
    }
  };

  if (editingExam) {
    return <ExamEditor 
             exam={editingExam} 
             onSave={handleSaveExam}
             onCancel={() => setEditingExam(null)} 
           />;
  }

  if (loading) return <div className="py-20 text-center animate-pulse text-slate-500 font-medium">Đang tải cấu hình môn thi...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Quản lý Đề thi</h2>
          <p className="text-slate-500 text-sm mt-1">
            Tổng cộng: <span className="font-medium text-indigo-600">{exams.length} đề thi</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedExams.size > 0 && (
             <button 
                onClick={handleBatchDeleteTrigger}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 border border-red-200"
             >
                <Trash2 className="w-5 h-5"/> Xoá đã chọn ({selectedExams.size})
             </button>
          )}
          <button 
            onClick={handleCreateNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5"/> Tạo đề thi mới
          </button>
        </div>
      </div>

      {/* Category and Grade Classifier Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Khối lớp filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0 min-w-[120px]">Khối lớp:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button 
              onClick={() => setFilterMode('all')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-150 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
            >
              Tất cả lớp
            </button>
            {[5, 6, 7, 8, 9].map(grade => (
              <button 
                key={grade} 
                onClick={() => setFilterMode(grade)} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterMode === grade ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-150 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
              >
                {grade === 5 ? 'Thi vào lớp 6' : `Lớp ${grade}`}
              </button>
            ))}
          </div>
        </div>

        {/* Danh mục filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3.5 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0 min-w-[120px] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5"/> Danh mục:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button 
              onClick={() => setCategoryFilter('all')} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-150 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
            >
              Tất cả danh mục
            </button>
            {(['Đề ôn tập bài học/chương', 'Đề ôn tập GHK1', 'Đề ôn tập HK1', 'Đề ôn tập GHK2', 'Đề ôn tập HK2', 'Đề khảo sát', 'Đề HSG'] as ExamCategory[]).map(cat => (
              <button 
                key={cat} 
                onClick={() => setCategoryFilter(cat)} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent ${categoryFilter === cat ? `${getCategoryBadgeStyle(cat)} !border-slate-300 shadow-sm font-extrabold` : 'hover:bg-slate-150 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Mức độ filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3.5 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0 min-w-[120px] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5"/> Mức độ:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setDifficultyFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${difficultyFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-150 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
            >
              Tất cả mức độ
            </button>
            {(['Cơ bản', 'Trung bình', 'Nâng cao'] as const).map(diff => {
              let badgeColor = '';
              if (diff === 'Cơ bản') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-extrabold';
              else if (diff === 'Trung bình') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm font-extrabold';
              else badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm font-extrabold';

              const isSelected = difficultyFilter === diff;
              return (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent ${isSelected ? badgeColor : 'hover:bg-slate-150 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${diff === 'Cơ bản' ? 'bg-blue-500' : diff === 'Trung bình' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        {/* Trạng thái publish filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3.5 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0 min-w-[120px] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5"/> Trạng thái:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setPublishFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${publishFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-150 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setPublishFilter('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${publishFilter === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
            >
              Đã đăng
            </button>
            <button
              onClick={() => setPublishFilter('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${publishFilter === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
            >
              Lưu nháp
            </button>
          </div>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
             <Settings className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">Chưa có đề thi nào</h3>
          <p className="text-slate-500 mt-2">Hãy tạo đề thi đầu tiên của bạn để chia sẻ cho học sinh.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {filteredExams.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500 font-medium h-48 flex flex-col justify-center items-center">
              Chưa có đề thi nào phù hợp với bộ lọc đã chọn.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map(exam => (
                <div key={exam.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group relative flex flex-col h-full">
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-1.5 flex-wrap flex-1 max-w-[85%]">
                          <input 
                            type="checkbox" 
                            checked={selectedExams.has(exam.id)}
                            onChange={(e) => handleSelectExam(exam.id, e.target.checked)}
                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer mr-0.5"
                          />
                         <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-100 uppercase leading-none">{exam.grade === 5 ? 'Thi vào 6' : `Lớp ${exam.grade}`}</span>
                         <span className={`font-bold text-[11px] px-2.5 py-1 rounded-full border leading-none ${
                           exam.difficulty === 'Cơ bản'
                             ? 'bg-blue-50 text-blue-700 border-blue-100'
                             : exam.difficulty === 'Nâng cao'
                             ? 'bg-rose-50 text-rose-700 border-rose-100'
                             : 'bg-amber-50 text-amber-700 border-amber-100'
                         }`}>
                           {exam.difficulty || 'Trung bình'}
                         </span>
                         <span className={`font-bold text-[11px] px-2.5 py-1 rounded-full border leading-none shrink-0 ${getCategoryBadgeStyle(exam.category)}`}>
                           {exam.category || 'Đề ôn tập bài học/chương'}
                         </span>
                         <span className={`font-bold text-[11px] px-2.5 py-1 rounded-full border leading-none shrink-0 ${
                           exam.isPublic === true
                             ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                             : exam.isPublic === false
                             ? 'bg-slate-100 text-slate-700 border-slate-200'
                             : 'bg-amber-50 text-amber-700 border-amber-100'
                         }`}>
                           {exam.isPublic === true ? 'Công khai' : exam.isPublic === false ? 'Riêng tư' : 'Chưa thiết lập'}
                         </span>
                      </div>
                    <div className="flex gap-2 opacity-150 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingExam(exam)} className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 rounded"><Edit3 className="w-4 h-4"/></button>
                      <button onClick={() => handleDeleteExamClick(exam.id, exam.title)} className="text-slate-400 hover:text-red-500 p-1 bg-slate-50 rounded"><Trash2 className="w-4 h-4"/></button>
                    </div>
                 </div>
                 <h3 className="font-bold text-slate-800 mb-4 line-clamp-2 leading-snug">{exam.title}</h3>
                 
                 <div className="mt-auto grid grid-cols-2 gap-3 mb-4">
                   <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                     <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Thời gian</div>
                     <div className="font-bold text-slate-700">{exam.timeLimit / 60}p</div>
                   </div>
                   <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                   <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Số câu</div>
                   <div className="font-bold text-slate-700">{exam.questions.length}</div>
                 </div>
               </div>
               
               <div className="flex items-center gap-2 text-xs font-medium text-slate-500 border-t border-slate-100 pt-3">
                  {exam.config.antiCheat ? <span className="flex items-center gap-1 text-orange-600"><ShieldAlert className="w-3.5 h-3.5"/> Chống gian lận bật</span> : null}
                  <span className="ml-auto">Tổng: <strong className="text-slate-700">{exam.totalScore}đ</strong></span>
               </div>
            </div>
          ))}
        </div>
      )}
      </div>
     )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {deleteConfirm.isBatch ? "Xóa nhiều đề thi" : "Xóa đề thi"}
              </h3>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {deleteConfirm.isBatch ? (
                <>Bạn có chắc chắn muốn xóa <strong>{selectedExams.size}</strong> đề thi đã chọn không? Hành động này không thể hoàn tác.</>
              ) : (
                <>Bạn có chắc chắn muốn xóa đề thi {deleteConfirm.title ? <strong>"{deleteConfirm.title}"</strong> : 'này'} không? Hành động này không thể hoàn tác.</>
              )}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors bg-slate-50 border border-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm shadow-red-100"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamEditor({ exam: initialExam, onSave, onCancel }: { exam: Exam, onSave: (e: Exam) => void, onCancel: () => void }) {
  const [exam, setExam] = useState<Exam>(initialExam);
  const [importMode, setImportMode] = useState<'text' | 'file'>('file');
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Edit specific question
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const newQuestions = await parseDocx(file);
      if (newQuestions.length === 0) {
        setError("Không tìm thấy câu hỏi nào. Đảm bảo sử dụng định dạng 'Câu 1: ...' và 'A. ...'");
      } else {
        setExam(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
        showSuccess(`Nhập dữ liệu thành công (${newQuestions.length} câu hỏi).`);
      }
    } catch (err: any) {
      setError(err.message);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextImport = () => {
    setError(null);
    const newQuestions = parseTextToQuestions(rawText);
    if (newQuestions.length === 0) {
      setError("Không thể trích xuất câu hỏi. Vui lòng kiểm tra lại cấu trúc văn bản.");
    } else {
      setExam(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
      setRawText('');
      showSuccess(`Nhập dữ liệu thành công (${newQuestions.length} câu hỏi).`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm sticky top-4 z-10">
         <button onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium px-2 py-1">
           <ChevronLeft className="w-5 h-5"/> Quay lại
         </button>
         <button onClick={() => onSave(exam)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors">
           <Save className="w-5 h-5"/> Lưu Đề Thi
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Config */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings className="w-5 h-5"/> Cấu hình chung</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên đề thi</label>
                <input type="text" value={exam.title} onChange={e => setExam({...exam, title: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Khối lớp</label>
                  <select value={exam.grade} onChange={e => setExam({...exam, grade: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none bg-white">
                    {[5,6,7,8,9].map(g => <option key={g} value={g}>{g === 5 ? 'Thi vào 6' : `Lớp ${g}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian (phút)</label>
                  <input type="number" value={exam.timeLimit / 60} onChange={e => setExam({...exam, timeLimit: Number(e.target.value) * 60})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Điểm tối đa</label>
                 <input type="number" value={exam.totalScore} onChange={e => setExam({...exam, totalScore: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mức độ đề thi</label>
                <select 
                  value={exam.difficulty || 'Trung bình'} 
                  onChange={e => setExam({...exam, difficulty: e.target.value as any})} 
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none bg-white font-medium"
                >
                  <option value="Cơ bản">🟢 Cơ bản</option>
                  <option value="Trung bình">🟡 Trung bình</option>
                  <option value="Nâng cao">🔴 Nâng cao</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục đề thi</label>
                <select
                  value={exam.category || 'Đề ôn tập bài học/chương'}
                  onChange={e => setExam({...exam, category: e.target.value as any})}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none bg-white font-medium"
                >
                  <option value="Đề ôn tập bài học/chương">📘 Đề ôn tập bài học/chương</option>
                  <option value="Đề ôn tập GHK1">📙 Đề ôn tập GHK1</option>
                  <option value="Đề ôn tập HK1">📕 Đề ôn tập HK1</option>
                  <option value="Đề ôn tập GHK2">📙 Đề ôn tập GHK2</option>
                  <option value="Đề ôn tập HK2">📕 Đề ôn tập HK2</option>
                  <option value="Đề khảo sát">💚 Đề khảo sát</option>
                  <option value="Đề HSG">👑 Đề HSG</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái hiển thị</label>
                <select
                  value={exam.isPublic === false ? 'draft' : 'public'}
                  onChange={e => setExam({ ...exam, isPublic: e.target.value === 'public' })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none bg-white font-medium"
                >
                  <option value="public">Hiển thị ngay (Công khai)</option>
                  <option value="draft">Lưu nháp (Ẩn với học sinh)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
              <h4 className="font-semibold text-sm text-slate-600 mb-4">Cấu hình làm bài (Kiểu Azota)</h4>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={exam.config.shuffleQuestions} onChange={e => setExam({...exam, config: {...exam.config, shuffleQuestions: e.target.checked}})} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Đảo ngẫu nhiên câu hỏi</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={exam.config.shuffleOptions} onChange={e => setExam({...exam, config: {...exam.config, shuffleOptions: e.target.checked}})} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Đảo ngẫu nhiên đáp án</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={exam.config.antiCheat} onChange={e => setExam({...exam, config: {...exam.config, antiCheat: e.target.checked}})} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Chống gian lận (Toàn màn hình & Cảnh báo thoát trang)</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={exam.config.showResultAfter} onChange={e => setExam({...exam, config: {...exam.config, showResultAfter: e.target.checked}})} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Hiện điểm và đáp án sau khi nộp</span>
              </label>
            </div>
          </div>
        </div>

        {/* Questions Manager */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" /> Tải lên câu hỏi
            </h3>
            
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit mb-6">
              <button onClick={() => setImportMode('file')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${importMode === 'file' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                Từ file Word (.docx)
              </button>
              <button onClick={() => setImportMode('text')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${importMode === 'text' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                Dán văn bản
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">{error}</div>}
            {successMsg && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-100 flex items-center gap-2 font-medium"><CheckCircle2 className="w-4 h-4"/> {successMsg}</div>}

            {importMode === 'file' ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                <input type="file" accept=".docx" className="hidden" id="file-upload" onChange={handleFileUpload} ref={fileInputRef} />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4"><Upload className="w-6 h-6" /></div>
                  <span className="font-bold text-slate-700">Nhấn để chọn tải lên file .docx</span>
                  <span className="text-sm font-medium text-slate-500 mt-1">Đảm bảo cấu trúc câu hỏi đúng quy tắc</span>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea 
                  value={rawText} onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Câu 1: Giải phương trình 2x = 4\nA. x = 1\nB. x = 2\nC. x = 3\nD. x = 4\nĐáp án: B`}
                  className="w-full h-48 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                />
                <button onClick={handleTextImport} disabled={!rawText.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold disabled:opacity-50">
                  Nhập câu hỏi
                </button>
              </div>
            )}
            
            <div className="mt-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-sm font-medium text-blue-800">
              Quy tắc: Bắt đầu mỗi câu bằng <code>Câu 1:</code>, các đáp án bằng <code>A.</code>, <code>B.</code>, <code>C.</code>, <code>D.</code> và khai báo đáp án đúng bằng <code>Đáp án: A</code>
            </div>
          </div>

          {exam.questions.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-slate-800">Danh sách câu hỏi ({exam.questions.length})</h3>
                 <button onClick={() => setExam({...exam, questions: []})} className="text-red-500 text-sm font-bold hover:underline">Xoá tất cả</button>
              </div>
              <div className="space-y-4">
                {exam.questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 relative group">
                    <div className="absolute top-4 right-4 flex gap-2">
                       <button onClick={() => setEditingQuestionId(q.id)} className="text-slate-400 hover:text-indigo-600 transition-colors bg-white shadow-sm border rounded p-1.5"><Edit3 className="w-3.5 h-3.5" /></button>
                       <button onClick={() => setExam({...exam, questions: exam.questions.filter(x => x.id !== q.id)})} className="text-slate-400 hover:text-red-500 transition-colors bg-white shadow-sm border rounded p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    
                    {editingQuestionId === q.id ? (
                      <QuestionEditor 
                        question={q} 
                        onSave={(updatedQ) => {
                          setExam({...exam, questions: exam.questions.map(x => x.id === q.id ? updatedQ : x)});
                          setEditingQuestionId(null);
                        }}
                        onCancel={() => setEditingQuestionId(null)}
                      />
                    ) : (
                      <>
                        <div className="font-semibold text-slate-800 pr-16 flex items-baseline gap-2">
                          <span className="whitespace-nowrap">Câu {idx + 1}:</span>
                          <div className="flex-1">
                            <LatexRenderer content={q.content} />
                            {q.imageUrl && (
                              <div className="mt-3">
                                <img src={q.imageUrl} alt={`Hình ảnh câu ${idx + 1}`} className="max-h-48 rounded-lg border bg-white shadow-sm object-contain" referrerPolicy="no-referrer" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            q.level === 'Nhận biết' || !q.level ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            q.level === 'Thông hiểu' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            q.level === 'Vận dụng' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            Mức độ: {q.level || 'Nhận biết'}
                          </span>
                          {q.points !== undefined && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Điểm: {q.points}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className={`text-sm p-3 rounded-lg border ${oIdx === q.correctAnswer ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 bg-white text-slate-600 font-medium'} flex items-baseline gap-2`}>
                              <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                              <div className="flex-1"><LatexRenderer content={opt} /></div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ question, onSave, onCancel }: { question: Question, onSave: (q: Question) => void, onCancel: () => void }) {
  const [q, setQ] = useState(question);
  
  return (
    <div className="space-y-4 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm mt-2">
       <div>
                   <div className="flex justify-between items-center mb-1 flex-wrap gap-2 w-full">
            <label className="block text-xs font-bold text-slate-500">Nội dung câu hỏi</label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  const template = '\n| Danh mục | Số liệu |\n| :--- | :--- |\n| Số liệu mẫu A | 150.5 |\n| Số liệu mẫu B | 275.2 |';
                  setQ({ ...q, content: q.content ? q.content + ' ' + template : template });
                }}
                className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-100 transition-colors cursor-pointer"
                title="Chèn bảng số liệu 2 cột"
              >
                <Table className="w-3 h-3" /> + Bảng 2 cột
              </button>
              <button
                type="button"
                onClick={() => {
                  const template = '\n| STT | Đại lượng đo lường | Trị số |\n| :-: | :--- | :--- |\n| 1 | Thể tích V ($m^3$) | 12.8 |\n| 2 | Áp suất P ($atm$) | 2.5 |\n| 3 | Nhiệt độ T ($K$) | 300 |';
                  setQ({ ...q, content: q.content ? q.content + ' ' + template : template });
                }}
                className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-100 transition-colors cursor-pointer"
                title="Chèn bảng số liệu 3 cột"
              >
                <Table className="w-3 h-3" /> + Bảng 3 cột
              </button>
              <button
                type="button"
                onClick={() => {
                  const template = '$\\frac{x}{y}$';
                  setQ({ ...q, content: q.content ? q.content + ' ' + template : template });
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                title="Chèn phân số toán học"
              >
                Phân số
              </button>
              <button
                type="button"
                onClick={() => {
                  const template = '$\\sum_{i=1}^{n} x_i$';
                  setQ({ ...q, content: q.content ? q.content + ' ' + template : template });
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                title="Chèn tổng sigma"
              >
                Tổng ∑
              </button>
            </div>
          </div>
         <textarea value={q.content} onChange={e => setQ({...q, content: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 min-h-[80px] font-medium" />
       </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div>
           <label className="block text-xs font-bold text-slate-500 mb-1">Mức độ câu hỏi</label>
           <select 
             value={q.level || 'Nhận biết'} 
             onChange={e => setQ({...q, level: e.target.value})} 
             className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 font-medium bg-white"
           >
             <option value="Nhận biết">🟢 Nhận biết</option>
             <option value="Thông hiểu">🟡 Thông hiểu</option>
             <option value="Vận dụng">🟠 Vận dụng</option>
             <option value="Vận dụng cao">🔴 Vận dụng cao</option>
           </select>
         </div>
         <div>
           <label className="block text-xs font-bold text-slate-500 mb-1">Điểm số (để trống để chia đều)</label>
           <input type="number" step="0.1" value={q.points || ''} onChange={e => setQ({...q, points: e.target.value ? Number(e.target.value) : undefined})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 font-medium" placeholder="VD: 0.5" />
         </div>
         <div>
           <label className="block text-xs font-bold text-slate-500 mb-1">Hình ảnh câu hỏi (URL hoặc Tải lên)</label>
           <div className="flex gap-2">
             <input type="text" value={q.imageUrl || ''} onChange={e => setQ({...q, imageUrl: e.target.value})} className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 font-medium" placeholder="https://example.com/image.png" />
             <input 
               type="file" 
               accept="image/*" 
               id={`file-image-q-${q.id}`}
               className="hidden" 
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                       setQ({ ...q, imageUrl: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                 }
               }}
             />
             <label htmlFor={`file-image-q-${q.id}`} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer whitespace-nowrap transition-colors border border-slate-200 shadow-sm">
                Chọn ảnh
             </label>
           </div>
           {q.imageUrl && (
             <div className="mt-2 relative inline-block group">
                <img src={q.imageUrl} alt="Xem trước" className="h-16 rounded border bg-slate-100 object-contain max-w-[200px]" referrerPolicy="no-referrer" />
                <button 
                  type="button" 
                  onClick={() => setQ({...q, imageUrl: undefined})} 
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 leading-none text-xs hover:bg-red-600 transition-colors shadow-sm"
                >
                   ✕
                </button>
             </div>
           )}
         </div>
       </div>
       <div className="space-y-2">
         {q.options.map((opt, idx) => (
           <div key={idx} className="flex gap-2 items-center">
             <button onClick={() => setQ({...q, correctAnswer: idx})} className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm border-2 transition-colors ${q.correctAnswer === idx ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-slate-400 hover:border-emerald-200'}`}>
               {String.fromCharCode(65 + idx)}
             </button>
             <input type="text" value={opt} onChange={e => {
               const newOpts = [...q.options];
               newOpts[idx] = e.target.value;
               setQ({...q, options: newOpts});
             }} className="flex-1 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 font-medium" />
           </div>
         ))}
       </div>
       <div>
                   <div className="flex justify-between items-center mb-1 flex-wrap gap-2 w-full">
            <label className="block text-xs font-bold text-slate-500">Lời giải chi tiết (tùy chọn, hiển thị sau khi nộp bài)</label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  const template = '\n| Danh mục | Số liệu |\n| :--- | :--- |\n| Số liệu mẫu A | 150.5 |\n| Số liệu mẫu B | 275.2 |';
                  setQ({ ...q, explanation: q.explanation ? q.explanation + ' ' + template : template });
                }}
                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded text-[10px] font-bold transition-colors cursor-pointer"
                title="Chèn bảng lời giải 2 cột"
              >
                + Bảng 2 cột
              </button>
              <button
                type="button"
                onClick={() => {
                  const template = '\n| STT | Đại lượng đo lường | Trị số |\n| :-: | :--- | :--- |\n| 1 | Thể tích V ($m^3$) | 12.8 |\n| 2 | Áp suất P ($atm$) | 2.5 |\n| 3 | Nhiệt độ T ($K$) | 300 |';
                  setQ({ ...q, explanation: q.explanation ? q.explanation + ' ' + template : template });
                }}
                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded text-[10px] font-bold transition-colors cursor-pointer"
                title="Chèn bảng lời giải 3 cột"
              >
                + Bảng 3 cột
              </button>
              <button
                type="button"
                onClick={() => {
                  const template = '$\\frac{x}{y}$';
                  setQ({ ...q, explanation: q.explanation ? q.explanation + ' ' + template : template });
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 rounded text-[10px] font-bold transition-colors cursor-pointer"
                title="Chèn phân số toán học"
              >
                Phân số
              </button>
              <button
                type="button"
                onClick={() => {
                  const template = '$\\sum_{i=1}^{n} x_i$';
                  setQ({ ...q, explanation: q.explanation ? q.explanation + ' ' + template : template });
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 rounded text-[10px] font-bold transition-colors cursor-pointer"
                title="Chèn tổng sigma"
              >
                Tổng ∑
              </button>
            </div>
          </div>
         <textarea value={q.explanation || ''} onChange={e => setQ({...q, explanation: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 min-h-[60px] font-medium" placeholder="Nhập lời giải..." />
       </div>
       <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100">Huỷ bỏ</button>
          <button onClick={() => onSave(q)} className="px-4 py-1.5 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700">Lưu thay đổi</button>
       </div>
    </div>
  );
}
