export function formatScore(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

export function getScoreFromSubmission(row: any) {
  return row.scoreEarned !== undefined ? row.scoreEarned : ((row.score / row.total) * (row.examTotalScore || 10));
}

export function formatTimeSpent(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}p` : `${minutes} phút`;
}
