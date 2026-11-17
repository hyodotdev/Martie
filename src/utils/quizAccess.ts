type StandardQuizAccessInput = {
  bulbCount: number;
  isPremium: boolean;
  isQuizActionLoading: boolean;
};

type QuizReadyStateInput = {
  bulbCount: number;
  isBulbLoading: boolean;
  isPremium: boolean;
};

export function canStartStandardQuiz({
  bulbCount,
  isPremium,
  isQuizActionLoading,
}: StandardQuizAccessInput): boolean {
  return !isQuizActionLoading && (isPremium || bulbCount > 0);
}

export function shouldShowQuizReadyState({
  bulbCount,
  isBulbLoading,
  isPremium,
}: QuizReadyStateInput): boolean {
  return isBulbLoading || isPremium || bulbCount > 0;
}

export function shouldSpendBulbForStandardQuiz(isPremium: boolean): boolean {
  return !isPremium;
}
