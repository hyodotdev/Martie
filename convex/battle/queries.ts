import {getAuthUserId} from '@convex-dev/auth/server';
import {paginationOptsValidator, type PaginationResult} from 'convex/server';
import {v} from 'convex/values';
import {query} from '../_generated/server';
import type {Doc, Id} from '../_generated/dataModel';
import type {QueryCtx} from '../_generated/server';
import {getQuizLanguageMap} from '../quizLanguage/helpers';
import {
  getBattleByCode,
  getBattleStats,
  getProfile,
  getRivalRecord,
  getRound,
} from './helpers';
import {
  BATTLE_STAKE_BULBS,
  normalizeBattleCode,
  otherRole,
  roleOf,
  type BattleRecord,
  type BattleRole,
  type BattleStatsRecord,
} from './logic';

const quizLanguageValidator = v.union(
  v.literal('en'),
  v.literal('ko'),
  v.literal('ja'),
);

type BattlePlayerView = {
  displayName: string;
  avatarUrl: string | null;
  ready: boolean;
  seenAt: number | undefined;
  record: BattleRecord;
};

const toRecord = (row: BattleRecord | null): BattleRecord => ({
  wins: row?.wins ?? 0,
  losses: row?.losses ?? 0,
  draws: row?.draws ?? 0,
});

async function avatarUrlOf(
  ctx: QueryCtx,
  profile: Doc<'userProfiles'> | null,
): Promise<string | null> {
  if (!profile?.avatarUrlId) return null;
  try {
    return await ctx.storage.getUrl(profile.avatarUrlId);
  } catch {
    return null;
  }
}

async function playerView(
  ctx: QueryCtx,
  userId: Id<'users'> | undefined,
  ready: boolean,
  seenAt: number | undefined,
): Promise<BattlePlayerView | null> {
  if (!userId) return null;
  const profile = await getProfile(ctx, userId);
  return {
    displayName: profile?.displayName ?? '',
    avatarUrl: await avatarUrlOf(ctx, profile),
    ready,
    seenAt,
    record: toRecord(await getBattleStats(ctx, userId)),
  };
}

// `correct` is null while that buzz is still being judged.
type BuzzView = {role: BattleRole; optionKey: string; correct: boolean | null};

export type BattleRoundView = {
  index: number;
  question: string;
  options: {key: string; description: string}[];
  first: BuzzView | null;
  second: BuzzView | null;
  winner: BattleRole | null;
  // Only once the round is over, so a client cannot read the answer early.
  correctOptionKey: string | null;
  answerDescription: string | null;
};

async function roundView(
  ctx: QueryCtx,
  battle: Doc<'battles'>,
  language: 'en' | 'ko' | 'ja',
): Promise<BattleRoundView | null> {
  if (
    battle.status !== 'playing' ||
    !battle.phase ||
    battle.phase === 'countdown'
  ) {
    return null;
  }
  const round = await getRound(ctx, battle._id, battle.currentIndex);
  const quiz = round ? await ctx.db.get(round.quizId) : null;
  if (!round || !quiz) return null;

  const langMap = await getQuizLanguageMap(
    ctx,
    [quiz.key, quiz.answerKey, ...round.optionKeys],
    language,
  );
  const revealed = battle.phase === 'reveal';
  const judging = battle.phase === 'judging';
  const pending = judging ? (round.second ?? round.first) : undefined;
  const toView = (buzz: Doc<'battleRounds'>['first']): BuzzView | null =>
    buzz
      ? {
          role: buzz.role,
          optionKey: buzz.optionKey,
          correct: buzz === pending ? null : buzz.correct,
        }
      : null;

  return {
    index: round.index,
    question: langMap.get(quiz.key) || quiz.key,
    options: round.optionKeys.map((key) => ({
      key,
      description: langMap.get(key) || key,
    })),
    first: toView(round.first),
    second: toView(round.second),
    winner: round.winner ?? null,
    correctOptionKey: revealed ? round.correctOptionKey : null,
    answerDescription: revealed ? langMap.get(quiz.answerKey) || null : null,
  };
}

