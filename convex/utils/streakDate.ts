/**
 * Streak date helpers — single source of truth for the day boundary used
 * across the streak/daily-challenge system.
 *
 * **Convention: UTC days.** The daily challenge cron fires at 00:00 UTC
 * (09:00 KST) and writes `dailyChallenges.date` as a UTC YYYY-MM-DD string,
 * so every read/write touching streaks must follow the same convention.
 *
 * Known limitation: KST users playing between 00:00 KST and 09:00 KST see
 * the *previous* UTC day. Their streak does not increment until 09:00 KST.
 * Tracked separately — switching the system to local-time would also
 * require re-keying daily challenges and is out of scope for PMF #70.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function streakToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function streakYesterday(): string {
  return new Date(Date.now() - DAY_MS).toISOString().split('T')[0];
}

/** Lower bound (inclusive) of the UTC day window for `createdAt` filters. */
export function streakDayStart(date: string): string {
  return date;
}

/**
 * Upper bound (exclusive) of the UTC day window for `createdAt` filters.
 * Returns the *next day's* `YYYY-MM-DD` so a `.lt(end)` predicate is
 * gap-free. The previous `T23:59:59.999Z` form excluded any record stamped
 * at exactly that millisecond and silently lost data on day boundaries.
 */
export function streakDayEnd(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().split('T')[0];
}
