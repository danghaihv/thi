import { collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';
import { getRecommendedExamCards } from './examWorkspaceFlow';

export async function loadRecommendedExams(currentExamId: string, exam: any) {
  const examsCol = collection(db, 'exams');
  const querySnapshot = await getDocs(query(examsCol));
  const list: any[] = [];
  querySnapshot.forEach((docSnap) => {
    list.push({ id: docSnap.id, ...docSnap.data() });
  });
  return getRecommendedExamCards(list, currentExamId, exam);
}
