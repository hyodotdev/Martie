import {
  BATTLE_BUZZ_GRACE_MS,
  BATTLE_CODE_LENGTH,
  BATTLE_PRESENCE_STALE_MS,
  addPoint,
  applyResult,
  checkJoin,
  decideOutcome,
  evaluateBuzz,
  generateBattleCode,
  isPresent,
  judgeRound,
  normalizeBattleCode,
  payout,
  roleOf,
  shuffle,
  type RoundPlay,
  winRate,
} from '../../../convex/battle/logic';

const round = (overrides: Partial<RoundPlay> = {}): RoundPlay => ({
  phase: 'question',
  phaseStartedAt: 1000,
  phaseEndsAt: 16000,
  correctOptionKey: 'right',
  ...overrides,
});

describe('evaluateBuzz', () => {
  it('a correct first answer wins the question with the time it took', () => {
    expect(evaluateBuzz(round(), 'host', 'right', 4000)).toEqual({
      ok: true,
      record: {role: 'host', optionKey: 'right', correct: true, elapsedMs: 3000},
      next: 'reveal',
      winner: 'host',
    });
  });

  it('a wrong first answer hands the question to the other player', () => {
    const result = evaluateBuzz(round(), 'guest', 'wrong', 2000);
    expect(result).toMatchObject({ok: true, next: 'second_chance', winner: null});
  });

  it('only the other player may answer the second chance', () => {
    const first = {role: 'host' as const, optionKey: 'wrong', correct: false, elapsedMs: 1};
    const second = round({phase: 'second_chance', first});
    expect(evaluateBuzz(second, 'host', 'right', 2000)).toEqual({
      ok: false,
      reason: 'not_your_turn',
    });
    expect(evaluateBuzz(second, 'guest', 'wrong', 2000)).toEqual({
      ok: false,
      reason: 'same_option',
    });
    expect(evaluateBuzz(second, 'guest', 'right', 2000)).toMatchObject({
      ok: true,
      winner: 'guest',
      next: 'reveal',
    });
  });

  it('a wrong second chance reveals the answer with no point', () => {
    const first = {role: 'host' as const, optionKey: 'a', correct: false, elapsedMs: 1};
    expect(
      evaluateBuzz(round({phase: 'second_chance', first}), 'guest', 'b', 2000),
    ).toMatchObject({ok: true, next: 'reveal', winner: null});
  });

  it('rejects a second first-answer and answers after the grace period', () => {
    const first = {role: 'host' as const, optionKey: 'a', correct: false, elapsedMs: 1};
    expect(evaluateBuzz(round({first}), 'guest', 'right', 2000)).toEqual({
      ok: false,
      reason: 'not_in_round',
    });
    expect(
      evaluateBuzz(round(), 'host', 'right', 16000 + BATTLE_BUZZ_GRACE_MS + 1),
    ).toEqual({ok: false, reason: 'too_late'});
  });

  it('caps the measured time at the deadline inside the grace period', () => {
    const result = evaluateBuzz(round(), 'host', 'right', 16200);
    expect(result).toMatchObject({record: {elapsedMs: 15000}});
  });
});

describe('judgeRound', () => {
  const buzz = (role: 'host' | 'guest', correct: boolean, elapsedMs = 1000) => ({
    role,
    optionKey: 'x',
    correct,
    elapsedMs,
  });

  it('awards a right first buzz', () => {
    expect(judgeRound({first: buzz('host', true, 1200)})).toEqual({
      next: 'reveal',
      winner: 'host',
      elapsedMs: 1200,
    });
  });

  it('hands a wrong first buzz to the other player', () => {
    expect(judgeRound({first: buzz('host', false)})).toEqual({
      next: 'second_chance',
    });
  });

  it('awards a right second chance and reveals a double miss', () => {
    expect(
      judgeRound({first: buzz('host', false), second: buzz('guest', true, 800)}),
    ).toEqual({next: 'reveal', winner: 'guest', elapsedMs: 800});
    expect(
      judgeRound({first: buzz('host', false), second: buzz('guest', false)}),
    ).toEqual({next: 'reveal', winner: null, elapsedMs: 0});
  });
});

