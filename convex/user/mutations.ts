import {mutation} from '../_generated/server';
import type {MutationCtx} from '../_generated/server';
import {ConvexError, v} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';
import {v4 as uuidv4} from 'uuid';
import type {Doc, Id} from '../_generated/dataModel';
import {isLevelPlayGrantMode} from '../utils/levelPlay';

//* 아래 함수는 서버랑 클라이언트 각각 중복으로 구현되어 있습니다.
// Generate level thresholds with exponential growth
// Starting with 100, with differences of 200, 400, 800, 1600, etc.
const generateLevelThresholds = (maxLevel: number = 10): number[] => {
  const thresholds: number[] = [];
  let currentThreshold = 100; // First threshold (Level 1 -> 2)
  let currentDifference = 200; // Initial difference for next level

  thresholds.push(currentThreshold);

  for (let i = 1; i < maxLevel - 1; i++) {
    currentThreshold += currentDifference;
    thresholds.push(currentThreshold);
    currentDifference *= 2; // Double the difference for next level
  }

  return thresholds;
};

// Level threshold points with exponential growth
const LEVEL_THRESHOLDS = generateLevelThresholds();
// [100, 300, 700, 1500, 3100, 6300, 12700, 25500, 51100]

function normalizeProfileEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function normalizeExistingProfileEmail(
  ctx: MutationCtx,
  profile: Doc<'userProfiles'>,
): Promise<Doc<'userProfiles'>> {
  const email = normalizeProfileEmail(profile.email);
  if (profile.email === email) return profile;

  await ctx.db.patch(profile._id, {email});
  return {...profile, email};
}

async function generateUniqueNickname(ctx: MutationCtx): Promise<string> {
  while (true) {
    const nickname = 'User_' + uuidv4().split('-')[0];
    const existingProfile = await ctx.db
      .query('userProfiles')
      .filter((q) => q.eq(q.field('displayName'), nickname))
      .first();
    if (!existingProfile) {
      return nickname;
    }
  }
}

async function ensureUserProfile(
  ctx: MutationCtx,
  userId: Id<'users'>,
  emailHint?: string,
): Promise<Doc<'userProfiles'>> {
  const {profile} = await ensureUserProfileWithMeta(ctx, userId, emailHint);
  return profile;
}

/**
 * Same as `ensureUserProfile` but also returns whether the profile was
 * freshly inserted in this call. Used by `createUserProfile` so the client
 * can fire `signup_completed` only on actual new accounts (not on existing
 * users logging in from a new device).
 */
async function ensureUserProfileWithMeta(
  ctx: MutationCtx,
  userId: Id<'users'>,
  emailHint?: string,
): Promise<{profile: Doc<'userProfiles'>; isNew: boolean}> {
  const existingByUser = await ctx.db
    .query('userProfiles')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .first();

  if (existingByUser) {
    const profile = await normalizeExistingProfileEmail(ctx, existingByUser);
    return {profile, isNew: false};
  }

  const userDoc = await ctx.db.get(userId);

  const emailSource = emailHint ?? (userDoc?.email as string | undefined);
  if (!emailSource) {
    throw new Error('User email not found while ensuring profile');
  }
  const rawEmail = emailSource.trim();
  const email = normalizeProfileEmail(rawEmail);

  let existingByEmail = await ctx.db
    .query('userProfiles')
    .withIndex('by_email', (q: any) => q.eq('email', email))
    .first();

  if (!existingByEmail && rawEmail !== email) {
    existingByEmail = await ctx.db
      .query('userProfiles')
      .withIndex('by_email', (q: any) => q.eq('email', rawEmail))
      .first();
  }

  if (existingByEmail) {
    const normalizedProfile = await normalizeExistingProfileEmail(
      ctx,
      existingByEmail as Doc<'userProfiles'>,
    );

    if (normalizedProfile.userId !== userId) {
      await ctx.db.patch(normalizedProfile._id, {userId});
      return {
        profile: {...normalizedProfile, userId},
        isNew: false,
      };
    }
    return {profile: normalizedProfile, isNew: false};
  }

  const profileId = await ctx.db.insert('userProfiles', {
    email,
    userId,
    displayName: await generateUniqueNickname(ctx),
    level: 1,
    totalPoints: 0,
    bulbCount: 2,
  });

  const created = await ctx.db.get(profileId);
  if (!created) {
    throw new Error('Failed to create user profile');
  }
  return {profile: created, isNew: true};
}

