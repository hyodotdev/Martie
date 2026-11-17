import {getDailyReturnPrompt} from '../../../src/utils/dailyReturn';

const now = new Date('2026-05-10T12:00:00.000Z');

function summary(date: string, wrongCount = 2): string {
  return JSON.stringify({
    date,
    completedAt: `${date}T12:00:00.000Z`,
    correctCount: 3,
    totalQuestions: 5,
    wrongCount,
  });
}

describe('getDailyReturnPrompt', () => {
  it('returns yesterday completion summary as a D1 return prompt', () => {
    expect(getDailyReturnPrompt(summary('2026-05-09'), now)).toEqual({
      date: '2026-05-09',
      completedAt: '2026-05-09T12:00:00.000Z',
      correctCount: 3,
      totalQuestions: 5,
      wrongCount: 2,
      daysSinceCompleted: 1,
    });
  });

  it('keeps the D2 recovery prompt but drops older stale summaries', () => {
    expect(
      getDailyReturnPrompt(summary('2026-05-08', 1), now)?.daysSinceCompleted,
    ).toBe(2);
    expect(getDailyReturnPrompt(summary('2026-05-07'), now)).toBeNull();
  });

  it('does not show the prompt after today is already completed', () => {
    expect(getDailyReturnPrompt(summary('2026-05-10'), now)).toBeNull();
  });

  it('returns null for invalid stored data', () => {
    expect(getDailyReturnPrompt('{not-json', now)).toBeNull();
    expect(getDailyReturnPrompt(JSON.stringify({date: '2026-05-09'}), now))
      .toBeNull();
  });
});
