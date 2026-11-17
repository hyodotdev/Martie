import {processAlternativeBillingReport} from '../../convex/toss';
import {getGoogleServiceAccountAuth} from '../../convex/iap';
import {google} from 'googleapis';

jest.mock('../../convex/iap', () => ({
  getGoogleServiceAccountAuth: jest.fn(() => ({})),
}));
jest.mock('googleapis', () => ({
  google: {androidpublisher: jest.fn()},
}));
jest.mock('@convex-dev/auth/server', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

type ReportResult =
  | {status: 'reported'; createTime: string | null}
  | {status: 'pending'; attempts: number}
  | {status: 'failed'; attempts: number}
  | {status: 'skipped'};
type ReportContext = {
  runQuery: jest.Mock;
  runMutation: jest.Mock;
  scheduler: {runAfter: jest.Mock};
};
const report = (
  processAlternativeBillingReport as unknown as {
    _handler: (
      ctx: ReportContext,
      args: {transactionId: string; attempts?: number},
    ) => Promise<ReportResult>;
  }
)._handler;
const createTransaction = jest.fn().mockResolvedValue({
  data: {createTime: '2026-10-01T00:00:00Z'},
});
const purchase = {
  _id: 'purchase-id',
  _creationTime: 1,
  userId: 'profile-id',
  productId: 'dev.hyo.martie.10bulbs',
  amount: 1400,
  currency: 'KRW',
  paymentMethod: 'toss_alternative_billing',
  transactionId: 'mock-order',
  createdAt: 1,
  alternativeBillingProvider: 'toss',
  alternativeBillingPackageName: 'dev.hyo.martie',
  alternativeBillingTransactionToken: 'mock-listener-token',
  alternativeBillingTransactionTime: '2026-10-01T00:00:00Z',
  alternativeBillingReportStatus: 'retrying',
  alternativeBillingReportAttempts: 1,
};
const originalEnv = {...process.env};
let ctx: ReportContext;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GOOGLE_REPORT_ALT_BILLING = '1';
  process.env.TOSS_SECRET_KEY = 'live_mock';
  process.env.NAVER_PAY_MODE = 'production';
  ctx = {
    runQuery: jest.fn().mockResolvedValue(purchase),
    runMutation: jest.fn().mockResolvedValue(undefined),
    scheduler: {runAfter: jest.fn().mockResolvedValue(undefined)},
  };
  jest.mocked(google.androidpublisher).mockReturnValue({
    externaltransactions: {createexternaltransaction: createTransaction},
  } as unknown as ReturnType<typeof google.androidpublisher>);
});
afterEach(() => {
  process.env = {...originalEnv};
  expect(fetch).not.toHaveBeenCalled();
});

it('reports a pending transaction and preserves VAT totals', async () => {
  await expect(
    report(ctx, {transactionId: purchase.transactionId, attempts: 1}),
  ).resolves.toEqual({
    status: 'reported',
    createTime: '2026-10-01T00:00:00Z',
  });
  const request = createTransaction.mock.calls[0][0];
  expect(request.externalTransactionId).toBe(purchase.transactionId);
  expect(request.requestBody.oneTimeTransaction.externalTransactionToken).toBe(
    purchase.alternativeBillingTransactionToken,
  );
  expect(request.requestBody.transactionTime).toBe(
    purchase.alternativeBillingTransactionTime,
  );
  expect(
    Number(request.requestBody.originalPreTaxAmount.priceMicros) +
      Number(request.requestBody.originalTaxAmount.priceMicros),
  ).toBe(1400 * 1_000_000);
  expect(ctx.runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      transactionId: purchase.transactionId,
      attempts: 1,
    }),
  );
  expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
});

it('persists a retry through the mutation when Google reporting is disabled', async () => {
  delete process.env.GOOGLE_REPORT_ALT_BILLING;
  await expect(
    report(ctx, {transactionId: purchase.transactionId, attempts: 1}),
  ).resolves.toEqual({status: 'pending', attempts: 1});
  expect(getGoogleServiceAccountAuth).not.toHaveBeenCalled();
  expect(ctx.runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      transactionId: purchase.transactionId,
      attempts: 1,
      error: 'GOOGLE_REPORT_ALT_BILLING is not enabled',
    }),
  );
  expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
});

