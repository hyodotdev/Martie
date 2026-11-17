import {v} from 'convex/values';
import {internalAction} from '../_generated/server';
import {internal} from '../_generated/api';
import {
  addFunnelCounts,
  emptyFunnelCounts,
  validateReportDates,
} from './helpers';
import type {FunnelCounts, FunnelPage, FunnelSegment} from './types';

function withRates(counts: FunnelCounts) {
  const ratio = (numerator: number, denominator: number) =>
    denominator ? numerator / denominator : null;
  return {
    ...counts,
    firstQuizCompletionRate: ratio(counts.firstQuizCompleted, counts.visits),
    dailyQuizStartRate: ratio(counts.dailyQuizStarted, counts.visits),
    dailyQuizCompletionRate: ratio(
      counts.dailyQuizCompleted,
      counts.dailyQuizStarted,
    ),
    d1ReturnRate: ratio(counts.d1Returned, counts.d1Eligible),
    d1QuizCompletionRate: ratio(counts.d1QuizCompleted, counts.d1Eligible),
  };
}

export const reportFunnel = internalAction({
  args: {fromDate: v.string(), toDate: v.string()},
  handler: async (ctx, args) => {
    validateReportDates(args.fromDate, args.toDate);
    const asOfAt = Date.now();
    const segments = new Map<string, FunnelSegment>();
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone) {
      const result: FunnelPage = await ctx.runQuery(
        internal.analytics.queries.getFunnelPage,
        {
          ...args,
          asOfAt,
          paginationOpts: {cursor, numItems: 100},
        },
      );
      for (const segment of result.segments) {
        const key = JSON.stringify([
          segment.source,
          segment.platform,
          segment.language,
          segment.isNewInstall,
        ]);
        const existing = segments.get(key);
        if (existing) addFunnelCounts(existing.counts, segment.counts);
        else segments.set(key, segment);
      }
      cursor = result.continueCursor;
      isDone = result.isDone;
    }
    const newInstalls = emptyFunnelCounts();
    const existingInstalls = emptyFunnelCounts();
    const qaInstalls = emptyFunnelCounts();
    for (const segment of segments.values()) {
      addFunnelCounts(
        segment.source.startsWith('qa_')
          ? qaInstalls
          : segment.isNewInstall
            ? newInstalls
            : existingInstalls,
        segment.counts,
      );
    }
    return {
      cohort: args,
      asOfAt,
      newInstalls: withRates(newInstalls),
      existingInstalls: withRates(existingInstalls),
      qaInstalls: withRates(qaInstalls),
      segments: [...segments.values()].map(({counts, ...segment}) => ({
        ...segment,
        ...withRates(counts),
      })),
    };
  },
});
