/**
 * A safer timer utility that uses requestAnimationFrame
 * to avoid system overloads that could cause issues with CoreAudio
 */
export function createSafeTimer(
  duration: number,
  onTick: (secondsRemaining: number) => void,
  onComplete?: () => void,
): {start: () => void; stop: () => void} {
  let isRunning = false;
  let startTime: number | null = null;
  let lastTickTime = 0;
  let animationFrameId: number | null = null;

  const tick = (timestamp: number) => {
    if (!isRunning || !startTime) return;

    const elapsedSeconds = Math.floor((timestamp - startTime) / 1000);
    const secondsRemaining = Math.max(duration - elapsedSeconds, 0);

    // Only update if the second has changed
    if (secondsRemaining !== lastTickTime) {
      lastTickTime = secondsRemaining;
      onTick(secondsRemaining);

      if (secondsRemaining === 0) {
        stop();
        onComplete?.();
        return;
      }
    }

    animationFrameId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    startTime = performance.now();
    lastTickTime = duration;
    animationFrameId = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (!isRunning) return;
    isRunning = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  return {start, stop};
}
