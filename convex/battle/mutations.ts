import {getAuthUserId} from '@convex-dev/auth/server';
import {v} from 'convex/values';
import {internal} from '../_generated/api';
import {internalMutation, mutation} from '../_generated/server';
import type {Doc, Id} from '../_generated/dataModel';
import type {MutationCtx} from '../_generated/server';
import {
  BATTLE_JUDGE_MS,
  BATTLE_LAUNCH_MS,
  BATTLE_MAX_ROOMS_PER_DAY,
  BATTLE_PRESENCE_STALE_MS,
  BATTLE_REVEAL_MS,
  BATTLE_SECOND_CHANCE_MS,
  BATTLE_STAKE_BULBS,
  addPoint,
  checkJoin,
  evaluateBuzz,
  generateBattleCode,
  isPresent,
  judgeRound,
  normalizeBattleCode,
  otherRole,
  roleOf,
  type BattleRole,
  type JoinRejection,
} from './logic';
import {
  enterPhase,
  finishBattle,
  getBattleByCode,
  getProfile,
  getRound,
  startMatch,
  startRound,
} from './helpers';

const DAY_MS = 24 * 60 * 60 * 1000;

async function closeOpenRooms(
  ctx: MutationCtx,
  hostUserId: Id<'users'>,
  since: number,
): Promise<void> {
  const rooms = await ctx.db
    .query('battles')
    .withIndex('by_host_and_created', (q) =>
      q.eq('hostUserId', hostUserId).gte('createdAt', since),
    )
    .collect();
  for (const room of rooms) {
    if (room.status === 'waiting') {
      await ctx.db.patch(room._id, {status: 'closed', endReason: 'host_left'});
    }
  }
}

async function insertRoom(
  ctx: MutationCtx,
  hostUserId: Id<'users'>,
  now: number,
): Promise<string> {
  let code = generateBattleCode();
  while (await getBattleByCode(ctx, code)) code = generateBattleCode();
  await ctx.db.insert('battles', {
    code,
    status: 'waiting',
    hostUserId,
    hostReady: false,
    guestReady: false,
    hostSeenAt: now,
    createdAt: now,
    quizIds: [],
    currentIndex: 0,
    phaseVersion: 0,
    hostScore: 0,
    guestScore: 0,
    hostCorrectMs: 0,
    guestCorrectMs: 0,
  });
  return code;
}

type CreateRoomResult =
  | {ok: true; code: string; serverNow: number}
  | {
      ok: false;
      reason:
        | 'not_authenticated'
        | 'no_profile'
        | 'insufficient_bulbs'
        | 'daily_limit';
    };

async function createRoomFor(
  ctx: MutationCtx,
  userId: Id<'users'> | null,
): Promise<CreateRoomResult> {
  if (!userId) return {ok: false, reason: 'not_authenticated'};
  const profile = await getProfile(ctx, userId);
  if (!profile) return {ok: false, reason: 'no_profile'};
  if ((profile.bulbCount ?? 0) < BATTLE_STAKE_BULBS) {
    return {ok: false, reason: 'insufficient_bulbs'};
  }

  const now = Date.now();
  const createdToday = await ctx.db
    .query('battles')
    .withIndex('by_host_and_created', (q) =>
      q.eq('hostUserId', userId).gte('createdAt', now - DAY_MS),
    )
    .take(BATTLE_MAX_ROOMS_PER_DAY);
  if (createdToday.length >= BATTLE_MAX_ROOMS_PER_DAY) {
    return {ok: false, reason: 'daily_limit'};
  }

  // One open room per host: a new invite replaces the previous one.
  await closeOpenRooms(ctx, userId, now - DAY_MS);
  const code = await insertRoom(ctx, userId, now);
  return {ok: true, code, serverNow: now};
}

export const createRoom = mutation({
  args: {},
  handler: async (ctx): Promise<CreateRoomResult> => {
    return createRoomFor(ctx, await getAuthUserId(ctx));
  },
});

/**
 * Opens a new room from a finished one. The first player to ask hosts it;
 * the other sees the code on their result screen and joins.
 */