export const updateProfile = mutation({
  args: v.object({
    displayName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    description: v.optional(v.string()),
    avatarUrlId: v.optional(v.id('_storage')),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error('Called updateProfile without authentication present');
    }

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('_id'), userId))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    const profile = await ensureUserProfile(ctx, userId, user.email as string);

    if (args.displayName) {
      const existingProfile = await ctx.db
        .query('userProfiles')
        .filter((q) => q.and(q.eq(q.field('displayName'), args.displayName)))
        .first();

      if (existingProfile && existingProfile._id !== profile?._id) {
        throw new Error('This display name is already taken.');
      }
    }

    const profileData = {
      ...args,
      userId,
      email: normalizeProfileEmail(user.email as string),
      displayName: args.displayName ?? profile?.displayName ?? '',
      level: profile?.level ?? 1, // 기존 레벨 유지 또는 초기값 설정
      totalPoints: profile?.totalPoints ?? 0, // 기존 퀴즈 수 유지 또는 초기값 설정
    } as Doc<'userProfiles'>;

    await ctx.db.patch(profile._id, profileData);
    return profile._id;
  },
});

export const createUserProfile = mutation({
  // `email` is accepted for older clients but ignored: the profile is always
  // resolved from the authenticated user's verified email, never from args.
  args: v.object({email: v.optional(v.string())}),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Return shape changed in PMF #70: caller needs `isNew` to gate
    // `signup_completed` analytics. Existing users signing in on a new
    // device must not be counted as a new acquisition.
    const {profile, isNew} = await ensureUserProfileWithMeta(ctx, userId);
    return {...profile, isNew};
  },
});

export const deleteAccount = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      throw new Error('Called currentUser without authentication present');

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('_id'), userId))
      .first();

    if (!user?.email) throw new Error('User not found in identity');

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first();

    if (!profile) {
      throw new Error('User profile not found');
    }

    await ctx.db.patch(profile._id, {deletedAt: new Date().toISOString()});

    return {success: true};
  },
});

export const checkIsDeletedUser = mutation({
  args: v.object({email: v.string()}),
  handler: async (ctx, args) => {
    const rawEmail = args.email.trim();
    const candidateEmails = [
      ...new Set([rawEmail, normalizeProfileEmail(rawEmail)].filter(Boolean)),
    ];

    const profiles = await Promise.all(
      candidateEmails.map((email) =>
        ctx.db
          .query('userProfiles')
          .withIndex('by_email', (q: any) => q.eq('email', email))
          .first(),
      ),
    );

    return {isDeleted: profiles.some((profile) => !!profile?.deletedAt)};
  },
});

export const updateUserLevel = mutation({
  // `totalPoints` is accepted from older clients but ignored: points come from
  // the quiz results the server graded since the last level update.
  args: {
    totalPoints: v.optional(v.number()),
  },
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const userProfile = await ensureUserProfile(ctx, userId);

    const sessionResults = await ctx.db
      .query('quizResults')
      .withIndex('by_user_and_date', (q) =>
        userProfile.lastPointsSyncAt
          ? q.eq('userId', userId).gt('createdAt', userProfile.lastPointsSyncAt)
          : q.eq('userId', userId),
      )
      .order('desc')
      .filter((q) => q.neq(q.field('isDaily'), true))
      .take(QUIZ_SESSION_LIMIT);
    const sessionPoints = sessionResults.length
      ? Math.round(
          (sessionResults.filter((r) => r.isCorrect).length /
            sessionResults.length) *
            100,
        )
      : 0;
    const currentTotalPoints = userProfile.totalPoints ?? 0;
    const newTotalPoints = currentTotalPoints + sessionPoints;
    const currentLevel = userProfile.level ?? 1;

    // 각 레벨업에 필요한 누적 포인트 - 생성된 레벨 임계값 사용
    const levelThresholds = LEVEL_THRESHOLDS;

    // 새로운 레벨 계산
    let newLevel = currentLevel;
    for (let i = 0; i < levelThresholds.length; i++) {
      if (newTotalPoints >= levelThresholds[i]) {
        newLevel = i + 2; // i는 0부터 시작하므로 +2
      } else {
        break;
      }
    }

    // 업데이트
    await ctx.db.patch(userProfile._id, {
      level: newLevel,
      totalPoints: newTotalPoints,
      lastPointsSyncAt: new Date().toISOString(),
    });

    // 레벨업 시 리그 XP +15
    const didLevelUp = newLevel > currentLevel;
    if (didLevelUp) {
      const league = await ctx.db
        .query('leagues')
        .withIndex('by_userId', (q: any) => q.eq('userId', userId))
        .first();

      if (league) {
        const now = new Date();
        const day = now.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() + diff);
        const weekStart = monday.toISOString().split('T')[0];

        if (league.weekStart !== weekStart) {
          await ctx.db.patch(league._id, {weeklyXp: 15, weekStart});
        } else {
          await ctx.db.patch(league._id, {
            weeklyXp: league.weeklyXp + 15,
          });
        }
      }
    }

    return {
      newLevel: newLevel,
      totalPoints: newTotalPoints,
      levelUp: didLevelUp,
    };
  },
});