describe('scoring', () => {
  const zero = {hostScore: 0, guestScore: 0, hostCorrectMs: 0, guestCorrectMs: 0};

  it('adds a point and the answer time to the winner only', () => {
    expect(addPoint(zero, 'guest', 1200)).toEqual({...zero, guestScore: 1, guestCorrectMs: 1200});
    expect(addPoint(zero, null, 1200)).toBe(zero);
  });

  it('more points wins, then the faster total, else a draw', () => {
    expect(decideOutcome({...zero, hostScore: 3, guestScore: 2})).toBe('host');
    expect(
      decideOutcome({hostScore: 2, guestScore: 2, hostCorrectMs: 9000, guestCorrectMs: 4000}),
    ).toBe('guest');
    expect(
      decideOutcome({hostScore: 2, guestScore: 2, hostCorrectMs: 4000, guestCorrectMs: 4000}),
    ).toBe('draw');
    expect(decideOutcome(zero)).toBe('draw');
  });

  it('the winner takes both stakes and a draw refunds each', () => {
    expect(payout('host')).toEqual({host: 2, guest: 0});
    expect(payout('guest')).toEqual({host: 0, guest: 2});
    expect(payout('draw')).toEqual({host: 1, guest: 1});
  });
});

describe('records', () => {
  it('counts results and tracks the win streak', () => {
    let stats = {wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0};
    for (const result of ['win', 'win', 'loss', 'win'] as const) {
      stats = applyResult(stats, result);
    }
    expect(stats).toEqual({wins: 3, losses: 1, draws: 0, streak: 1, bestStreak: 2});
    expect(applyResult(stats, 'draw')).toMatchObject({draws: 1, streak: 0});
  });

  it('leaves records without a streak alone', () => {
    expect(applyResult({wins: 1, losses: 0, draws: 0}, 'loss')).toEqual({
      wins: 1,
      losses: 1,
      draws: 0,
    });
  });

  it('rounds the win rate and has none before a match', () => {
    expect(winRate({wins: 2, losses: 1, draws: 0})).toBe(67);
    expect(winRate({wins: 0, losses: 0, draws: 0})).toBeNull();
  });
});

describe('checkJoin', () => {
  const now = 100_000;
  const open = {status: 'waiting' as const, hostUserId: 'h', hostSeenAt: now};

  it('seats a new player with a bulb in an open room', () => {
    expect(checkJoin(open, 'g', 1, now)).toEqual({ok: true, role: 'guest'});
  });

  it('lets participants back in whatever the state', () => {
    expect(checkJoin({...open, status: 'finished'}, 'h', 0, now)).toEqual({
      ok: true,
      role: 'host',
    });
  });

  it.each([
    [null, 'not_found'],
    [{...open, status: 'closed' as const}, 'closed'],
    [{...open, status: 'finished' as const}, 'finished'],
    [{...open, status: 'playing' as const}, 'started'],
    [{...open, guestUserId: 'x'}, 'full'],
    [{...open, hostSeenAt: now - BATTLE_PRESENCE_STALE_MS - 1}, 'host_offline'],
  ])('rejects %#', (battle, reason) => {
    expect(checkJoin(battle, 'g', 5, now)).toEqual({ok: false, reason});
  });

  it('needs a bulb to stake', () => {
    expect(checkJoin(open, 'g', 0, now)).toEqual({
      ok: false,
      reason: 'insufficient_bulbs',
    });
  });
});

describe('helpers', () => {
  it('roleOf and isPresent', () => {
    const battle = {hostUserId: 'h', guestUserId: 'g'};
    expect(roleOf(battle, 'h')).toBe('host');
    expect(roleOf(battle, 'g')).toBe('guest');
    expect(roleOf(battle, 'x')).toBeNull();
    expect(roleOf(battle, null)).toBeNull();
    expect(isPresent(undefined, 0)).toBe(false);
    expect(isPresent(0, BATTLE_PRESENCE_STALE_MS)).toBe(true);
  });

  it('codes are unambiguous and normalize back', () => {
    const code = generateBattleCode();
    expect(code).toHaveLength(BATTLE_CODE_LENGTH);
    expect(code).not.toMatch(/[01ilo]/);
    expect(normalizeBattleCode(` ${code.toUpperCase()} `)).toBe(code);
    expect(normalizeBattleCode('short')).toBeNull();
    expect(normalizeBattleCode('abcdefg0')).toBeNull();
  });

  it('shuffle keeps every item', () => {
    const items = [1, 2, 3, 4, 5];
    expect(shuffle(items).sort()).toEqual(items);
    expect(shuffle(items, () => 0)).toEqual([2, 3, 4, 5, 1]);
  });
});