export const getRoom = query({
  args: {code: v.string(), language: v.optional(quizLanguageValidator)},
  handler: async (ctx, {code, language = 'en'}) => {
    const normalized = normalizeBattleCode(code);
    const battle = normalized ? await getBattleByCode(ctx, normalized) : null;
    if (!battle) return null;
    const userId = await getAuthUserId(ctx).catch(() => null);
    const myRole = roleOf(battle, userId);
    const opponentUserId =
      myRole === null
        ? undefined
        : otherRole(myRole) === 'host'
          ? battle.hostUserId
          : battle.guestUserId;
    // My record against this opponent, from my side.
    const headToHead =
      userId && opponentUserId
        ? toRecord(await getRivalRecord(ctx, userId, opponentUserId))
        : null;

    return {
      code: battle.code,
      status: battle.status,
      myRole,
      kicked:
        myRole === null &&
        userId !== null &&
        (battle.kickedUserIds ?? []).includes(userId),
      headToHead,
      host: await playerView(
        ctx,
        battle.hostUserId,
        battle.hostReady,
        battle.hostSeenAt,
      ),
      guest: await playerView(
        ctx,
        battle.guestUserId,
        battle.guestReady,
        battle.guestSeenAt,
      ),
      stake: BATTLE_STAKE_BULBS,
      launchAt:
        battle.status === 'waiting' && battle.hostReady && battle.guestReady
          ? (battle.launchAt ?? null)
          : null,
      phase: battle.phase ?? null,
      phaseStartedAt: battle.phaseStartedAt ?? null,
      phaseEndsAt: battle.phaseEndsAt ?? null,
      currentIndex: battle.currentIndex,
      totalQuestions: battle.quizIds.length,
      hostScore: battle.hostScore,
      guestScore: battle.guestScore,
      outcome: battle.outcome ?? null,
      endReason: battle.endReason ?? null,
      forfeitedBy: battle.forfeitedBy ?? null,
      rematchCode: battle.rematchCode ?? null,
      round: await roundView(ctx, battle, language),
    };
  },
});

export type BattleHistoryItem = {
  _id: Id<'battlePlayers'>;
  code: string;
  createdAt: number;
  result: 'win' | 'loss' | 'draw' | null;
  myScore: number;
  opponentScore: number;
  opponentName: string;
};

export const listMyBattles = query({
  args: {paginationOpts: paginationOptsValidator},
  handler: async (
    ctx,
    {paginationOpts},
  ): Promise<PaginationResult<BattleHistoryItem>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {page: [], isDone: true, continueCursor: ''};

    const paginated = await ctx.db
      .query('battlePlayers')
      .withIndex('by_user_and_created', (q) => q.eq('userId', userId))
      .order('desc')
      .paginate(paginationOpts);

    const page = await Promise.all(
      paginated.page.map(async (player): Promise<BattleHistoryItem> => {
        const [battle, opponent] = await Promise.all([
          ctx.db.get(player.battleId),
          getProfile(ctx, player.opponentUserId),
        ]);
        return {
          _id: player._id,
          code: battle?.code ?? '',
          createdAt: player.createdAt,
          result: player.result ?? null,
          myScore: player.myScore ?? 0,
          opponentScore: player.opponentScore ?? 0,
          opponentName: opponent?.displayName ?? '',
        };
      }),
    );
    return {...paginated, page};
  },
});

export type BattleRivalItem = BattleRecord & {
  _id: Id<'battleRivals'>;
  opponentName: string;
  avatarUrl: string | null;
  lastPlayedAt: number;
};

/** Everyone I have played, most recent first, with my record against each. */
export const listMyRivals = query({
  args: {paginationOpts: paginationOptsValidator},
  handler: async (
    ctx,
    {paginationOpts},
  ): Promise<PaginationResult<BattleRivalItem>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {page: [], isDone: true, continueCursor: ''};

    const paginated = await ctx.db
      .query('battleRivals')
      .withIndex('by_user_and_last_played', (q) => q.eq('userId', userId))
      .order('desc')
      .paginate(paginationOpts);

    const page = await Promise.all(
      paginated.page.map(async (rival): Promise<BattleRivalItem> => {
        const profile = await getProfile(ctx, rival.opponentUserId);
        return {
          _id: rival._id,
          opponentName: profile?.displayName ?? '',
          avatarUrl: await avatarUrlOf(ctx, profile),
          ...toRecord(rival),
          lastPlayedAt: rival.lastPlayedAt,
        };
      }),
    );
    return {...paginated, page};
  },
});

export const getMyBattleStats = query({
  args: {},
  handler: async (ctx): Promise<BattleStatsRecord | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const stats = await getBattleStats(ctx, userId);
    return {
      ...toRecord(stats),
      streak: stats?.streak ?? 0,
      bestStreak: stats?.bestStreak ?? 0,
    };
  },
});
