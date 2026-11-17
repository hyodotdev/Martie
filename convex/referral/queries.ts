import {query} from '../_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';

export const getMyReferralInfo = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (!profile) return null;

    return {
      referralCode: profile.referralCode ?? null,
      referralCount: profile.referralCount ?? 0,
      referredBy: profile.referredBy ?? null,
    };
  },
});
