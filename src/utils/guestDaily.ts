import {storage, Storage} from './storage';

export type GuestDailyResult = {
  quizId: string;
  isCorrect: boolean;
};

export function getGuestDailyResultsToday(
  raw = storage.getString(Storage.GuestDailyResult),
): GuestDailyResult[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];
    if (parsed?.date !== today || !Array.isArray(parsed.results)) return [];
    const results: unknown[] = parsed.results;
    return results
      .filter(
        (result: unknown): result is GuestDailyResult =>
          typeof result === 'object' &&
          result !== null &&
          typeof (result as GuestDailyResult).quizId === 'string' &&
          typeof (result as GuestDailyResult).isCorrect === 'boolean',
      )
      .map((result) => ({
        quizId: result.quizId,
        isCorrect: result.isCorrect,
      }));
  } catch {
    return [];
  }
}

/**
 * Returns true if a guest (non-authenticated user) has completed today's
 * daily quiz, based on the result blob persisted in MMKV.
 *
 * Centralized here so the modal trigger and the home `isDailyCompleted`
 * derivation cannot drift apart.
 */
export function isGuestDailyCompletedToday(): boolean {
  return getGuestDailyResultsToday().length > 0;
}
