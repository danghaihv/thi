export function isExamTimeWarningVisible(timeLeft: number, dismissed: boolean, hasResult: boolean, alreadyShowing: boolean) {
  return timeLeft > 0 && timeLeft <= 300 && !dismissed && !hasResult && !alreadyShowing;
}

export function shouldAllowFullscreenBypass(isFullscreenSupported: boolean) {
  return !isFullscreenSupported;
}
