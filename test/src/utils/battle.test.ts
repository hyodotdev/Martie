import {
  PENDING_BATTLE_TTL_MS,
  battleShareUrl,
  decodePendingBattle,
  encodePendingBattle,
  estimateClockOffset,
  isSeenRecently,
  remainingMs,
} from '../../../src/utils/battle';

describe('battle utils', () => {
  it('builds the universal link the native intent maps back to the room', () => {
    expect(battleShareUrl('abcd2345')).toBe(
      'https://hyo.dev/martie/battle/abcd2345?source=battle',
    );
  });

  it('estimates the server offset from the midpoint of the round trip', () => {
    expect(estimateClockOffset(1000, 1200, 5100)).toBe(4000);
    expect(estimateClockOffset(1000, 1000, 900)).toBe(-100);
  });

  it('counts down on the server clock and never goes negative', () => {
    expect(remainingMs(10_000, 4000, 1000)).toBe(5000);
    expect(remainingMs(10_000, 12_000, 0)).toBe(0);
    expect(remainingMs(null, 0, 0)).toBe(0);
  });

  it('treats a player as offline after the stale window', () => {
    expect(isSeenRecently(1000, 5000, 0, 4000)).toBe(true);
    expect(isSeenRecently(1000, 5001, 0, 4000)).toBe(false);
    expect(isSeenRecently(undefined, 0, 0, 4000)).toBe(false);
  });

  it('resumes a pending battle only right after the link was opened', () => {
    const saved = encodePendingBattle('abcd2345', 1000);
    expect(decodePendingBattle(saved, 1000 + PENDING_BATTLE_TTL_MS)).toBe(
      'abcd2345',
    );
    expect(
      decodePendingBattle(saved, 1000 + PENDING_BATTLE_TTL_MS + 1),
    ).toBeNull();
    // Codes saved by an older build were bare strings with no timestamp.
    expect(decodePendingBattle('abcd2345', 1000)).toBeNull();
    expect(decodePendingBattle(undefined, 1000)).toBeNull();
  });
});
