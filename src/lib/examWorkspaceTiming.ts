export function startExamCountdown(hasExam: boolean, hasResult: boolean, timeLeft: number, tick: () => void) {
  if (hasExam && !hasResult && timeLeft > 0) {
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }
  return undefined;
}

export function shouldIncrementWarnings(documentHidden: boolean, hasResult: boolean) {
  return documentHidden && !hasResult;
}
