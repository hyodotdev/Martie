import {storage, Storage} from './storage';

export type DailyCompletionSummary = {
  date: string;
  completedAt: string;
  correctCount: number;
  totalQuestions: number;
  wrongCount: number;
};

export type DailyReturnPrompt = DailyCompletionSummary & {
  daysSinceCompleted: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDateKey(value: string): number | null {
  const time = new Date(`${value}T00:00:00.000Z`).getTime();
  return Number.isNaN(time) ? null : time;
}

function isValidSummary(value: unknown): value is DailyCompletionSummary {
  if (typeof value !== 'object' || value === null) return false;
  const summary = value as DailyCompletionSummary;
  return (
    typeof summary.date === 'string' &&
    typeof summary.completedAt === 'string' &&
    typeof summary.correctCount === 'number' &&
    typeof summary.totalQuestions === 'number' &&
    typeof summary.wrongCount === 'number'
  );
}

export function saveDailyCompletionSummary(
  summary: Omit<DailyCompletionSummary, 'date' | 'completedAt'> & {
    date?: string;
    completedAt?: string;
  },
): void {
  const now = new Date();
  storage.set(
    Storage.LastDailyCompletionSummary,
    JSON.stringify({
      date: summary.date ?? dateKey(now),
      completedAt: summary.completedAt ?? now.toISOString(),
      correctCount: summary.correctCount,
      totalQuestions: summary.totalQuestions,
      wrongCount: summary.wrongCount,
    }),
  );
}

export function getDailyReturnPrompt(
  raw = storage.getString(Storage.LastDailyCompletionSummary),
  now = new Date(),
): DailyReturnPrompt | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSummary(parsed)) return null;

    const today = dateKey(now);
    if (parsed.date >= today) return null;

    const completedTime = parseDateKey(parsed.date);
    const todayTime = parseDateKey(today);
    if (completedTime === null || todayTime === null) return null;

    const daysSinceCompleted = Math.floor(
      (todayTime - completedTime) / DAY_MS,
    );

    // This is a D1/D2 recovery nudge. Older summaries become stale and
    // should not compete with the normal daily card.
    if (daysSinceCompleted < 1 || daysSinceCompleted > 2) return null;

    return {
      ...parsed,
      daysSinceCompleted,
    };
  } catch {
    return null;
  }
}
