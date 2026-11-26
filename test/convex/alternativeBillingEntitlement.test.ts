import {getAuthUserId} from '../../convex/utils/auth';
import {finalizeAlternativeBillingPurchase} from '../../convex/purchase/mutations';

jest.mock('../../convex/utils/auth', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

type FinalizeArgs = {
  provider: 'toss' | 'naver';
  packageName: string;
  productId: string;
  amountKrw: number;
  paymentMethod: string;
  transactionId: string;
  transactionToken: string;
  transactionTime: string;
  providerTransactionId: string;
  reportRequired: boolean;
  isSandbox: boolean;
};
type MutationContext = {
  scheduler: {runAfter: jest.Mock};
  db: {
    query: jest.Mock;
    insert: jest.Mock;
    patch: jest.Mock;
  };
};
const finalize = (
  finalizeAlternativeBillingPurchase as unknown as {
    _handler: (ctx: MutationContext, args: FinalizeArgs) => Promise<unknown>;
  }
)._handler;
const args: FinalizeArgs = {
  provider: 'toss',
  packageName: 'dev.hyo.martie',
  productId: 'dev.hyo.martie.10bulbs',
  amountKrw: 1400,
  paymentMethod: 'toss_alternative_billing',
  transactionId: 'order-1',
  transactionToken: 'token-1',
  transactionTime: '2026-10-01T00:00:00Z',
  providerTransactionId: 'payment-1',
  reportRequired: true,
  isSandbox: true,
};
const profile = {
  _id: 'profile-1',
  userId: 'user-1',
  bulbCount: 5,
};
let ctx: MutationContext;
let purchaseResult: unknown;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getAuthUserId).mockResolvedValue('user-1' as never);
  purchaseResult = null;
  ctx = {
    scheduler: {runAfter: jest.fn().mockResolvedValue("job-1")},
    db: {
      query: jest.fn((table: string) => ({
        withIndex: () => ({
          first: async () =>
            table === 'userProfiles' ? profile : purchaseResult,
        }),
      })),
      insert: jest.fn().mockResolvedValue('purchase-1'),
      patch: jest.fn().mockResolvedValue(undefined),
    },
  };
});

it('records the order and grants bulbs in the same mutation', async () => {
  await expect(finalize(ctx, args)).resolves.toMatchObject({
    purchaseId: 'purchase-1',
    alreadyRecorded: false,
    bulbsGranted: 10,
    reportStatus: 'pending',
  });
  expect(ctx.db.insert).toHaveBeenCalledWith(
    'purchases',
    expect.objectContaining({
      transactionId: args.transactionId,
      alternativeBillingTransactionToken: args.transactionToken,
      alternativeBillingReportStatus: 'pending',
    }),
  );
  expect(ctx.db.patch).toHaveBeenCalledWith(
    profile._id,
    expect.objectContaining({bulbCount: 15}),
  );
});

it('does not grant bulbs twice for the same transaction', async () => {
  purchaseResult = {
    _id: 'purchase-1',
    userId: profile._id,
    productId: args.productId,
    alternativeBillingProvider: args.provider,
    alternativeBillingProviderTransactionId: args.providerTransactionId,
    alternativeBillingPackageName: args.packageName,
    amount: args.amountKrw,
    alternativeBillingReportStatus: 'retrying',
  };
  await expect(finalize(ctx, args)).resolves.toMatchObject({
    alreadyRecorded: true,
    bulbsGranted: 0,
    reportStatus: 'retrying',
  });
  expect(ctx.db.insert).not.toHaveBeenCalled();
  expect(ctx.db.patch).not.toHaveBeenCalled();
});

it('rejects unauthenticated alternative billing before granting', async () => {
  jest.mocked(getAuthUserId).mockResolvedValue(null);
  await expect(finalize(ctx, args)).rejects.toThrow(
    'Sign in is required for alternative billing',
  );
  expect(ctx.db.insert).not.toHaveBeenCalled();
  expect(ctx.db.patch).not.toHaveBeenCalled();
});


it('durably schedules reporting with the entitlement commit', async () => {
  await finalize(ctx, args);
  expect(ctx.scheduler.runAfter).toHaveBeenCalledWith(
    0,
    expect.anything(),
    {transactionId: args.transactionId, attempts: 0},
  );
});

it('rejects a transaction id already used by a different provider payment', async () => {
  purchaseResult = {
    _id: 'purchase-1',
    userId: profile._id,
    productId: args.productId,
    alternativeBillingProvider: 'naver',
    alternativeBillingProviderTransactionId: 'other-payment',
    alternativeBillingReportStatus: 'reported',
  };
  await expect(finalize(ctx, args)).rejects.toThrow(
    'Alternative billing transaction already belongs to another purchase',
  );
  expect(ctx.db.insert).not.toHaveBeenCalled();
  expect(ctx.db.patch).not.toHaveBeenCalled();
});
