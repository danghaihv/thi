import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { cleanUndefined, calculateDefaultPoints } from './examWorkspace';
import { generateId } from '../utils/parser';
import { buildSubmission } from './examWorkspaceResult';

export async function loadExamById(id: string): Promise<any | null> {
  const docRef = doc(db, 'exams', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

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

  return { ...data, id: docSnap.id, questions: procQuestions };
}

export async function submitExamResult({ exam, answers, id, timeLeft, user, authUserId }: { exam: any; answers: Record<string, number>; id: string; timeLeft: number; user: any; authUserId: string; }) {
  const { submission } = buildSubmission({
    exam,
    answers,
    id,
    timeLeft,
    user,
    defaultPoints: calculateDefaultPoints(exam.questions, exam.totalScore || 10).defaultPoints,
    authUserId,
  });

  const subId = 'sub_' + generateId();
  await setDoc(doc(db, 'submissions', subId), cleanUndefined(submission));
  return submission;
}

export async function checkStudentMonthlyLimit(uid: string, examId?: string) {
  if (!examId) return { currentUser: null, limited: false };
  const uDoc = await getDoc(doc(db, 'users', uid));
  if (!uDoc.exists()) return { currentUser: null, limited: false };

  const uData = uDoc.data();
  if (uData.role === 'admin' || uData.role === 'teacher') return { currentUser: uData, limited: false };
  const hasVip = uData.vipExpiry && new Date(uData.vipExpiry).getTime() > Date.now();
  if (hasVip) return { currentUser: uData, limited: false };

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const subQ = query(collection(db, 'submissions'), where('studentId', '==', uid), where('submittedAt', '>=', startOfMonth.toISOString()));
  const subSnap = await getDocs(subQ);
  return { currentUser: uData, limited: subSnap.size >= 10 };
}
