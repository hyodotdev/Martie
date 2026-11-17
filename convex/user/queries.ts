import {query} from '../_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';

export const currentUser = query({
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      // 로그인되지 않은 경우 null 반환
      if (!userId) return null;

      const user = await ctx.db
        .query('users')
        .filter((q) => q.eq(q.field('_id'), userId))
        .first();

      // 사용자를 찾을 수 없는 경우 null 반환
      if (!user?.email) return null;

      const profile = await ctx.db
        .query('userProfiles')
        .withIndex('by_user', (q: any) => q.eq('userId', userId))
        .first();

      let avatarUrl: string | null = null;

      if (profile?.avatarUrlId) {
        try {
          avatarUrl = await ctx.storage.getUrl(profile.avatarUrlId);
        } catch (error) {
          console.error('Failed to fetch avatar URL:', error);
        }
      }

      return {
        ...user,
        level: profile?.level ?? 1,
        totalPoints: profile?.totalPoints ?? 0,
        displayName: profile?.displayName,
        deletedAt: profile?.deletedAt,
        avatarUrl,
        lastQuizCursor: profile?.lastQuizCursor,
        // Streak fields
        currentStreak: profile?.currentStreak ?? 0,
        longestStreak: profile?.longestStreak ?? 0,
        lastStreakDate: profile?.lastStreakDate,
        streakFreezeCount: profile?.streakFreezeCount ?? 0,
        // Feather
        featherCount: profile?.featherCount ?? 0,
      };
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      return null;
    }
  },
});

export const getUserCategories = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('_id'), userId))
      .first();

    if (!user?.email) throw new Error('User not found');

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first();

    return profile?.categoryIds || [];
  },
});

// Get user's bulb count from server
export const getBulbCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return null; // User not logged in
    }

    const userProfile = await ctx.db
      .query('userProfiles')
      .filter((q) => q.eq(q.field('userId'), userId))
      .first();

    return userProfile?.bulbCount ?? 0;
  },
});
