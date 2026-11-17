import {paginationOptsValidator} from 'convex/server';
import {v} from 'convex/values';
import {internalQuery} from '../_generated/server';
import {
  addFunnelCounts,
  countVisitor,
  nextAnalyticsDay,
  validateReportDates,
} from './helpers';
import type {FunnelPage, FunnelSegment} from './types';

export const getFunnelPage = internalQuery({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    asOfAt: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): Promise<FunnelPage> => {
    validateReportDates(args.fromDate, args.toDate);
    const result = await ctx.db
      .query('analyticsVisitors')
      .withIndex('by_first_seen_day', (q) =>
        q.gte('firstSeenDay', args.fromDate).lte('firstSeenDay', args.toDate),
      )
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(100, args.paginationOpts.numItems),
      });
    const segments = new Map<string, FunnelSegment>();
    for (const visitor of result.page) {
      if (visitor.firstSeenAt > args.asOfAt) continue;
      const completionDay = visitor.firstQuizCompletedDay;
      const nextDay = completionDay
        ? await ctx.db
            .query('analyticsVisitorDays')
            .withIndex('by_visitor_and_day', (q) =>
              q
                .eq('visitorId', visitor.visitorId)
                .eq('day', nextAnalyticsDay(completionDay)),
            )
            .unique()
        : null;
      const counts = countVisitor(visitor, nextDay, args.asOfAt);
      const key = JSON.stringify([
        visitor.source,
        visitor.platform,
        visitor.language,
        visitor.isNewInstall,
      ]);
      const segment = segments.get(key);
      if (segment) {
        addFunnelCounts(segment.counts, counts);
      } else {
        segments.set(key, {
          source: visitor.source,
          platform: visitor.platform,
          language: visitor.language,
          isNewInstall: visitor.isNewInstall,
          counts,
        });
      }
    }
    return {
      segments: [...segments.values()],
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
