import {mutation} from '../_generated/server';
import {v} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';

const REFERRAL_REWARD_BULBS = 5;

function generateCode(userId: string): string {
  // Deterministic short code from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8).padEnd(8, '0');
}

export const generateReferralCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (!profile) return null;

    // Already has a referral code
    if (profile.referralCode) return profile.referralCode;

    // Generate and ensure uniqueness
    let code = generateCode(profile._id);
    let existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_referralCode', (q) => q.eq('referralCode', code))
      .first();

    // Collision fallback: append counter + random entropy
    let attempt = 0;
    while (existing) {
      attempt++;
      code = generateCode(
        profile._id + attempt.toString() + Math.random().toString(),
      );
      existing = await ctx.db
        .query('userProfiles')
        .withIndex('by_referralCode', (q) => q.eq('referralCode', code))
        .first();
    }

    await ctx.db.patch(profile._id, {referralCode: code});
    return code;
  },
});

export const applyReferral = mutation({
  args: {referralCode: v.string()},
  handler: async (ctx, {referralCode}) => {
    const normalizedCode = referralCode.trim().toLowerCase();
    const userId = await getAuthUserId(ctx);
    if (!userId) return {success: false, error: 'not_authenticated'};

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (!profile) return {success: false, error: 'no_profile'};

    // Already used a referral
    if (profile.referredBy) return {success: false, error: 'already_referred'};

    // Find referrer
    const referrer = await ctx.db
      .query('userProfiles')
      .withIndex('by_referralCode', (q) =>
        q.eq('referralCode', normalizedCode),
      )
      .first();

    if (!referrer) return {success: false, error: 'invalid_code'};

    // Can't refer yourself
    if (referrer.userId === userId)
      return {success: false, error: 'self_referral'};

    // Apply referral: reward both users
    await ctx.db.patch(profile._id, {
      referredBy: referrer.userId,
      bulbCount: (profile.bulbCount ?? 0) + REFERRAL_REWARD_BULBS,
    });

    await ctx.db.patch(referrer._id, {
      referralCount: (referrer.referralCount ?? 0) + 1,
      bulbCount: (referrer.bulbCount ?? 0) + REFERRAL_REWARD_BULBS,
    });

    return {success: true};
  },
});
