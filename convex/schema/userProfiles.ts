import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const userProfilesTable = defineTable({
  userId: v.id('users'),
  email: v.string(),
  displayName: v.string(),
  description: v.optional(v.string()),
  avatarUrlId: v.optional(v.id('_storage')),
  categoryIds: v.optional(v.array(v.id('categories'))),
  level: v.number(),
  totalPoints: v.number(),
  lastQuizCursor: v.optional(v.string()), // Martie quiz cursor
  bulbCount: v.optional(v.number()), // Bulb count for logged-in users
  type: v.optional(v.union(v.literal('MARTIE'))),
  deletedAt: v.optional(v.string()),
  isPremium: v.optional(v.boolean()),
  premiumExpiration: v.optional(v.number()),
  hasCertifiedBadge: v.optional(v.boolean()),
  updatedAt: v.optional(v.string()),

  // Streak system
  currentStreak: v.optional(v.number()),
  longestStreak: v.optional(v.number()),
  lastStreakDate: v.optional(v.string()), // "2026-04-12" format
  streakFreezeCount: v.optional(v.number()),
  // Last date a free recovery freeze was granted (rate-limit dedup)
  lastStreakRecoveryAt: v.optional(v.string()), // YYYY-MM-DD

  // Feather system (기여/영향력 보상)
  featherCount: v.optional(v.number()),

  // Referral system
  referralCode: v.optional(v.string()),
  referredBy: v.optional(v.id('users')),
  referralCount: v.optional(v.number()),
  // Legacy client grant budget (no longer written; kept for existing rows).
  clientBulbGrantDate: v.optional(v.string()),
  clientBulbGrantTotal: v.optional(v.number()),
  // Server-granted daily rewards (UTC day keys).
  lastCheckInDate: v.optional(v.string()),
  rechargeDate: v.optional(v.string()),
  rechargeCount: v.optional(v.number()),
  // Quiz results after this ISO time have not been converted to level points.
  lastPointsSyncAt: v.optional(v.string()),
  // Guest (local) bulbs can be merged into an account only once.
  guestBulbsSyncedAt: v.optional(v.string()),
})
  .index('by_email', ['email'])
  .index('by_user', ['userId'])
  .index('by_referralCode', ['referralCode']);
