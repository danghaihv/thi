import { buildRecommendedExams, normalizeGrade } from './examWorkspace';

export function getTargetGrade(exam: any) {
  return normalizeGrade(exam.grade) ?? normalizeGrade(exam.title) ?? normalizeGrade(exam.name);
}

export function getRecommendedExamCards(exams: any[], currentExamId: string, exam: any) {
  return buildRecommendedExams(exams, currentExamId, getTargetGrade(exam));
}
