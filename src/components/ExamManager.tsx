import { useState, useEffect, lazy, Suspense, type ChangeEvent, type ReactNode } from 'react';
import { Question } from '../types';
import { generateId } from '../utils/parser';
import { Plus, Trash2, Settings, Edit3, ShieldAlert } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
const ExamEditor = lazy(() => import('./ExamEditor').then((m) => ({ default: m.ExamEditor })));
const LoadingEditor = () => <div className="glass-panel rounded-[2rem] p-8 text-center text-sm font-medium text-slate-500 shadow-sm">Đang mở trình chỉnh sửa đề thi...</div>;
const LoadingState = () => <div className="py-20 text-center text-sm font-medium text-slate-500 animate-pulse">Đang tải danh sách đề thi...</div>;

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
    case 'Đề ôn tập bài học/chương': return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'Đề ôn tập GHK1': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'Đề ôn tập HK1': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    case 'Đề ôn tập GHK2': return 'bg-orange-50 text-orange-700 border-orange-100';
    case 'Đề ôn tập HK2': return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100';
    case 'Đề khảo sát': return 'bg-teal-50 text-teal-700 border-teal-100';
    case 'Đề HSG': return 'bg-rose-50 text-rose-700 border-rose-100 font-bold';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ id?: string; isBatch?: boolean; title?: string } | null>(null);

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
        if (userDoc.exists()) role = (userDoc.data() as { role?: string }).role || '';
      } catch {
        const userStr = localStorage.getItem('hmath_user');
        role = userStr ? (JSON.parse(userStr)?.role || '') : '';
      }

      const isPrivileged = role === 'admin' || role === 'teacher';
      const q = isPrivileged ? query(collection(db, 'exams')) : query(collection(db, 'exams'), where('ownerId', '==', uid));
      const querySnapshot = await getDocs(q);
      const data: Exam[] = [];
      querySnapshot.forEach((snapshotDoc) => data.push(snapshotDoc.data() as Exam));
      setExams(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'exams');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedExams(e.target.checked ? new Set(exams.map((ex) => ex.id)) : new Set());
  };

  const handleSelectExam = (id: string, checked: boolean) => {
    const next = new Set(selectedExams);
    if (checked) next.add(id); else next.delete(id);
    setSelectedExams(next);
  };

  const handleBatchDeleteTrigger = () => setDeleteConfirm({ isBatch: true });

  const handleCreateNew = () => {
    setEditingExam({
      id: 'exam_' + generateId(),
      title: 'Đề thi mới',
      grade: 9,
      timeLimit: 2700,
      totalScore: 10,
      questions: [],
      createdAt: new Date().toISOString(),
      ownerId: auth.currentUser?.uid || '',
      difficulty: 'Trung bình',
      category: 'Đề ôn tập bài học/chương',
      isPublic: true,
      config: { shuffleQuestions: true, shuffleOptions: true, showResultAfter: true, antiCheat: true },
    });
  };

  const handleSaveExam = async (examToSave: Exam) => {
    try {
      const docRef = doc(db, 'exams', examToSave.id);
      const exists = exams.some((e) => e.id === examToSave.id);
      const normalizedExam = { ...examToSave, isPublic: examToSave.isPublic ?? true };
      if (exists) {
        await updateDoc(docRef, { ...normalizedExam });
        setExams(exams.map((e) => (e.id === examToSave.id ? normalizedExam : e)));
      } else {
        await setDoc(docRef, normalizedExam);
        setExams([...exams, normalizedExam]);
      }
      setEditingExam(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'exams');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.isBatch) {
        await Promise.all(Array.from(selectedExams).map((id) => deleteDoc(doc(db, 'exams', id))));
        setExams(exams.filter((e) => !selectedExams.has(e.id)));
        setSelectedExams(new Set());
      } else if (deleteConfirm.id) {
        await deleteDoc(doc(db, 'exams', deleteConfirm.id));
        setExams(exams.filter((e) => e.id !== deleteConfirm.id));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'exams');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchGrade = filterMode === 'all' || String(exam.grade) === String(filterMode);
    const matchCategory = categoryFilter === 'all' || exam.category === categoryFilter;
    const matchDifficulty = difficultyFilter === 'all' || (exam.difficulty || 'Trung bình') === difficultyFilter;
    const matchPublish = publishFilter === 'all' || (publishFilter === 'published' ? exam.isPublic === true : exam.isPublic !== true);
    return matchGrade && matchCategory && matchDifficulty && matchPublish;
  });

  if (editingExam) {
    return (
      <Suspense fallback={<LoadingEditor />}>
        <ExamEditor exam={editingExam} onSave={handleSaveExam} onCancel={() => setEditingExam(null)} />
      </Suspense>
    );
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="glass-panel rounded-[2rem] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Settings className="h-3.5 w-3.5 text-indigo-600" /> Danh sách đề thi
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 section-title">Quản lý đề thi</h2>
            <p className="mt-2 text-sm text-slate-500">Tạo, lọc, chỉnh sửa và xuất bản đề thi từ một không gian làm việc gọn hơn.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedExams.size > 0 && <button onClick={handleBatchDeleteTrigger} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"><Trash2 className="h-4 w-4" /> Xoá đã chọn ({selectedExams.size})</button>}
            <button onClick={handleCreateNew} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"><Plus className="h-4 w-4" /> Tạo đề thi mới</button>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={selectedExams.size > 0 && selectedExams.size === exams.length} onChange={handleSelectAll} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
          <span className="text-sm font-semibold text-slate-600">Chọn tất cả</span>
        </div>

        <FilterRow label="Khối lớp">
          <ChipButton active={filterMode === 'all'} onClick={() => setFilterMode('all')}>Tất cả lớp</ChipButton>
          {[5, 6, 7, 8, 9].map((grade) => <ChipButton key={grade} active={filterMode === grade} onClick={() => setFilterMode(grade)}>{grade === 5 ? 'Thi vào lớp 6' : `Lớp ${grade}`}</ChipButton>)}
        </FilterRow>

        <FilterRow label="Danh mục">
          <ChipButton active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>Tất cả danh mục</ChipButton>
          {(['Đề ôn tập bài học/chương', 'Đề ôn tập GHK1', 'Đề ôn tập HK1', 'Đề ôn tập GHK2', 'Đề ôn tập HK2', 'Đề khảo sát', 'Đề HSG'] as ExamCategory[]).map((cat) => <ChipButton key={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>{cat}</ChipButton>)}
        </FilterRow>

        <FilterRow label="Mức độ">
          <ChipButton active={difficultyFilter === 'all'} onClick={() => setDifficultyFilter('all')}>Tất cả mức độ</ChipButton>
          {(['Cơ bản', 'Trung bình', 'Nâng cao'] as const).map((diff) => <ChipButton key={diff} active={difficultyFilter === diff} onClick={() => setDifficultyFilter(diff)}>{diff}</ChipButton>)}
        </FilterRow>

        <FilterRow label="Trạng thái">
          <ChipButton active={publishFilter === 'all'} onClick={() => setPublishFilter('all')}>Tất cả</ChipButton>
          <ChipButton active={publishFilter === 'published'} onClick={() => setPublishFilter('published')}>Đã đăng</ChipButton>
          <ChipButton active={publishFilter === 'draft'} onClick={() => setPublishFilter('draft')}>Lưu nháp</ChipButton>
        </FilterRow>
      </div>

      {exams.length === 0 ? (
        <div className="glass-panel rounded-[2rem] p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"><Settings className="h-8 w-8" /></div>
          <h3 className="text-lg font-medium text-slate-700">Chưa có đề thi nào</h3>
          <p className="mt-2 text-slate-500">Hãy tạo đề thi đầu tiên của bạn để chia sẻ cho học sinh.</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="glass-panel rounded-[2rem] border border-dashed border-slate-200 p-10 text-center text-slate-500 shadow-sm">Chưa có đề thi nào phù hợp với bộ lọc đã chọn.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="group flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 flex-wrap gap-2">
                  <input type="checkbox" checked={selectedExams.has(exam.id)} onChange={(e) => handleSelectExam(exam.id, e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                  <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase leading-none text-emerald-700">{exam.grade === 5 ? 'Thi vào 6' : `Lớp ${exam.grade}`}</span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${exam.difficulty === 'Cơ bản' ? 'border-blue-100 bg-blue-50 text-blue-700' : exam.difficulty === 'Nâng cao' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>{exam.difficulty || 'Trung bình'}</span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${getCategoryBadgeStyle(exam.category)}`}>{exam.category || 'Đề ôn tập bài học/chương'}</span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${exam.isPublic === true ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>{exam.isPublic === true ? 'Công khai' : 'Lưu nháp'}</span>
                </div>
                <div className="flex gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button onClick={() => setEditingExam(exam)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:text-indigo-600"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteConfirm({ id: exam.id, title: exam.title, isBatch: false })} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <h3 className="mt-4 line-clamp-2 font-bold leading-snug text-slate-950">{exam.title}</h3>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <InfoBox label="Thời gian" value={`${exam.timeLimit / 60}p`} />
                <InfoBox label="Số câu" value={String(exam.questions.length)} />
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                {exam.config.antiCheat ? <span className="inline-flex items-center gap-1 text-orange-600"><ShieldAlert className="h-3.5 w-3.5" /> Chống gian lận bật</span> : null}
                <span className="ml-auto">Tổng: <strong className="text-slate-700">{exam.totalScore}đ</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50"><Trash2 className="h-5 w-5" /></div>
              <h3 className="text-lg font-bold text-slate-950">{deleteConfirm.isBatch ? 'Xóa nhiều đề thi' : 'Xóa đề thi'}</h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">{deleteConfirm.isBatch ? <>Bạn có chắc chắn muốn xóa <strong>{selectedExams.size}</strong> đề thi đã chọn không? Hành động này không thể hoàn tác.</> : <>Bạn có chắc chắn muốn xóa đề thi {deleteConfirm.title ? <strong>&quot;{deleteConfirm.title}&quot;</strong> : 'này'} không? Hành động này không thể hoàn tác.</>}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">Hủy bỏ</button>
              <button onClick={confirmDelete} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">Xác nhận xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 lg:flex-row lg:items-center">
      <span className="min-w-[110px] shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400">{label}:</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${active ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{children}</button>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="mb-1 text-xs font-semibold uppercase text-slate-400">{label}</div><div className="font-bold text-slate-700">{value}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