export const requestRematch = mutation({
  args: {code: v.string()},
  handler: async (
    ctx,
    {code},
  ): Promise<CreateRoomResult | {ok: false; reason: 'not_found'}> => {
    const userId = await getAuthUserId(ctx);
    const normalized = normalizeBattleCode(code);
    const battle = normalized ? await getBattleByCode(ctx, normalized) : null;
    if (!battle || battle.status !== 'finished' || !roleOf(battle, userId)) {
      return {ok: false, reason: 'not_found'};
    }
    if (battle.rematchCode) {
      const rematch = await getBattleByCode(ctx, battle.rematchCode);
      if (rematch?.status === 'waiting') {
        return {ok: true, code: rematch.code, serverNow: Date.now()};
      }
    }
    const result = await createRoomFor(ctx, userId);
    if (result.ok) await ctx.db.patch(battle._id, {rematchCode: result.code});
    return result;
  },
});

type JoinRoomResult =
  | {ok: true; role: BattleRole; serverNow: number}
  | {
      ok: false;
      reason:
        | 'not_authenticated'
        | 'no_profile'
        | 'invalid_code'
        | JoinRejection;
    };

export const joinRoom = mutation({
  args: {code: v.string()},
  handler: async (ctx, {code}): Promise<JoinRoomResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {ok: false, reason: 'not_authenticated'};
    const normalized = normalizeBattleCode(code);
    if (!normalized) return {ok: false, reason: 'invalid_code'};
    const profile = await getProfile(ctx, userId);
    if (!profile) return {ok: false, reason: 'no_profile'};

    const now = Date.now();
    const battle = await getBattleByCode(ctx, normalized);
    const check = checkJoin(battle, userId, profile.bulbCount ?? 0, now);
    if (!check.ok || !battle) {
      return {ok: false, reason: check.ok ? 'not_found' : check.reason};
    }

    if (battle.status === 'waiting') {
      await ctx.db.patch(
        battle._id,
        check.role === 'host'
          ? {hostSeenAt: now}
          : {
              guestUserId: userId,
              guestSeenAt: now,
              guestReady: false,
              launchAt: undefined,
            },
      );
    }
    return {ok: true, role: check.role, serverNow: now};
  },
});

/** The host removes the guest before the match; they cannot rejoin. */
export const kickGuest = mutation({
  args: {code: v.string()},
  handler: async (ctx, {code}): Promise<{ok: boolean}> => {
    const userId = await getAuthUserId(ctx);
    const battle = await getBattleByCode(ctx, code);
    if (
      !battle ||
      roleOf(battle, userId) !== 'host' ||
      battle.status !== 'waiting' ||
      !battle.guestUserId
    ) {
      return {ok: false};
    }
    await ctx.db.patch(battle._id, {
      guestUserId: undefined,
      guestSeenAt: undefined,
      guestReady: false,
      hostReady: false,
      launchAt: undefined,
      kickedUserIds: [...(battle.kickedUserIds ?? []), battle.guestUserId],
    });
    return {ok: true};
  },
});

/** Keeps the player marked present; the reply lets the client sync clocks. */
export const heartbeat = mutation({
  args: {code: v.string()},
  handler: async (ctx, {code}): Promise<{serverNow: number}> => {
    const now = Date.now();
    const userId = await getAuthUserId(ctx);
    const battle = await getBattleByCode(ctx, code);
    const role = battle ? roleOf(battle, userId) : null;
    if (battle && role && battle.status !== 'closed') {
      await ctx.db.patch(
        battle._id,
        role === 'host' ? {hostSeenAt: now} : {guestSeenAt: now},
      );
    }
    return {serverNow: now};
  },
});

type ReadyResult =
  | {ok: true; launching: boolean}
  | {
      ok: false;
      reason:
        | 'not_found'
        | 'not_waiting'
        | 'no_opponent'
        | 'opponent_offline'
        | 'insufficient_bulbs'
        | 'opponent_insufficient_bulbs';
    };

type LaunchCheck =
  | {
      ok: true;
      hostProfile: Doc<'userProfiles'>;
      guestProfile: Doc<'userProfiles'>;
    }
  | {ok: false; role: BattleRole; problem: 'offline' | 'bulbs'};

/** Both players must still be here and able to pay the stake. */
async function checkLaunch(
  ctx: MutationCtx,
  battle: Doc<'battles'>,
  now: number,
): Promise<LaunchCheck> {
  if (!isPresent(battle.hostSeenAt, now)) {
    return {ok: false, role: 'host', problem: 'offline'};
  }
  if (!isPresent(battle.guestSeenAt, now)) {
    return {ok: false, role: 'guest', problem: 'offline'};
  }
  const hostProfile = await getProfile(ctx, battle.hostUserId);
  if (!hostProfile || (hostProfile.bulbCount ?? 0) < BATTLE_STAKE_BULBS) {
    return {ok: false, role: 'host', problem: 'bulbs'};
  }
  const guestProfile = battle.guestUserId
    ? await getProfile(ctx, battle.guestUserId)
    : null;
  if (!guestProfile || (guestProfile.bulbCount ?? 0) < BATTLE_STAKE_BULBS) {
    return {ok: false, role: 'guest', problem: 'bulbs'};
  }
  return {ok: true, hostProfile, guestProfile};
}