it('requires an explicit opt-in before reporting sandbox orders', async () => {
  process.env.TOSS_SECRET_KEY = 'test_mock';
  await expect(
    report(ctx, {transactionId: purchase.transactionId, attempts: 1}),
  ).resolves.toEqual({status: 'pending', attempts: 1});
  expect(google.androidpublisher).not.toHaveBeenCalled();

  process.env.GOOGLE_REPORT_ALT_BILLING_TEST_ORDERS = '1';
  await expect(
    report(ctx, {transactionId: purchase.transactionId, attempts: 1}),
  ).resolves.toMatchObject({status: 'reported'});
});

it('stops scheduling after the retry budget is exhausted', async () => {
  delete process.env.GOOGLE_REPORT_ALT_BILLING;
  ctx.runQuery.mockResolvedValue({
    ...purchase,
    alternativeBillingReportAttempts: 20,
  });
  await expect(
    report(ctx, {transactionId: purchase.transactionId, attempts: 20}),
  ).resolves.toEqual({status: 'failed', attempts: 20});
  expect(ctx.runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({attempts: 20}),
  );
  expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
});

it('treats an idempotent conflict as already reported', async () => {
  createTransaction.mockRejectedValueOnce({code: 409});
  await expect(
    report(ctx, {transactionId: purchase.transactionId, attempts: 1}),
  ).resolves.toEqual({status: 'reported', createTime: null});
  expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
});

it.each([
  ['missing token', {...purchase, alternativeBillingTransactionToken: ''}],
  ['invalid amount', {...purchase, amount: 0}],
] as const)(
  'keeps malformed %s reports in the retry ledger',
  async (_name, value) => {
    ctx.runQuery.mockResolvedValue(value);
    await expect(
      report(ctx, {transactionId: purchase.transactionId, attempts: 1}),
    ).resolves.toMatchObject({status: 'pending'});
    expect(google.androidpublisher).not.toHaveBeenCalled();
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  },
);


it('does not revive an exhausted report from another callback', async () => {
  ctx.runQuery.mockResolvedValue({
    ...purchase,
    alternativeBillingReportStatus: 'failed',
    alternativeBillingReportAttempts: 20,
  });
  await expect(report(ctx, {transactionId: purchase.transactionId, attempts: 20}))
    .resolves.toEqual({status: 'failed', attempts: 20});
  expect(createTransaction).not.toHaveBeenCalled();
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('ignores a stale action after a newer attempt was dispatched', async () => {
  ctx.runQuery.mockResolvedValue({...purchase, alternativeBillingReportAttempts: 2});
  await expect(report(ctx, {transactionId: purchase.transactionId, attempts: 1}))
    .resolves.toEqual({status: 'pending', attempts: 2});
  expect(createTransaction).not.toHaveBeenCalled();
});

it('redacts external tokens from persisted provider errors', async () => {
  createTransaction.mockRejectedValueOnce(new Error(
    `Invalid token ${purchase.alternativeBillingTransactionToken}`,
  ));
  await report(ctx, {transactionId: purchase.transactionId, attempts: 1});
  expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
    transactionId: purchase.transactionId,
    attempts: 1,
    error: 'Invalid token [redacted]',
  });
});

it('resumes a scheduled report from the previous deployment without bypassing the dispatcher', async () => {
  await report(ctx, {transactionId: purchase.transactionId});
  expect(createTransaction).not.toHaveBeenCalled();
  expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
    transactionId: purchase.transactionId, attempts: 1,
  });
});

it('retains sandbox classification after the server switches to live keys', async () => {
  ctx.runQuery.mockResolvedValue({...purchase, alternativeBillingIsSandbox: true});
  await expect(report(ctx, {transactionId: purchase.transactionId, attempts: 1}))
    .resolves.toEqual({status: 'pending', attempts: 1});
  expect(createTransaction).not.toHaveBeenCalled();
});

it('retains live classification after the server switches to test keys', async () => {
  process.env.TOSS_SECRET_KEY = 'test_mock';
  ctx.runQuery.mockResolvedValue({...purchase, alternativeBillingIsSandbox: false});
  await expect(report(ctx, {transactionId: purchase.transactionId, attempts: 1}))
    .resolves.toMatchObject({status: 'reported'});
  expect(createTransaction).toHaveBeenCalledTimes(1);
});
