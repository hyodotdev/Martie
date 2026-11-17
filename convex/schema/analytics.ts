import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const analyticsVisitorsTable = defineTable({
  visitorId: v.string(),
  firstSeenAt: v.number(),
  firstSeenDay: v.string(),
  isNewInstall: v.boolean(),
  source: v.string(),
  platform: v.string(),
  language: v.string(),
  firstDailyStartedAt: v.optional(v.number()),
  firstDailyCompletedAt: v.optional(v.number()),
  firstQuizCompletedAt: v.optional(v.number()),
  firstQuizCompletedDay: v.optional(v.string()),
  firstQuizUtcOffsetMinutes: v.optional(v.number()),
})
  .index('by_visitor', ['visitorId'])
  .index('by_first_seen_day', ['firstSeenDay']);

export const analyticsVisitorDaysTable = defineTable({
  visitorId: v.string(),
  day: v.string(),
  dailyQuizStarted: v.boolean(),
  dailyQuizCompleted: v.boolean(),
  practiceQuizCompleted: v.boolean(),
}).index('by_visitor_and_day', ['visitorId', 'day']);