/**
 * Once both are ready the lobby counts down, like a LAN game lobby; either
 * player can still back out by un-readying until it hits zero.
 */
export const setReady = mutation({
  args: {code: v.string(), ready: v.boolean()},
  handler: async (ctx, {code, ready}): Promise<ReadyResult> => {
    const userId = await getAuthUserId(ctx);
    const battle = await getBattleByCode(ctx, code);
    const role = battle ? roleOf(battle, userId) : null;
    if (!battle || !role) return {ok: false, reason: 'not_found'};
    if (battle.status !== 'waiting') return {ok: false, reason: 'not_waiting'};
    if (!battle.guestUserId) return {ok: false, reason: 'no_opponent'};

    const now = Date.now();
    const seen = role === 'host' ? {hostSeenAt: now} : {guestSeenAt: now};
    await ctx.db.patch(battle._id, {
      ...seen,
      ...(role === 'host' ? {hostReady: ready} : {guestReady: ready}),
      launchAt: undefined,
    });
    const otherReady = role === 'host' ? battle.guestReady : battle.hostReady;
    if (!ready || !otherReady) return {ok: true, launching: false};

    const fresh = await ctx.db.get(battle._id);
    if (!fresh) return {ok: false, reason: 'not_found'};
    const check = await checkLaunch(ctx, fresh, now);
    if (!check.ok) {
      if (check.problem === 'offline') {
        return {ok: false, reason: 'opponent_offline'};
      }
      await ctx.db.patch(
        battle._id,
        check.role === 'host' ? {hostReady: false} : {guestReady: false},
      );
      return {
        ok: false,
        reason:
          check.role === role ? 'insufficient_bulbs' : 'opponent_insufficient_bulbs',
      };
    }

    const launchAt = now + BATTLE_LAUNCH_MS;
    await ctx.db.patch(battle._id, {launchAt});
    await ctx.scheduler.runAt(launchAt, internal.battle.mutations.launch, {
      battleId: battle._id,
      launchAt,
    });
    return {ok: true, launching: true};
  },
});

/** The lobby countdown hit zero: start the match if nobody backed out. */
export const launch = internalMutation({
  args: {battleId: v.id('battles'), launchAt: v.number()},
  handler: async (ctx, {battleId, launchAt}) => {
    const battle = await ctx.db.get(battleId);
    if (
      !battle ||
      battle.status !== 'waiting' ||
      battle.launchAt !== launchAt ||
      !battle.hostReady ||
      !battle.guestReady
    ) {
      return;
    }
    const now = Date.now();
    const check = await checkLaunch(ctx, battle, now);
    if (!check.ok) {
      await ctx.db.patch(battle._id, {
        launchAt: undefined,
        ...(check.role === 'host' ? {hostReady: false} : {guestReady: false}),
      });
      return;
    }
    const started = await startMatch(
      ctx,
      battle,
      check.hostProfile,
      check.guestProfile,
      now,
    );
    if (started === 'no_quizzes') {
      await ctx.db.patch(battle._id, {
        launchAt: undefined,
        hostReady: false,
        guestReady: false,
      });
    }
  },
});

type BuzzMutationResult =
  | {ok: true; correct: boolean}
  | {
      ok: false;
      reason:
        | 'not_found'
        | 'not_playing'
        | 'not_in_round'
        | 'too_late'
        | 'not_your_turn'
        | 'same_option'
        | 'invalid_option';
    };

