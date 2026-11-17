/**
 * Client-side mirror of `convex/utils/streakDate.ts` — keep them in sync.
 *
 * **Convention: UTC days.** Server writes `dailyChallenges.date` and
 * `userProfiles.lastStreakDate` in UTC YYYY-MM-DD, so the client must
 * compare against the same value.
 *
 * Known limitation: KST users between 00:00 and 09:00 KST see the previous
 * UTC day. Switching to local time also requires re-keying daily challenges
 * — out of scope for PMF #70.
 */

export function streakToday(): string {
  return new Date().toISOString().split('T')[0];
}
