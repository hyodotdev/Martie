// Players answer quizzes many times a day; this bounds ranking spam only.
export const MAX_QUIZ_RESULTS_PER_DAY = 500;

export function isCorrectOption(
  options: {isAnswer?: boolean}[],
  selectedOptionIndex: number,
): boolean {
  return (
    Number.isInteger(selectedOptionIndex) &&
    selectedOptionIndex >= 0 &&
    selectedOptionIndex < options.length &&
    options[selectedOptionIndex]?.isAnswer === true
  );
}
