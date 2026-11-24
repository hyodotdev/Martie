import {internal} from '../_generated/api';
import type {Doc, Id} from '../_generated/dataModel';
import type {MutationCtx, QueryCtx} from '../_generated/server';
import {
  BATTLE_BUZZ_GRACE_MS,
  BATTLE_COUNTDOWN_MS,
  BATTLE_FIRST_BUZZ_MS,
  BATTLE_QUESTION_COUNT,
  BATTLE_STAKE_BULBS,
  EMPTY_BATTLE_STATS,
  applyResult,
  decideOutcome,
  payout,
  shuffle,
  type BattleEndReason,
  type BattleOutcome,
  type BattleRole,
} from './logic';

const MAX_BULB_COUNT = 9999;
// Categories sampled per match; each is read in full, like the daily quiz.
const CATEGORIES_PER_MATCH = 3;

export async function getProfile(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<Doc<'userProfiles'> | null> {
  const profile = await ctx.db
    .query('userProfiles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();
  return profile && !profile.deletedAt ? profile : null;
}

export async function getBattleByCode(
  ctx: QueryCtx,
  code: string,
): Promise<Doc<'battles'> | null> {
  return ctx.db
    .query('battles')
    .withIndex('by_code', (q) => q.eq('code', code))
    .first();
}

export function userIdOf(
  battle: Doc<'battles'>,
  role: BattleRole,
): Id<'users'> | undefined {
  return role === 'host' ? battle.hostUserId : battle.guestUserId;
}

async function pickQuizIds(ctx: MutationCtx): Promise<Id<'quizzes'>[]> {
  const categories = shuffle(await ctx.db.query('categories').collect()).slice(
    0,
    CATEGORIES_PER_MATCH,
  );
  const pools = await Promise.all(
    categories.map((category) =>
      ctx.db
        .query('quizzes')
        .withIndex('by_category', (q) => q.eq('categoryId', category._id))
        .collect(),
    ),
  );
  return shuffle(
    pools.flat().filter((quiz) => quiz.options.some((o) => o.isAnswer)),
  )
    .slice(0, BATTLE_QUESTION_COUNT)
    .map((quiz) => quiz._id);
}

async function schedulePhase(
  ctx: MutationCtx,
  battleId: Id<'battles'>,
  phaseEndsAt: number,
  phaseVersion: number,
): Promise<void> {
  await ctx.scheduler.runAt(phaseEndsAt, internal.battle.mutations.advance, {
    battleId,
    phaseVersion,
  });
}

/** Takes both stakes and starts the countdown. Caller checked both bulbs. */
export async function startMatch(
  ctx: MutationCtx,
  battle: Doc<'battles'>,
  hostProfile: Doc<'userProfiles'>,
  guestProfile: Doc<'userProfiles'>,
  now: number,
): Promise<'started' | 'no_quizzes'> {
  const quizIds = await pickQuizIds(ctx);
  if (quizIds.length === 0) return 'no_quizzes';

  for (const profile of [hostProfile, guestProfile]) {
    await ctx.db.patch(profile._id, {
      bulbCount: Math.max(0, (profile.bulbCount ?? 0) - BATTLE_STAKE_BULBS),
      updatedAt: new Date(now).toISOString(),
    });
  }

  const phaseVersion = battle.phaseVersion + 1;
  const phaseEndsAt = now + BATTLE_COUNTDOWN_MS;
  await ctx.db.patch(battle._id, {
    status: 'playing',
    quizIds,
    currentIndex: 0,
    phase: 'countdown',
    phaseStartedAt: now,
    phaseEndsAt,
    phaseVersion,
    startedAt: now,
  });

  const guestUserId = guestProfile.userId;
  await ctx.db.insert('battlePlayers', {
    battleId: battle._id,
    userId: battle.hostUserId,
    opponentUserId: guestUserId,
    role: 'host',
    createdAt: now,
  });
  await ctx.db.insert('battlePlayers', {
    battleId: battle._id,
    userId: guestUserId,
    opponentUserId: battle.hostUserId,
    role: 'guest',
    createdAt: now,
  });

  await schedulePhase(ctx, battle._id, phaseEndsAt, phaseVersion);
  return 'started';
}

/**
 * Opens question `index`, skipping quizzes deleted since the match began.
 * Finishes the match when no question is left.
 */
export async function startRound(
  ctx: MutationCtx,
  battle: Doc<'battles'>,
  index: number,
  now: number,
): Promise<void> {
  for (let i = index; i < battle.quizIds.length; i++) {
    const quiz = await ctx.db.get(battle.quizIds[i]);
    const correct = quiz?.options.find((option) => option.isAnswer);
    if (!quiz || !correct) continue;

    await ctx.db.insert('battleRounds', {
      battleId: battle._id,
      index: i,
      quizId: quiz._id,
      optionKeys: shuffle(quiz.options.map((option) => option.key)),
      correctOptionKey: correct.key,
      startedAt: now,
    });
    const phaseVersion = battle.phaseVersion + 1;
    const phaseEndsAt = now + BATTLE_FIRST_BUZZ_MS;
    await ctx.db.patch(battle._id, {
      currentIndex: i,
      phase: 'question',
      phaseStartedAt: now,
      phaseEndsAt,
      phaseVersion,
    });
    // Answers are accepted for a grace period after the deadline, so the
    // timeout must not close the question before that window ends.
    await schedulePhase(
      ctx,
      battle._id,
      phaseEndsAt + BATTLE_BUZZ_GRACE_MS,
      phaseVersion,
    );
    return;
  }

  const outcome = decideOutcome(battle);
  await finishBattle(ctx, battle, outcome, 'completed', now);
}

export async function enterPhase(
  ctx: MutationCtx,
  battle: Doc<'battles'>,
  phase: 'second_chance' | 'judging' | 'reveal',
  durationMs: number,
  now: number,
  extra: Partial<Doc<'battles'>> = {},
): Promise<void> {
  const phaseVersion = battle.phaseVersion + 1;
  const phaseEndsAt = now + durationMs;
  await ctx.db.patch(battle._id, {
    ...extra,
    phase,
    phaseStartedAt: now,
    phaseEndsAt,
    phaseVersion,
  });
  await schedulePhase(
    ctx,
    battle._id,
    phase === 'second_chance' ? phaseEndsAt + BATTLE_BUZZ_GRACE_MS : phaseEndsAt,
    phaseVersion,
  );
}

export async function getRound(
  ctx: QueryCtx,
  battleId: Id<'battles'>,
  index: number,
): Promise<Doc<'battleRounds'> | null> {
  return ctx.db
    .query('battleRounds')
    .withIndex('by_battle_and_index', (q) =>
      q.eq('battleId', battleId).eq('index', index),
    )
    .first();
}

export async function finishBattle(
  ctx: MutationCtx,
  battle: Doc<'battles'>,
  outcome: BattleOutcome,
  endReason: BattleEndReason,
  now: number,
  forfeitedBy?: BattleRole,
): Promise<void> {
  const bulbs = payout(outcome);
  for (const role of ['host', 'guest'] as const) {
    const userId = userIdOf(battle, role);
    if (!userId || bulbs[role] === 0) continue;
    const profile = await getProfile(ctx, userId);
    if (!profile) continue;
    await ctx.db.patch(profile._id, {
      bulbCount: Math.min(MAX_BULB_COUNT, (profile.bulbCount ?? 0) + bulbs[role]),
      updatedAt: new Date(now).toISOString(),
    });
  }

  const players = await ctx.db
    .query('battlePlayers')
    .withIndex('by_battle', (q) => q.eq('battleId', battle._id))
    .collect();
  for (const player of players) {
    const myScore = player.role === 'host' ? battle.hostScore : battle.guestScore;
    const opponentScore =
      player.role === 'host' ? battle.guestScore : battle.hostScore;
    const result =
      outcome === 'draw' ? 'draw' : outcome === player.role ? 'win' : 'loss';
    await ctx.db.patch(player._id, {result, myScore, opponentScore});
    await recordResult(ctx, player.userId, player.opponentUserId, result, now);
  }

  await ctx.db.patch(battle._id, {
    status: 'finished',
    outcome,
    endReason,
    forfeitedBy,
    finishedAt: now,
    phase: undefined,
    phaseStartedAt: undefined,
    phaseEndsAt: undefined,
    phaseVersion: battle.phaseVersion + 1,
  });
}

export async function getBattleStats(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<Doc<'battleStats'> | null> {
  return ctx.db
    .query('battleStats')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();
}

export async function getRivalRecord(
  ctx: QueryCtx,
  userId: Id<'users'>,
  opponentUserId: Id<'users'>,
): Promise<Doc<'battleRivals'> | null> {
  return ctx.db
    .query('battleRivals')
    .withIndex('by_user_and_opponent', (q) =>
      q.eq('userId', userId).eq('opponentUserId', opponentUserId),
    )
    .first();
}

/** Adds a finished match to the player's lifetime and head-to-head records. */
async function recordResult(
  ctx: MutationCtx,
  userId: Id<'users'>,
  opponentUserId: Id<'users'>,
  result: 'win' | 'loss' | 'draw',
  now: number,
): Promise<void> {
  const stats = await getBattleStats(ctx, userId);
  const nextStats = applyResult(
    {
      wins: stats?.wins ?? EMPTY_BATTLE_STATS.wins,
      losses: stats?.losses ?? EMPTY_BATTLE_STATS.losses,
      draws: stats?.draws ?? EMPTY_BATTLE_STATS.draws,
      streak: stats?.streak ?? EMPTY_BATTLE_STATS.streak,
      bestStreak: stats?.bestStreak ?? EMPTY_BATTLE_STATS.bestStreak,
    },
    result,
  );
  if (stats) {
    await ctx.db.patch(stats._id, {...nextStats, updatedAt: now});
  } else {
    await ctx.db.insert('battleStats', {userId, ...nextStats, updatedAt: now});
  }

  const rival = await getRivalRecord(ctx, userId, opponentUserId);
  const nextRival = applyResult(
    {
      wins: rival?.wins ?? 0,
      losses: rival?.losses ?? 0,
      draws: rival?.draws ?? 0,
    },
    result,
  );
  if (rival) {
    await ctx.db.patch(rival._id, {...nextRival, lastPlayedAt: now});
  } else {
    await ctx.db.insert('battleRivals', {
      userId,
      opponentUserId,
      ...nextRival,
      lastPlayedAt: now,
    });
  }
}
