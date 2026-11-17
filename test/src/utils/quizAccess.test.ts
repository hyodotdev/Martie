import {
  canStartStandardQuiz,
  shouldShowQuizReadyState,
  shouldSpendBulbForStandardQuiz,
} from '../../../src/utils/quizAccess';

describe('quizAccess', () => {
  describe('canStartStandardQuiz', () => {
    it('allows premium users to start with zero bulbs', () => {
      expect(
        canStartStandardQuiz({
          bulbCount: 0,
          isPremium: true,
          isQuizActionLoading: false,
        }),
      ).toBe(true);
    });

    it('blocks non-premium users with zero bulbs', () => {
      expect(
        canStartStandardQuiz({
          bulbCount: 0,
          isPremium: false,
          isQuizActionLoading: false,
        }),
      ).toBe(false);
    });

    it('blocks starts while quiz actions are loading', () => {
      expect(
        canStartStandardQuiz({
          bulbCount: 3,
          isPremium: true,
          isQuizActionLoading: true,
        }),
      ).toBe(false);
    });
  });

  describe('shouldShowQuizReadyState', () => {
    it('keeps the ready state for premium users with zero bulbs', () => {
      expect(
        shouldShowQuizReadyState({
          bulbCount: 0,
          isBulbLoading: false,
          isPremium: true,
        }),
      ).toBe(true);
    });

    it('shows the depleted state for non-premium users with zero bulbs', () => {
      expect(
        shouldShowQuizReadyState({
          bulbCount: 0,
          isBulbLoading: false,
          isPremium: false,
        }),
      ).toBe(false);
    });
  });

  describe('shouldSpendBulbForStandardQuiz', () => {
    it('does not spend bulbs for premium users', () => {
      expect(shouldSpendBulbForStandardQuiz(true)).toBe(false);
    });

    it('spends bulbs for non-premium users', () => {
      expect(shouldSpendBulbForStandardQuiz(false)).toBe(true);
    });
  });
});
