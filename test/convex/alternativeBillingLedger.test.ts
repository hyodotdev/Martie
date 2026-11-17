import {
  dispatchAlternativeBillingReport,
  markAlternativeBillingReported,
  markAlternativeBillingReportRetry,
} from '../../convex/purchase/mutations';
import type {Doc} from '../../convex/_generated/dataModel';

jest.mock('@convex-dev/auth/server', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

type ReportRecord = Partial<Doc<'purchases'>>;
type MutationContext = {
  db: {query: jest.Mock; patch: jest.Mock};
  scheduler: {runAfter: jest.Mock};
};
type ReportArgs = {transactionId: string; attempts: number};
const dispatch = (
  dispatchAlternativeBillingReport as unknown as {
    _handler: (ctx: MutationContext, args: ReportArgs) => Promise<void>;
  }
)._handler;
const retry = (
  markAlternativeBillingReportRetry as unknown as {
    _handler: (
      ctx: MutationContext,
      args: ReportArgs & {error: string},
    ) => Promise<void>;
  }
)._handler;
const reported = (
  markAlternativeBillingReported as unknown as {
    _handler: (ctx: MutationContext, args: ReportArgs) => Promise<void>;
  }
)._handler;
const args = {transactionId: 'order-1', attempts: 0};
let purchase: ReportRecord;
let ctx: MutationContext;

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-06T00:00:00Z'));
  purchase = {
    transactionId: args.transactionId,
    alternativeBillingReportStatus: 'pending',
    alternativeBillingReportAttempts: 0,
    alternativeBillingTransactionToken: 'external-token',
  };
  ctx = {
    db: {
      query: jest.fn(() => ({
        withIndex: () => ({first: async () => ({...purchase})}),
      })),
      patch: jest.fn(async (_id: unknown, fields: ReportRecord) => {
        Object.assign(purchase, fields);
      }),
    },
    scheduler: {runAfter: jest.fn().mockResolvedValue('scheduled-job')},
  };
});

afterEach(() => jest.useRealTimers());

it('reserves one attempt and schedules the action plus its recovery watchdog', async () => {
  await dispatch(ctx, args);
  expect(purchase).toMatchObject({
    alternativeBillingReportStatus: 'retrying',
    alternativeBillingReportAttempts: 1,
    alternativeBillingNextRetryAt: Date.now() + 11 * 60_000,
  });
  expect(ctx.scheduler.runAfter).toHaveBeenNthCalledWith(
    1, 0, expect.anything(), {...args, attempts: 1},
  );
  expect(ctx.scheduler.runAfter).toHaveBeenNthCalledWith(
    2, 11 * 60_000, expect.anything(), {...args, attempts: 1},
  );
  await dispatch(ctx, args);
  expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(2);
});

it('recovers when an action stops before persisting success or failure', async () => {
  await dispatch(ctx, args);
  await dispatch(ctx, {...args, attempts: 1});
  expect(purchase.alternativeBillingReportAttempts).toBe(1);
  jest.advanceTimersByTime(11 * 60_000);
  await dispatch(ctx, {...args, attempts: 1});
  expect(purchase.alternativeBillingReportAttempts).toBe(2);
  expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(4);
});

it('persists a failure and its exponential retry in the same mutation', async () => {
  await dispatch(ctx, args);
  await retry(ctx, {...args, attempts: 1, error: 'Google unavailable'});
  expect(purchase.alternativeBillingNextRetryAt).toBe(Date.now() + 60_000);
  expect(purchase.alternativeBillingLastError).toBe('Google unavailable');
  expect(ctx.scheduler.runAfter).toHaveBeenLastCalledWith(
    60_000, expect.anything(), {...args, attempts: 1},
  );
  jest.advanceTimersByTime(60_000);
  await dispatch(ctx, {...args, attempts: 1});
  await retry(ctx, {...args, attempts: 2, error: 'Google unavailable'});
  expect(ctx.scheduler.runAfter).toHaveBeenLastCalledWith(
    120_000, expect.anything(), {...args, attempts: 2},
  );
});

it('caps even interrupted attempts at twenty across duplicate scheduler jobs', async () => {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    await dispatch(ctx, {...args, attempts});
    await dispatch(ctx, {...args, attempts});
    jest.advanceTimersByTime(11 * 60_000);
  }
  await dispatch(ctx, {...args, attempts: 20});
  await dispatch(ctx, {...args, attempts: 20});
  expect(purchase.alternativeBillingReportStatus).toBe('failed');
  expect(purchase.alternativeBillingReportAttempts).toBe(20);
  expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(40);
});

it('does not let an older failed attempt replace a newer attempt', async () => {
  await dispatch(ctx, args);
  jest.advanceTimersByTime(11 * 60_000);
  await dispatch(ctx, {...args, attempts: 1});
  const before = {...purchase};
  await retry(ctx, {...args, attempts: 1, error: 'old failure'});
  expect(purchase).toEqual(before);
});

it('clears the token on success and ignores stale failures and watchdogs', async () => {
  await dispatch(ctx, args);
  await reported(ctx, {...args, attempts: 1});
  expect(purchase).toMatchObject({alternativeBillingReportStatus: 'reported'});
  expect(purchase.alternativeBillingTransactionToken).toBeUndefined();
  expect(purchase.alternativeBillingNextRetryAt).toBeUndefined();
  expect(purchase.alternativeBillingLastError).toBeUndefined();
  jest.advanceTimersByTime(11 * 60_000);
  await retry(ctx, {...args, attempts: 1, error: 'late failure'});
  await dispatch(ctx, {...args, attempts: 1});
  expect(purchase.alternativeBillingReportStatus).toBe('reported');
  expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(2);
});

it('caps explicit failures without queuing another retry', async () => {
  purchase.alternativeBillingReportAttempts = 20;
  purchase.alternativeBillingReportStatus = 'retrying';
  await retry(ctx, {...args, attempts: 20, error: 'last failure'});
  expect(purchase.alternativeBillingReportStatus).toBe('failed');
  expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
});
