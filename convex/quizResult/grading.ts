import {shuffle} from '../battle/logic';

// Players answer quizzes many times a day; this bounds ranking spam only.
export const MAX_QUIZ_RESULTS_PER_DAY = 500;

// A random number source that always plays the same sequence for one seed.
function seededRandom(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (Math.imul(state, 31) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A quiz's options in the order players see them. Players answer with the
 * position they tapped, so the order comes from the quiz's id: grading the
 * answer later sees the same order the player did.
 */
export function displayedOptions<T>(
  quizId: string,
  options: readonly T[],
): T[] {
  return shuffle(options, seededRandom(quizId));
}

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
