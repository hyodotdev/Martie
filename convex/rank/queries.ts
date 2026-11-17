import {paginationOptsValidator} from 'convex/server';
import {query} from '../_generated/server';
import {v} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';
import {Doc} from '../_generated/dataModel';

type RankDoc = Doc<'ranks'>;
type UserProfileDoc = Doc<'userProfiles'>;

// Rank lists are public. Only expose fields that are already visible in the
// app; never return the whole profile (email, bulbs, referral code, ...).
type PublicRankUser = Pick<
  UserProfileDoc,
  'displayName' | 'level' | 'hasCertifiedBadge'
>;

interface RankWithUser extends RankDoc {
  user: PublicRankUser | null;
  position: number;
}

const MAX_TOP_RANKS = 100;

const toPublicRankUser = (
  profile: UserProfileDoc | null,
): PublicRankUser | null =>
  profile
    ? {
        displayName: profile.displayName,
        level: profile.level,
        hasCertifiedBadge: profile.hasCertifiedBadge,
      }
    : null;

export const getPaginatedRanks = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, {paginationOpts}) => {
    const ranksResult = await ctx.db
      .query('ranks')
      .withIndex('by_correctCount')
      .order('desc')
      .paginate(paginationOpts);

    const users = await Promise.all(
      ranksResult.page.map((rank: RankDoc) =>
        ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', rank.userId))
          .first(),
      ),
    );

    return {
      ...ranksResult,
      page: ranksResult.page.map((rank: RankDoc, i: number) => ({
        ...rank,
        user: toPublicRankUser(users[i]),
      })),
    };
  },
});

export const getMyRank = query({
  handler: async (ctx): Promise<RankWithUser | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const myRank = await ctx.db
      .query('ranks')
      .withIndex('by_userId')
      .filter((q) => q.eq(q.field('userId'), userId))
      .first();

    if (!myRank) return null;

    const user = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    const betterRanks = await ctx.db
      .query('ranks')
      .withIndex('by_correctCount', (q) =>
        q.gt('correctCount', myRank.correctCount),
      )
      .collect();

    return {
      ...myRank,
      user: toPublicRankUser(user),
      position: betterRanks.length + 1,
    };
  },
});

export const getTopRanks = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, {limit}) => {
    const ranks = await ctx.db
      .query('ranks')
      .withIndex('by_correctCount')
      .order('desc')
      .take(Math.max(0, Math.min(Math.floor(limit), MAX_TOP_RANKS)));

    const users = await Promise.all(
      ranks.map((rank: RankDoc) =>
        ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', rank.userId))
          .first(),
      ),
    );

    return ranks.map((rank: RankDoc, i: number) => ({
      ...rank,
      user: toPublicRankUser(users[i]),
      position: i + 1,
    }));
  },
});
