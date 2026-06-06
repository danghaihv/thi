export function buildSubmission({
  exam,
  answers,
  id,
  timeLeft,
  user,
  defaultPoints,
  authUserId,
}: {
  exam: any;
  answers: Record<string, number>;
  id: string;
  timeLeft: number;
  user: any;
  defaultPoints: number;
  authUserId: string;
}) {
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
      explanation: q.explanation,
    };
  });

  const examTotalScore = exam.totalScore || 10;

  return {
    submission: {
      examId: id,
      examOwnerId: exam.ownerId,
      studentName: user.name,
      score: correctCount,
      scoreEarned,
      total: exam.questions.length,
      examTotalScore,
      timeSpent: exam.timeLimit ? Math.max(0, exam.timeLimit - timeLeft) : 0,
      showResultAfter: exam.config?.showResultAfter !== false,
      results,
      submittedAt: new Date().toISOString(),
      studentId: authUserId,
    },
    correctCount,
    scoreEarned,
    examTotalScore,
    results,
  };
}

export function buildResultSummary(result: any) {
  const finalScoreNum = result.scoreEarned !== undefined ? result.scoreEarned : (result.score / result.total) * result.examTotalScore;
  const isGood = (finalScoreNum / (result.examTotalScore || 10)) >= 0.8;
  const finalScore = finalScoreNum.toFixed(2).replace(/\.?0*$/, '');

  return { finalScoreNum, isGood, finalScore };
}
