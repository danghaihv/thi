export type ExamSummary = {
  id: string;
  title: string;
  grade: number;
  timeLimit: number;
  questionCount: number;
  totalScore: number;
  submissionCount: number;
  difficulty: 'Cơ bản' | 'Trung bình' | 'Nâng cao';
  category: string;
  createdAtMs: number;
  isPublic?: boolean;
};

export function readLocalUser() {
  const saved = localStorage.getItem('hmath_user');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveReturnPath() {
  localStorage.setItem('hmath_after_login', `${window.location.pathname}${window.location.search}`);
}

export function parseCreatedAtMs(value: any): number {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function mapExamDoc(id: string, data: any): ExamSummary {
  return {
    id,
    title: data.title || 'Đề thi không tiêu đề',
    grade: Number(data.grade) || 0,
    timeLimit: Number(data.timeLimit) || 0,
    questionCount: Array.isArray(data.questions) ? data.questions.length : Number(data.questionCount) || 0,
    totalScore: Number(data.totalScore) || 10,
    submissionCount: Number(data.submissionCount) || Number(data.attemptCount) || 0,
    difficulty: data.difficulty || 'Trung bình',
    category: data.category || 'Đề ôn tập bài học/chương',
    createdAtMs: parseCreatedAtMs(data.createdAt),
    isPublic: data.isPublic,
  };
}

export function toSortedExamList(snapshot: any): ExamSummary[] {
  const nextExams: ExamSummary[] = [];
  snapshot.forEach((doc: any) => {
    nextExams.push(mapExamDoc(doc.id, doc.data()));
  });
  nextExams.sort((a, b) => b.createdAtMs - a.createdAtMs);
  return nextExams;
}
