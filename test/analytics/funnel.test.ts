import {
  analyticsDay,
  countVisitor,
  nextAnalyticsDay,
  validateReportDates,
} from '../../convex/analytics/helpers';

const completedVisitor = {
  firstQuizCompletedAt: Date.parse('2026-10-13T23:50:00+09:00'),
  firstQuizCompletedDay: '2026-10-13',
  firstQuizUtcOffsetMinutes: 540,
  firstDailyStartedAt: Date.parse('2026-10-13T23:45:00+09:00'),
  firstDailyCompletedAt: Date.parse('2026-10-13T23:50:00+09:00'),
};

describe('guest-inclusive acquisition and D1 cohorts', () => {
  it('uses local calendar dates across UTC midnight and month boundaries', () => {
    expect(analyticsDay(Date.parse('2026-10-12T15:01:00Z'), 540)).toBe(
      '2026-10-13',
    );
    expect(nextAnalyticsDay('2026-12-31')).toBe('2027-01-01');
  });

  it('excludes unfinished D1 observation windows from the denominator', () => {
    const counts = countVisitor(
      completedVisitor,
      null,
      Date.parse('2026-10-14T23:59:59+09:00'),
    );
    expect(counts.firstQuizCompleted).toBe(1);
    expect(counts.d1Eligible).toBe(0);
    expect(counts.d1Returned).toBe(0);
  });

  it('counts mature non-returners as zero rather than NaN', () => {
    const counts = countVisitor(
      completedVisitor,
      null,
      Date.parse('2026-10-15T00:00:00+09:00'),
    );
    expect(counts.d1Eligible).toBe(1);
    expect(counts.d1Returned).toBe(0);
    expect(counts.d1QuizCompleted).toBe(0);
  });

  it('distinguishes next-day app visits from quiz recompletion', () => {
    const now = Date.parse('2026-10-15T00:00:00+09:00');
    const visit = {dailyQuizCompleted: false, practiceQuizCompleted: false};
    expect(countVisitor(completedVisitor, visit, now)).toMatchObject({
      d1Returned: 1,
      d1QuizCompleted: 0,
    });
    expect(
      countVisitor(
        completedVisitor,
        {...visit, practiceQuizCompleted: true},
        now,
      ),
    ).toMatchObject({d1Returned: 1, d1QuizCompleted: 1});
  });

  it('does not count milestones after the report snapshot', () => {
    expect(
      countVisitor(
        completedVisitor,
        null,
        Date.parse('2026-10-13T10:00:00+09:00'),
      ),
    ).toMatchObject({
      firstQuizCompleted: 0,
      dailyQuizStarted: 0,
      dailyQuizCompleted: 0,
    });
  });

  it('rejects impossible dates and unbounded report ranges', () => {
    expect(() => validateReportDates('2026-02-30', '2026-03-01')).toThrow();
    expect(() => validateReportDates('2026-01-01', '2026-02-01')).toThrow();
    expect(() => validateReportDates('2026-10-01', '2026-10-31')).not.toThrow();
  });
});
