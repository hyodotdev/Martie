/**
 * 1:1 battle rules, kept free of Convex so they can be unit tested.
 *
 * A battle is a quiz-show buzzer round: whoever answers first wins the
 * question if right; if wrong, the other player gets one chance; if both
 * miss (or time runs out) the answer is revealed and the next one starts.
 */

export const BATTLE_QUESTION_COUNT = 10;
export const BATTLE_COUNTDOWN_MS = 3000;
export const BATTLE_FIRST_BUZZ_MS = 15000;
export const BATTLE_SECOND_CHANCE_MS = 7000;
export const BATTLE_REVEAL_MS = 2500;
// Answers sent right at the deadline still count if they arrive this late.
export const BATTLE_BUZZ_GRACE_MS = 500;
export const BATTLE_HEARTBEAT_MS = 15000;
export const BATTLE_PRESENCE_STALE_MS = 45000;
export const BATTLE_STAKE_BULBS = 1;
export const BATTLE_MAX_ROOMS_PER_DAY = 30;
export const BATTLE_CODE_LENGTH = 8;

// No 0/o/1/l/i so a code read aloud is unambiguous.
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export type BattleRole = 'host' | 'guest';
export type BattleStatus = 'waiting' | 'playing' | 'finished' | 'closed';
export type BattlePhase = 'countdown' | 'question' | 'second_chance' | 'reveal';
export type BattleOutcome = 'host' | 'guest' | 'draw';
export type BattleEndReason = 'completed' | 'forfeit' | 'host_left';

export type BuzzRecord = {
  role: BattleRole;
  optionKey: string;
  correct: boolean;
  elapsedMs: number;
};

export type BattleScore = {
  hostScore: number;
  guestScore: number;
  hostCorrectMs: number;
  guestCorrectMs: number;
};

export type RoundPlay = {
  phase: 'question' | 'second_chance';
  phaseStartedAt: number;
  phaseEndsAt: number;
  correctOptionKey: string;
  first?: BuzzRecord;
};

export type BuzzRejection =
  | 'not_in_round'
  | 'too_late'
  | 'not_your_turn'
  | 'same_option';

export type BuzzResult =
  | {ok: false; reason: BuzzRejection}
  | {
      ok: true;
      record: BuzzRecord;
      // `second_chance` hands the question to the other player.
      next: 'second_chance' | 'reveal';
      winner: BattleRole | null;
    };

export function otherRole(role: BattleRole): BattleRole {
  return role === 'host' ? 'guest' : 'host';
}

export function roleOf(
  battle: {hostUserId: string; guestUserId?: string},
  userId: string | null,
): BattleRole | null {
  if (!userId) return null;
  if (battle.hostUserId === userId) return 'host';
  if (battle.guestUserId === userId) return 'guest';
  return null;
}

export function isPresent(seenAt: number | undefined, now: number): boolean {
  return seenAt !== undefined && now - seenAt <= BATTLE_PRESENCE_STALE_MS;
}

export function evaluateBuzz(
  round: RoundPlay,
  role: BattleRole,
  optionKey: string,
  now: number,
): BuzzResult {
  if (now > round.phaseEndsAt + BATTLE_BUZZ_GRACE_MS) {
    return {ok: false, reason: 'too_late'};
  }
  if (round.phase === 'second_chance') {
    if (!round.first || round.first.role === role) {
      return {ok: false, reason: 'not_your_turn'};
    }
    if (round.first.optionKey === optionKey) {
      return {ok: false, reason: 'same_option'};
    }
  } else if (round.first) {
    return {ok: false, reason: 'not_in_round'};
  }

  const correct = optionKey === round.correctOptionKey;
  const record: BuzzRecord = {
    role,
    optionKey,
    correct,
    elapsedMs: Math.max(0, Math.min(now, round.phaseEndsAt) - round.phaseStartedAt),
  };

  if (correct) return {ok: true, record, next: 'reveal', winner: role};
  if (round.phase === 'question') {
    return {ok: true, record, next: 'second_chance', winner: null};
  }
  return {ok: true, record, next: 'reveal', winner: null};
}

export function addPoint(
  score: BattleScore,
  winner: BattleRole | null,
  elapsedMs: number,
): BattleScore {
  if (winner === 'host') {
    return {
      ...score,
      hostScore: score.hostScore + 1,
      hostCorrectMs: score.hostCorrectMs + elapsedMs,
    };
  }
  if (winner === 'guest') {
    return {
      ...score,
      guestScore: score.guestScore + 1,
      guestCorrectMs: score.guestCorrectMs + elapsedMs,
    };
  }
  return score;
}

/** More points wins; on equal points the faster total answer time wins. */
export function decideOutcome(score: BattleScore): BattleOutcome {
  if (score.hostScore !== score.guestScore) {
    return score.hostScore > score.guestScore ? 'host' : 'guest';
  }
  if (score.hostScore === 0 || score.hostCorrectMs === score.guestCorrectMs) {
    return 'draw';
  }
  return score.hostCorrectMs < score.guestCorrectMs ? 'host' : 'guest';
}

/** Both stake one bulb; the winner takes the pot and a draw refunds. */
export function payout(outcome: BattleOutcome): Record<BattleRole, number> {
  const pot = BATTLE_STAKE_BULBS * 2;
  if (outcome === 'draw') {
    return {host: BATTLE_STAKE_BULBS, guest: BATTLE_STAKE_BULBS};
  }
  return outcome === 'host' ? {host: pot, guest: 0} : {host: 0, guest: pot};
}

export type JoinRejection =
  | 'not_found'
  | 'closed'
  | 'finished'
  | 'started'
  | 'full'
  | 'host_offline'
  | 'insufficient_bulbs';

export function checkJoin(
  battle: {
    status: BattleStatus;
    hostUserId: string;
    guestUserId?: string;
    hostSeenAt: number;
  } | null,
  userId: string,
  bulbCount: number,
  now: number,
): {ok: true; role: BattleRole} | {ok: false; reason: JoinRejection} {
  if (!battle) return {ok: false, reason: 'not_found'};
  const role = roleOf(battle, userId);
  // Participants can always reopen their own room to see where it stands.
  if (role) return {ok: true, role};
  if (battle.status === 'closed') return {ok: false, reason: 'closed'};
  if (battle.status === 'finished') return {ok: false, reason: 'finished'};
  if (battle.status === 'playing') return {ok: false, reason: 'started'};
  if (battle.guestUserId) return {ok: false, reason: 'full'};
  if (!isPresent(battle.hostSeenAt, now)) {
    return {ok: false, reason: 'host_offline'};
  }
  if (bulbCount < BATTLE_STAKE_BULBS) {
    return {ok: false, reason: 'insufficient_bulbs'};
  }
  return {ok: true, role: 'guest'};
}

export function generateBattleCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < BATTLE_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeBattleCode(code: string): string | null {
  const normalized = code.trim().toLowerCase();
  if (normalized.length !== BATTLE_CODE_LENGTH) return null;
  for (const char of normalized) {
    if (!CODE_ALPHABET.includes(char)) return null;
  }
  return normalized;
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
