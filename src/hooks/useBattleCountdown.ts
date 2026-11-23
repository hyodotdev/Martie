import {useEffect, useState} from 'react';
import {remainingMs} from '../utils/battle';

const TICK_MS = 200;

/** Milliseconds left until `phaseEndsAt` on the server clock. */
export function useBattleCountdown(
  phaseEndsAt: number | null,
  offsetMs: number,
): number {
  const [left, setLeft] = useState(() =>
    remainingMs(phaseEndsAt, Date.now(), offsetMs),
  );

  useEffect(() => {
    const update = () => setLeft(remainingMs(phaseEndsAt, Date.now(), offsetMs));
    update();
    if (phaseEndsAt === null) return;
    const interval = setInterval(update, TICK_MS);
    return () => clearInterval(interval);
  }, [phaseEndsAt, offsetMs]);

  return left;
}

/** Device time, refreshed every `intervalMs`, for render-time comparisons. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}
