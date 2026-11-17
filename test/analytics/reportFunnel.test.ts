import type {ActionCtx} from '../../convex/_generated/server';
import type {FunnelPage, FunnelSegment} from '../../convex/analytics/types';
import {reportFunnel} from '../../convex/analytics/actions';

jest.mock('../../convex/_generated/server', () => ({
  internalAction: (definition: unknown) => definition,
}));

const report = (
  reportFunnel as unknown as {
    handler: (
      ctx: ActionCtx,
      dates: {fromDate: string; toDate: string},
    ) => Promise<{
      newInstalls: {
        visits: number;
        firstQuizCompletionRate: number | null;
        d1ReturnRate: number | null;
      };
      existingInstalls: {visits: number};
      qaInstalls: {visits: number};
      segments: unknown[];
    }>;
  }
).handler;

const segment = (isNewInstall: boolean): FunnelSegment => ({
  source: 'shorts_ko',
  platform: 'ios',
  language: 'ko',
  isNewInstall,
  counts: {
    visits: 2,
    dailyQuizStarted: 2,
    dailyQuizCompleted: 1,
    firstQuizCompleted: 1,
    d1Eligible: 1,
    d1Returned: 1,
    d1QuizCompleted: 0,
  },
});

describe('aggregate product funnel report', () => {
  it('separates labelled release tests from real growth totals', async () => {
    const runQuery = jest
      .fn<Promise<FunnelPage>, [unknown, unknown]>()
      .mockResolvedValue({
        segments: [{...segment(true), source: 'qa_release'}],
        isDone: true,
        continueCursor: '',
      });
    const result = await report({runQuery} as unknown as ActionCtx, {
      fromDate: '2026-10-13',
      toDate: '2026-10-13',
    });
    expect(result.newInstalls.visits).toBe(0);
    expect(result.existingInstalls.visits).toBe(0);
    expect(result.qaInstalls.visits).toBe(2);
  });
  it('combines every indexed page and keeps existing installs out of acquisition totals', async () => {
    const runQuery = jest
      .fn<Promise<FunnelPage>, [unknown, unknown]>()
      .mockResolvedValueOnce({
        segments: [segment(true)],
        isDone: false,
        continueCursor: 'next',
      })
      .mockResolvedValueOnce({
        segments: [segment(true), segment(false)],
        isDone: true,
        continueCursor: '',
      });
    const result = await report({runQuery} as unknown as ActionCtx, {
      fromDate: '2026-10-13',
      toDate: '2026-10-19',
    });
    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(runQuery.mock.calls[1][1]).toMatchObject({
      paginationOpts: {cursor: 'next', numItems: 100},
    });
    expect(result.newInstalls).toMatchObject({
      visits: 4,
      firstQuizCompletionRate: 0.5,
      d1ReturnRate: 1,
    });
    expect(result.existingInstalls.visits).toBe(2);
    expect(result.segments).toHaveLength(2);
  });

  it('returns null rates when no eligible users exist', async () => {
    const runQuery = jest
      .fn<Promise<FunnelPage>, [unknown, unknown]>()
      .mockResolvedValue({segments: [], isDone: true, continueCursor: ''});
    const result = await report({runQuery} as unknown as ActionCtx, {
      fromDate: '2026-10-13',
      toDate: '2026-10-13',
    });
    expect(result.newInstalls).toMatchObject({
      visits: 0,
      firstQuizCompletionRate: null,
      d1ReturnRate: null,
    });
  });
});
