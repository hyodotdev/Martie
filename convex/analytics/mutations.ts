import {v} from 'convex/values';
import {mutation} from '../_generated/server';
import {analyticsDay} from './helpers';

export const recordEvents = mutation({
  args: {
    visitorId: v.string(),
    firstSeenAt: v.number(),
    firstSeenUtcOffsetMinutes: v.number(),
    isNewInstall: v.boolean(),
    events: v.array(
      v.object({
        name: v.union(
          v.literal('visit'),
          v.literal('daily_quiz_started'),
          v.literal('daily_quiz_completed'),
          v.literal('practice_quiz_completed'),
        ),
        occurredAt: v.number(),
        utcOffsetMinutes: v.number(),
        source: v.string(),
        platform: v.string(),
        language: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(args.visitorId)) {
      throw new Error('Invalid visitor identifier');
    }
    if (args.events.length === 0 || args.events.length > 20) {
      throw new Error('Send 1 to 20 events per batch');
    }
    for (const offset of [
      args.firstSeenUtcOffsetMinutes,
      ...args.events.map((event) => event.utcOffsetMinutes),
    ]) {
      if (!Number.isInteger(offset) || Math.abs(offset) > 840) {
        throw new Error('Invalid UTC offset');
      }
    }
    for (const timestamp of [
      args.firstSeenAt,
      ...args.events.map((e) => e.occurredAt),
    ]) {
      if (
        !Number.isFinite(timestamp) ||
        timestamp <= 0 ||
        timestamp > Date.now() + 86_400_000
      ) {
        throw new Error('Invalid event timestamp');
      }
    }

    for (const event of args.events) {
      const source = event.source.trim().slice(0, 64) || 'unattributed';
      const visitor = await ctx.db
        .query('analyticsVisitors')
        .withIndex('by_visitor', (q) => q.eq('visitorId', args.visitorId))
        .unique();
      const isCompletion =
        event.name === 'daily_quiz_completed' ||
        event.name === 'practice_quiz_completed';
      const firstCompletion =
        isCompletion &&
        (visitor?.firstQuizCompletedAt === undefined ||
          event.occurredAt < visitor.firstQuizCompletedAt);
      const earliest = (previous: number | undefined) =>
        previous === undefined
          ? event.occurredAt
          : Math.min(previous, event.occurredAt);
      const milestones = {
        ...(event.name === 'daily_quiz_started'
          ? {firstDailyStartedAt: earliest(visitor?.firstDailyStartedAt)}
          : {}),
        ...(event.name === 'daily_quiz_completed'
          ? {firstDailyCompletedAt: earliest(visitor?.firstDailyCompletedAt)}
          : {}),
        ...(firstCompletion
          ? {
              firstQuizCompletedAt: event.occurredAt,
              firstQuizCompletedDay: analyticsDay(
                event.occurredAt,
                event.utcOffsetMinutes,
              ),
              firstQuizUtcOffsetMinutes: event.utcOffsetMinutes,
            }
          : {}),
      };
      if (visitor) {
        await ctx.db.patch(visitor._id, {
          ...milestones,
          ...(visitor.language === 'unknown' && event.language
            ? {language: event.language.slice(0, 24)}
            : {}),
          ...(visitor.source === 'unattributed' && source !== 'unattributed'
            ? {source}
            : {}),
        });
      } else {
        await ctx.db.insert('analyticsVisitors', {
          visitorId: args.visitorId,
          firstSeenAt: args.firstSeenAt,
          firstSeenDay: analyticsDay(
            args.firstSeenAt,
            args.firstSeenUtcOffsetMinutes,
          ),
          isNewInstall: args.isNewInstall,
          source,
          platform: event.platform.slice(0, 24),
          language: event.language?.slice(0, 24) || 'unknown',
          ...milestones,
        });
      }

      const day = analyticsDay(event.occurredAt, event.utcOffsetMinutes);
      const activity = await ctx.db
        .query('analyticsVisitorDays')
        .withIndex('by_visitor_and_day', (q) =>
          q.eq('visitorId', args.visitorId).eq('day', day),
        )
        .unique();
      const flags = {
        dailyQuizStarted: Boolean(
          activity?.dailyQuizStarted || event.name === 'daily_quiz_started',
        ),
        dailyQuizCompleted: Boolean(
          activity?.dailyQuizCompleted || event.name === 'daily_quiz_completed',
        ),
        practiceQuizCompleted: Boolean(
          activity?.practiceQuizCompleted ||
          event.name === 'practice_quiz_completed',
        ),
      };
      if (activity) {
        await ctx.db.patch(activity._id, flags);
      } else {
        await ctx.db.insert('analyticsVisitorDays', {
          visitorId: args.visitorId,
          day,
          ...flags,
        });
      }
    }
  },
});
