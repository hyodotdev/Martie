import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const leaguesTable = defineTable({
  userId: v.id('users'),
  tier: v.string(), // "bronze" | "silver" | "gold" | "diamond" | "master"
  weeklyXp: v.number(),
  weekStart: v.string(), // "2026-04-07" format (Monday)
  groupId: v.string(), // Groups of ~30 users competing together
})
  .index('by_userId', ['userId'])
  .index('by_group_and_xp', ['groupId', 'weeklyXp'])
  .index('by_weekStart', ['weekStart']);