export const buzz = mutation({
  args: {code: v.string(), index: v.number(), optionKey: v.string()},
  handler: async (ctx, {code, index, optionKey}): Promise<BuzzMutationResult> => {
    const userId = await getAuthUserId(ctx);
    const battle = await getBattleByCode(ctx, code);
    const role = battle ? roleOf(battle, userId) : null;
    if (!battle || !role) return {ok: false, reason: 'not_found'};
    if (battle.status !== 'playing') return {ok: false, reason: 'not_playing'};
    if (
      battle.currentIndex !== index ||
      (battle.phase !== 'question' && battle.phase !== 'second_chance') ||
      battle.phaseStartedAt === undefined ||
      battle.phaseEndsAt === undefined
    ) {
      return {ok: false, reason: 'not_in_round'};
    }
    const round = await getRound(ctx, battle._id, index);
    if (!round) return {ok: false, reason: 'not_in_round'};
    if (!round.optionKeys.includes(optionKey)) {
      return {ok: false, reason: 'invalid_option'};
    }

    const now = Date.now();
    const result = evaluateBuzz(
      {
        phase: battle.phase,
        phaseStartedAt: battle.phaseStartedAt,
        phaseEndsAt: battle.phaseEndsAt,
        correctOptionKey: round.correctOptionKey,
        first: round.first,
      },
      role,
      optionKey,
      now,
    );
    if (!result.ok) return result;

    await ctx.db.patch(
      round._id,
      round.first ? {second: result.record} : {first: result.record},
    );
    // The verdict waits for the judging pause so both players see who
    // answered before anyone learns whether it was right.
    await enterPhase(ctx, battle, 'judging', BATTLE_JUDGE_MS, now);
    return {ok: true, correct: result.record.correct};
  },
});

/**
 * Leaving the lobby frees the seat (or closes the room for the host).
 * Leaving a running match forfeits it.
 */
export const leave = mutation({
  args: {code: v.string()},
  handler: async (ctx, {code}): Promise<{ok: boolean}> => {
    const userId = await getAuthUserId(ctx);
    const battle = await getBattleByCode(ctx, code);
    const role = battle ? roleOf(battle, userId) : null;
    if (!battle || !role) return {ok: false};
    const now = Date.now();

    if (battle.status === 'waiting') {
      if (role === 'host') {
        await ctx.db.patch(battle._id, {status: 'closed', endReason: 'host_left'});
      } else {
        await ctx.db.patch(battle._id, {
          guestUserId: undefined,
          guestSeenAt: undefined,
          guestReady: false,
          hostReady: false,
          launchAt: undefined,
        });
      }
      return {ok: true};
    }
    if (battle.status === 'playing') {
      await finishBattle(ctx, battle, otherRole(role), 'forfeit', now, role);
      return {ok: true};
    }
    return {ok: false};
  },
});

/** Scheduled at every phase deadline; stale versions are ignored. */
export const advance = internalMutation({
  args: {battleId: v.id('battles'), phaseVersion: v.number()},
  handler: async (ctx, {battleId, phaseVersion}) => {
    const battle = await ctx.db.get(battleId);
    if (
      !battle ||
      battle.status !== 'playing' ||
      battle.phaseVersion !== phaseVersion
    ) {
      return;
    }
    const now = Date.now();

    if (battle.phase === 'countdown') {
      await startRound(ctx, battle, 0, now);
      return;
    }
    if (battle.phase === 'judging') {
      const round = await getRound(ctx, battle._id, battle.currentIndex);
      const verdict = judgeRound(round ?? {});
      if (verdict.next === 'second_chance') {
        await enterPhase(ctx, battle, 'second_chance', BATTLE_SECOND_CHANCE_MS, now);
        return;
      }
      if (round) {
        await ctx.db.patch(round._id, {
          winner: verdict.winner ?? undefined,
          endedAt: now,
        });
      }
      const score = addPoint(battle, verdict.winner, verdict.elapsedMs);
      await enterPhase(ctx, battle, 'reveal', BATTLE_REVEAL_MS, now, score);
      return;
    }
    if (battle.phase === 'question' || battle.phase === 'second_chance') {
      // Nobody (else) answered in time: reveal with no point.
      const round = await getRound(ctx, battle._id, battle.currentIndex);
      if (round) await ctx.db.patch(round._id, {endedAt: now});
      await enterPhase(ctx, battle, 'reveal', BATTLE_REVEAL_MS, now);
      return;
    }
    // Reveal over: next question, or finish when none is left.
    await startRound(ctx, battle, battle.currentIndex + 1, now);
  },
});

/** Closes lobbies whose host stopped sending heartbeats (app killed). */
export const sweepStaleRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - BATTLE_PRESENCE_STALE_MS;
    const stale = await ctx.db
      .query('battles')
      .withIndex('by_status_and_host_seen', (q) =>
        q.eq('status', 'waiting').lt('hostSeenAt', cutoff),
      )
      .take(200);
    for (const battle of stale) {
      await ctx.db.patch(battle._id, {status: 'closed', endReason: 'host_left'});
    }
    return stale.length;
  },
});
