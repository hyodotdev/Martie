/**
 * Unit tests for isGuestDailyCompletedToday().
 *
 * Covers:
 *  - missing value → false
 *  - invalid JSON → false (caught silently, no throw)
 *  - stored result for a different date → false
 *  - stored result for today → true
 *  - parsed value missing the `date` field → false
 */

import {
  getGuestDailyResultsToday,
  isGuestDailyCompletedToday,
} from '../../../src/utils/guestDaily';

let mockStoredValue: string | undefined;

jest.mock('../../../src/utils/storage', () => ({
  storage: {
    getString: () => mockStoredValue,
  },
  Storage: {GuestDailyResult: 'GuestDailyResult'},
}));

const today = (): string => new Date().toISOString().split('T')[0];

describe('isGuestDailyCompletedToday', () => {
  beforeEach(() => {
    mockStoredValue = undefined;
  });

  it('returns false when nothing is persisted', () => {
    mockStoredValue = undefined;
    expect(isGuestDailyCompletedToday()).toBe(false);
  });

  it('returns false on invalid JSON', () => {
    mockStoredValue = '{not-json';
    expect(isGuestDailyCompletedToday()).toBe(false);
  });

  it('returns false when stored date is not today', () => {
    mockStoredValue = JSON.stringify({date: '2000-01-01', results: []});
    expect(isGuestDailyCompletedToday()).toBe(false);
  });

  it('returns true when stored date matches today with valid results', () => {
    mockStoredValue = JSON.stringify({
      date: today(),
      results: [{quizId: 'quiz-1', isCorrect: true}],
    });
    expect(isGuestDailyCompletedToday()).toBe(true);
  });

  it('returns parsed guest results for today', () => {
    mockStoredValue = JSON.stringify({
      date: today(),
      results: [
        {quizId: 'quiz-1', isCorrect: true, selectedOptionIndex: 2},
        {quizId: 'quiz-2', isCorrect: false},
      ],
    });
    expect(getGuestDailyResultsToday()).toEqual([
      {quizId: 'quiz-1', isCorrect: true},
      {quizId: 'quiz-2', isCorrect: false},
    ]);
  });

  it('returns false when parsed value lacks the date field', () => {
    mockStoredValue = JSON.stringify({results: []});
    expect(isGuestDailyCompletedToday()).toBe(false);
  });
});
