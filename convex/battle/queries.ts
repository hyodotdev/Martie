import {getAuthUserId} from '@convex-dev/auth/server';
import {paginationOptsValidator, type PaginationResult} from 'convex/server';
import {v} from 'convex/values';
import {query} from '../_generated/server';
import type {Doc, Id} from '../_generated/dataModel';
import type {QueryCtx} from '../_generated/server';
import {getQuizLanguageMap} from '../quizLanguage/helpers';
import {getBattleByCode, getProfile, getRound} from './helpers';
import {
  BATTLE_STAKE_BULBS,
  normalizeBattleCode,
  roleOf,
  type BattleRole,
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
};

async function playerView(
  ctx: QueryCtx,
  userId: Id<'users'> | undefined,
  ready: boolean,
  seenAt: number | undefined,
): Promise<BattlePlayerView | null> {
  if (!userId) return null;
  const profile = await getProfile(ctx, userId);
  let avatarUrl: string | null = null;
  if (profile?.avatarUrlId) {
    try {
      avatarUrl = await ctx.storage.getUrl(profile.avatarUrlId);
    } catch {}
  }
  return {
    displayName: profile?.displayName ?? '',
    avatarUrl,
    ready,
    seenAt,
  };
}

type BuzzView = {role: BattleRole; optionKey: string; correct: boolean};

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
  const toView = (buzz: Doc<'battleRounds'>['first']): BuzzView | null =>
    buzz ? {role: buzz.role, optionKey: buzz.optionKey, correct: buzz.correct} : null;

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

    return {
      code: battle.code,
      status: battle.status,
      myRole: roleOf(battle, userId),
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
