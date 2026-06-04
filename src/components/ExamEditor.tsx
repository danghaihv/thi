import { useRef, useState, type ChangeEvent } from 'react';
import { Upload, Save, Settings, CheckCircle2, ChevronLeft, Edit3, Trash2 } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';
import { parseDocx, parseTextToQuestions } from '../utils/parser';
import type { Question } from '../types';
import type { ExamCategory } from './ExamManager';

export interface Exam {
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

export function ExamEditor({ exam: initialExam, onSave, onCancel }: { exam: Exam; onSave: (e: Exam) => void; onCancel: () => void }) {
  const [exam, setExam] = useState<Exam>(initialExam);
  const [importMode, setImportMode] = useState<'text' | 'file'>('file');
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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
      if (newQuestions.length === 0) setError("Không tìm thấy câu hỏi nào. Đảm bảo sử dụng định dạng 'Câu 1: ...' và 'A. ...'");
      else {
        setExam((prev) => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
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
    if (newQuestions.length === 0) setError('Không thể trích xuất câu hỏi. Vui lòng kiểm tra lại cấu trúc văn bản.');
    else {
      setExam((prev) => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
      setRawText('');
      showSuccess(`Nhập dữ liệu thành công (${newQuestions.length} câu hỏi).`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="glass-panel sticky top-4 z-10 flex items-center justify-between rounded-[1.5rem] p-4 shadow-sm">
        <button onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"><ChevronLeft className="h-5 w-5" /> Quay lại</button>
        <button onClick={() => onSave(exam)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"><Save className="h-5 w-5" /> Lưu Đề Thi</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-950"><Settings className="h-5 w-5 text-indigo-600" /> Cấu hình chung</h3>
            <div className="space-y-4">
              <Field label="Tên đề thi"><input type="text" value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Khối lớp"><select value={exam.grade} onChange={(e) => setExam({ ...exam, grade: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">{[5, 6, 7, 8, 9].map((g) => <option key={g} value={g}>{g === 5 ? 'Thi vào 6' : `Lớp ${g}`}</option>)}</select></Field>
                <Field label="Thời gian (phút)"><input type="number" value={exam.timeLimit / 60} onChange={(e) => setExam({ ...exam, timeLimit: Number(e.target.value) * 60 })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></Field>
              </div>
              <Field label="Điểm tối đa"><input type="number" value={exam.totalScore} onChange={(e) => setExam({ ...exam, totalScore: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></Field>
              <Field label="Mức độ đề thi"><select value={exam.difficulty || 'Trung bình'} onChange={(e) => setExam({ ...exam, difficulty: e.target.value as any })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"><option value="Cơ bản">Cơ bản</option><option value="Trung bình">Trung bình</option><option value="Nâng cao">Nâng cao</option></select></Field>
              <Field label="Danh mục đề thi"><select value={exam.category || 'Đề ôn tập bài học/chương'} onChange={(e) => setExam({ ...exam, category: e.target.value as any })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"><option value="Đề ôn tập bài học/chương">Đề ôn tập bài học/chương</option><option value="Đề ôn tập GHK1">Đề ôn tập GHK1</option><option value="Đề ôn tập HK1">Đề ôn tập HK1</option><option value="Đề ôn tập GHK2">Đề ôn tập GHK2</option><option value="Đề ôn tập HK2">Đề ôn tập HK2</option><option value="Đề khảo sát">Đề khảo sát</option><option value="Đề HSG">Đề HSG</option></select></Field>
              <Field label="Trạng thái hiển thị"><select value={exam.isPublic === false ? 'draft' : 'public'} onChange={(e) => setExam({ ...exam, isPublic: e.target.value === 'public' })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"><option value="public">Hiển thị ngay</option><option value="draft">Lưu nháp</option></select></Field>
            </div>
            <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
              <h4 className="mb-4 text-sm font-semibold text-slate-600">Cấu hình làm bài</h4>
              <Toggle checked={exam.config.shuffleQuestions} onChange={(checked) => setExam({ ...exam, config: { ...exam.config, shuffleQuestions: checked } })} label="Đảo ngẫu nhiên câu hỏi" />
              <Toggle checked={exam.config.shuffleOptions} onChange={(checked) => setExam({ ...exam, config: { ...exam.config, shuffleOptions: checked } })} label="Đảo ngẫu nhiên đáp án" />
              <Toggle checked={exam.config.antiCheat} onChange={(checked) => setExam({ ...exam, config: { ...exam.config, antiCheat: checked } })} label="Chống gian lận" />
              <Toggle checked={exam.config.showResultAfter} onChange={(checked) => setExam({ ...exam, config: { ...exam.config, showResultAfter: checked } })} label="Hiện điểm và đáp án sau khi nộp" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-950"><Upload className="h-5 w-5 text-indigo-500" /> Tải lên câu hỏi</h3>
            <div className="mb-6 inline-flex rounded-2xl bg-slate-100 p-1">
              <button onClick={() => setImportMode('file')} className={`rounded-xl px-4 py-2 text-sm font-bold ${importMode === 'file' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Từ file Word (.docx)</button>
              <button onClick={() => setImportMode('text')} className={`rounded-xl px-4 py-2 text-sm font-bold ${importMode === 'text' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Dán văn bản</button>
            </div>
            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">{error}</div>}
            {successMsg && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> {successMsg}</div>}
            {importMode === 'file' ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                <input type="file" accept=".docx" className="hidden" id="file-upload" onChange={handleFileUpload} ref={fileInputRef} />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><Upload className="h-6 w-6" /></div>
                  <div className="font-bold text-slate-800">Nhấn để chọn file .docx</div>
                  <div className="mt-1 text-sm text-slate-500">Đảm bảo cấu trúc câu hỏi đúng quy tắc</div>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder={`Câu 1: Giải phương trình 2x = 4\nA. x = 1\nB. x = 2\nC. x = 3\nD. x = 4\nĐáp án: B`} className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                <button onClick={handleTextImport} disabled={!rawText.trim()} className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Nhập câu hỏi</button>
              </div>
            )}
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm font-medium text-blue-800">Quy tắc: Bắt đầu mỗi câu bằng <code>Câu 1:</code>, các đáp án bằng <code>A.</code>, <code>B.</code>, <code>C.</code>, <code>D.</code> và khai báo đáp án đúng bằng <code>Đáp án: A</code></div>
          </div>

          {exam.questions.length > 0 && (
            <div className="glass-panel rounded-[2rem] p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-950">Danh sách câu hỏi ({exam.questions.length})</h3>
                <button onClick={() => setExam({ ...exam, questions: [] })} className="text-sm font-bold text-red-500 hover:underline">Xoá tất cả</button>
              </div>
              <div className="space-y-4">
                {exam.questions.map((q, idx) => (
                  <div key={q.id} className="group relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="absolute right-4 top-4 flex gap-2">
                      <button onClick={() => setEditingQuestionId(q.id)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:text-indigo-600"><span className="sr-only">Sửa câu hỏi</span><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setExam({ ...exam, questions: exam.questions.filter((x) => x.id !== q.id) })} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:text-red-500"><span className="sr-only">Xóa câu hỏi</span><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>

                    {editingQuestionId === q.id ? (
                      <QuestionEditor question={q} onSave={(updatedQ) => { setExam({ ...exam, questions: exam.questions.map((x) => (x.id === q.id ? updatedQ : x)) }); setEditingQuestionId(null); }} onCancel={() => setEditingQuestionId(null)} />
                    ) : (
                      <>
                        <div className="pr-16 font-semibold text-slate-950">
                          <span className="whitespace-nowrap">Câu {idx + 1}:</span>
                          <div className="mt-1">
                            <LatexRenderer content={q.content} />
                            {q.imageUrl && <div className="mt-3"><img src={q.imageUrl} alt={`Hình ảnh câu ${idx + 1}`} className="max-h-48 rounded-xl border bg-white object-contain shadow-sm" referrerPolicy="no-referrer" /></div>}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${q.level === 'Thông hiểu' ? 'border-blue-100 bg-blue-50 text-blue-700' : q.level === 'Vận dụng' ? 'border-amber-100 bg-amber-50 text-amber-700' : q.level === 'Vận dụng cao' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>Mức độ: {q.level || 'Nhận biết'}</span>
                          {q.points !== undefined ? <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">Điểm: {q.points}</span> : null}
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {q.options.map((opt, oIdx) => <div key={oIdx} className={`flex items-baseline gap-2 rounded-xl border p-3 text-sm ${oIdx === q.correctAnswer ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 bg-white text-slate-600 font-medium'}`}><span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span><div className="flex-1"><LatexRenderer content={opt} /></div></div>)}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>{children}</div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" /><span className="text-sm font-medium text-slate-700">{label}</span></label>;
}

function QuestionEditor({ question, onSave, onCancel }: { question: Question; onSave: (q: Question) => void; onCancel: () => void }) {
  const [q, setQ] = useState(question);
  return (
    <div className="mt-2 space-y-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Nội dung câu hỏi</label>
        <textarea value={q.content} onChange={(e) => setQ({ ...q, content: e.target.value })} className="min-h-[90px] w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div><label className="mb-1 block text-xs font-bold text-slate-500">Mức độ câu hỏi</label><select value={q.level || 'Nhận biết'} onChange={(e) => setQ({ ...q, level: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"><option value="Nhận biết">Nhận biết</option><option value="Thông hiểu">Thông hiểu</option><option value="Vận dụng">Vận dụng</option><option value="Vận dụng cao">Vận dụng cao</option></select></div>
        <div><label className="mb-1 block text-xs font-bold text-slate-500">Điểm số</label><input type="number" step="0.1" value={q.points || ''} onChange={(e) => setQ({ ...q, points: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="VD: 0.5" /></div>
        <div><label className="mb-1 block text-xs font-bold text-slate-500">Hình ảnh</label><input type="text" value={q.imageUrl || ''} onChange={(e) => setQ({ ...q, imageUrl: e.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="https://..." /></div>
      </div>
      <div className="space-y-2">
        {q.options.map((opt, idx) => <div key={idx} className="flex items-center gap-2"><button onClick={() => setQ({ ...q, correctAnswer: idx })} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold ${q.correctAnswer === idx ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-400'}`}>{String.fromCharCode(65 + idx)}</button><input type="text" value={opt} onChange={(e) => { const newOpts = [...q.options]; newOpts[idx] = e.target.value; setQ({ ...q, options: newOpts }); }} className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></div>)}
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Lời giải chi tiết</label>
        <textarea value={q.explanation || ''} onChange={(e) => setQ({ ...q, explanation: e.target.value })} className="min-h-[70px] w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Nhập lời giải..." />
      </div>
      <div className="flex justify-end gap-2 pt-2"><button onClick={onCancel} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">Huỷ bỏ</button><button onClick={() => onSave(q)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Lưu thay đổi</button></div>
    </div>
  );
}
