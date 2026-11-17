import type {Doc} from '../_generated/dataModel';
import type {FunnelCounts} from './types';

const DAY_MS = 86_400_000;

export function analyticsDay(timestamp: number, utcOffsetMinutes: number) {
  return new Date(timestamp + utcOffsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function nextAnalyticsDay(day: string) {
  return new Date(Date.parse(day) + DAY_MS).toISOString().slice(0, 10);
}

export function emptyFunnelCounts(): FunnelCounts {
  return {
    visits: 0,
    dailyQuizStarted: 0,
    dailyQuizCompleted: 0,
    firstQuizCompleted: 0,
    d1Eligible: 0,
    d1Returned: 0,
    d1QuizCompleted: 0,
  };
}

export function countVisitor(
  visitor: Pick<
    Doc<'analyticsVisitors'>,
    | 'firstDailyStartedAt'
    | 'firstDailyCompletedAt'
    | 'firstQuizCompletedAt'
    | 'firstQuizCompletedDay'
    | 'firstQuizUtcOffsetMinutes'
  >,
  nextDayActivity: Pick<
    Doc<'analyticsVisitorDays'>,
    'dailyQuizCompleted' | 'practiceQuizCompleted'
  > | null,
  asOfAt: number,
): FunnelCounts {
  const counts = emptyFunnelCounts();
  counts.visits = 1;
  counts.dailyQuizStarted = Number(
    visitor.firstDailyStartedAt !== undefined &&
      visitor.firstDailyStartedAt <= asOfAt,
  );
  counts.dailyQuizCompleted = Number(
    visitor.firstDailyCompletedAt !== undefined &&
      visitor.firstDailyCompletedAt <= asOfAt,
  );
  counts.firstQuizCompleted = Number(
    visitor.firstQuizCompletedAt !== undefined &&
      visitor.firstQuizCompletedAt <= asOfAt,
  );
  if (
    visitor.firstQuizCompletedDay === undefined ||
    visitor.firstQuizUtcOffsetMinutes === undefined
  ) {
    return counts;
  }

  // Wait until the entire following local calendar day has elapsed.
  const d1EndsAt =
    Date.parse(visitor.firstQuizCompletedDay) +
    2 * DAY_MS -
    visitor.firstQuizUtcOffsetMinutes * 60_000;
  if (asOfAt < d1EndsAt) return counts;

  counts.d1Eligible = 1;
  counts.d1Returned = Number(nextDayActivity !== null);
  counts.d1QuizCompleted = Number(
    Boolean(
      nextDayActivity?.dailyQuizCompleted ||
      nextDayActivity?.practiceQuizCompleted,
    ),
  );
  return counts;
}

export function addFunnelCounts(target: FunnelCounts, source: FunnelCounts) {
  for (const key of Object.keys(target) as (keyof FunnelCounts)[]) {
    target[key] += source[key];
  }
}

export function validateReportDates(fromDate: string, toDate: string) {
  for (const day of [fromDate, toDate]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(Date.parse(day)) ||
      new Date(day).toISOString().slice(0, 10) !== day
    ) {
      throw new Error('Use valid YYYY-MM-DD dates');
    }
  }
  if (
    fromDate > toDate ||
    Date.parse(toDate) - Date.parse(fromDate) >= 31 * DAY_MS
  ) {
    throw new Error('Select a cohort window of 1 to 31 days');
  }
}
