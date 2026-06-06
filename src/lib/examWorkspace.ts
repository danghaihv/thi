export function cleanUndefined(obj: any): any {
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

export function normalizeGrade(value: any) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  const match = String(value || '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function calculateDefaultPoints(questions: any[], examTotal: number) {
  let definedPointsTotal = 0;
  let undefinedCount = 0;
  questions.forEach((q: any) => {
    if (q.points !== undefined && q.points !== null) {
      definedPointsTotal += q.points;
    } else {
      undefinedCount++;
    }
  });

  return {
    definedPointsTotal,
    undefinedCount,
    defaultPoints: undefinedCount > 0 ? Math.max(0, (examTotal - definedPointsTotal) / undefinedCount) : 0,
  };
}

export function buildRecommendedExams(exams: any[], currentExamId: string, targetGrade: number | null) {
  return exams
    .filter((item) => item.id !== currentExamId)
    .filter((item) => {
      const recGrade = normalizeGrade(item.grade) ?? normalizeGrade(item.title) ?? normalizeGrade(item.name);
      return targetGrade !== null && recGrade !== null && recGrade === targetGrade;
    })
    .slice(0, 3);
}