export const updateLastUserCursor = mutation({
  args: v.object({quidId: v.id('quizzes')}),
  handler: async (ctx, {quidId}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const quiz = await ctx.db
      .query('quizzes')
      .filter((q) => q.eq(q.field('_id'), quidId))
      .first();

    const userProfile = await ensureUserProfile(ctx, userId);
    if (!quiz) return;

    // Make sure quiz.key exists and is different from current cursor before updating
    if (quiz.key && quiz.key !== userProfile.lastQuizCursor) {
      await ctx.db.patch(userProfile._id, {lastQuizCursor: quiz.key});
    }
  },
});

const MAX_BULB_COUNT = 9999;
const MAX_GUEST_BULB_SYNC = 300;
const QUIZ_SESSION_LIMIT = 10;
const DAILY_CHECK_IN_BULBS = 3;
const RECHARGE_BULBS = 2;
// Free recharges (no ad available, no ad consent, web) per UTC day. Verified
// LevelPlay rewards arrive through the server callback instead.
export const MAX_RECHARGES_PER_DAY = 10;

const toNonNegativeInt = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const utcDay = (): string => new Date().toISOString().slice(0, 10);

const isPremiumActive = (profile: Doc<'userProfiles'>): boolean =>
  !!profile.isPremium &&
  (!profile.premiumExpiration || profile.premiumExpiration > Date.now());

// Clients can only spend bulbs or lower their balance. Every grant goes
// through a server-side rule (check-in, recharge, verified purchase).
export const updateBulbCount = mutation({
  args: v.object({
    count: v.number(),
    operation: v.union(
      v.literal('set'),
      v.literal('add'),
      v.literal('subtract'),
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error('Called updateBulbCount without authentication present');
    }

    if (args.operation === 'add') {
      throw new ConvexError('Bulbs are granted by the server');
    }

    const userProfile = await ensureUserProfile(ctx, userId);
    const currentBulbCount = userProfile.bulbCount ?? 0;
    const count = toNonNegativeInt(args.count);
    const newBulbCount =
      args.operation === 'set'
        ? Math.min(currentBulbCount, count)
        : Math.max(0, currentBulbCount - count);

    await ctx.db.patch(userProfile._id, {
      bulbCount: newBulbCount,
      updatedAt: new Date().toISOString(),
    });

    return newBulbCount;
  },
});

// Once per UTC day, free players get a few bulbs for opening the app.
export const claimDailyCheckIn = mutation({
  args: {},
  returns: v.object({granted: v.number(), bulbCount: v.number()}),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Sign in to claim the daily check-in');

    const profile = await ensureUserProfile(ctx, userId);
    const bulbCount = profile.bulbCount ?? 0;
    const today = utcDay();
    if (profile.lastCheckInDate === today || isPremiumActive(profile)) {
      return {granted: 0, bulbCount};
    }

    const granted = Math.max(
      0,
      Math.min(DAILY_CHECK_IN_BULBS, MAX_BULB_COUNT - bulbCount),
    );
    await ctx.db.patch(profile._id, {
      bulbCount: bulbCount + granted,
      lastCheckInDate: today,
      updatedAt: new Date().toISOString(),
    });
    return {granted, bulbCount: bulbCount + granted};
  },
});

// Recharge after a rewarded ad flow. When LevelPlay server callbacks are
// configured, a completed ad is granted by the callback (`adReward.ts`) and
// this returns `pending`. Free recharges (no fill, no consent, web) are
// limited per UTC day.
export const claimRechargeBulbs = mutation({
  args: {
    reason: v.union(
      v.literal('completed'),
      v.literal('unavailable'),
      v.literal('consent_unavailable'),
      v.literal('web'),
    ),
  },
  returns: v.object({
    granted: v.number(),
    pending: v.boolean(),
    bulbCount: v.number(),
  }),
  handler: async (ctx, {reason}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Sign in to recharge bulbs');

    const profile = await ensureUserProfile(ctx, userId);
    const bulbCount = profile.bulbCount ?? 0;

    if (reason === 'completed' && isLevelPlayGrantMode()) {
      return {granted: 0, pending: true, bulbCount};
    }

    const today = utcDay();
    const usedToday =
      profile.rechargeDate === today ? (profile.rechargeCount ?? 0) : 0;
    if (usedToday >= MAX_RECHARGES_PER_DAY) {
      return {granted: 0, pending: false, bulbCount};
    }

    const granted = Math.max(
      0,
      Math.min(RECHARGE_BULBS, MAX_BULB_COUNT - bulbCount),
    );
    await ctx.db.patch(profile._id, {
      bulbCount: bulbCount + granted,
      rechargeDate: today,
      rechargeCount: usedToday + 1,
      updatedAt: new Date().toISOString(),
    });
    return {granted, pending: false, bulbCount: bulbCount + granted};
  },
});

// Payment test tools in preview builds. Only deployments that opt in with
// ALLOW_TEST_BULB_GRANTS=1 (never production) accept it.
export const grantTestBulbs = mutation({
  args: {count: v.number()},
  returns: v.number(),
  handler: async (ctx, {count}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Sign in required');
    if (
      process.env.ALLOW_TEST_BULB_GRANTS !== '1' ||
      process.env.ENVIRONMENT === 'production'
    ) {
      throw new ConvexError('Test grants are disabled on this deployment');
    }
    const profile = await ensureUserProfile(ctx, userId);
    const bulbCount = Math.min(
      MAX_BULB_COUNT,
      (profile.bulbCount ?? 0) + Math.min(100, toNonNegativeInt(count)),
    );
    await ctx.db.patch(profile._id, {
      bulbCount,
      updatedAt: new Date().toISOString(),
    });
    return bulbCount;
  },
});

// Sync localStorage bulb count to server when user logs in
export const syncBulbCount = mutation({
  args: v.object({
    localBulbCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error('Called syncBulbCount without authentication present');
    }

    const userProfile = await ensureUserProfile(ctx, userId);

    const serverBulbCount = userProfile.bulbCount ?? 0;

    // Guest bulbs are client-reported, so they merge once per account and
    // are capped. Later calls keep the server balance unchanged.
    if (userProfile.guestBulbsSyncedAt) {
      return serverBulbCount;
    }

    const localBulbCount = Math.min(
      toNonNegativeInt(args.localBulbCount),
      MAX_GUEST_BULB_SYNC,
    );

    // Use the higher count between local and server
    const finalBulbCount = Math.min(
      Math.max(serverBulbCount, localBulbCount),
      MAX_BULB_COUNT,
    );

    await ctx.db.patch(userProfile._id, {
      bulbCount: finalBulbCount,
      guestBulbsSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return finalBulbCount;
  },
});

// Initialize bulb count to default (2) when user first logs in, but only if unset
export const initializeBulbCount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error(
        'Called initializeBulbCount without authentication present',
      );
    }

    const userProfile = await ensureUserProfile(ctx, userId);

    const currentBulbCount = userProfile.bulbCount;

    // Only initialize if bulb count is unset (null/undefined)
    // Don't initialize if it's 0 (user might have spent all bulbs)
    if (currentBulbCount === null || currentBulbCount === undefined) {
      await ctx.db.patch(userProfile._id, {
        bulbCount: 2,
        updatedAt: new Date().toISOString(),
      });

      return 2;
    }

    return currentBulbCount;
  },
});
