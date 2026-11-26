import {finalizeGooglePurchase} from '../../convex/purchase/mutations';
import type {Doc, Id} from '../../convex/_generated/dataModel';
jest.mock('../../convex/utils/auth', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});
type Args = {
  userId: Id<'users'>;
  productId: string;
  transactionId: string;
  quantity: number;
  consumed: boolean;
  amount: number;
  currency: string;
  expiryTimeMillis?: number;
};
type Context = {db: {query: jest.Mock; insert: jest.Mock; patch: jest.Mock}};
const finalize = (
  finalizeGooglePurchase as unknown as {
    _handler: (ctx: Context, args: Args) => Promise<unknown>;
  }
)._handler;
const args: Args = {
  userId: 'user-a' as Id<'users'>,
  productId: 'dev.hyo.martie.10bulbs',
  transactionId: 'fake-receipt',
  quantity: 1,
  consumed: false,
  amount: 1400,
  currency: 'KRW',
};
let existing: Partial<Doc<'purchases'>> | null;
const profile = {_id: 'profile-a', userId: args.userId, bulbCount: 5};
let ctx: Context;
beforeEach(() => {
  existing = null;
  ctx = {
    db: {
      query: jest.fn((table: string) => ({
        withIndex: () => ({
          first: async () => (table === 'userProfiles' ? profile : existing),
        }),
      })),
      insert: jest.fn(async (_table, data: Doc<'purchases'>) => {
        existing = {...data, _id: 'purchase-a' as Id<'purchases'>};
        return 'purchase-a';
      }),
      patch: jest.fn().mockResolvedValue(undefined),
    },
  };
});
it('atomically grants the receipt quantity and records the purchase', async () => {
  await expect(finalize(ctx, {...args, quantity: 2})).resolves.toMatchObject({
    alreadyRecorded: false,
    bulbsGranted: 20,
  });
  expect(ctx.db.patch).toHaveBeenCalledWith(
    profile._id,
    expect.objectContaining({bulbCount: 25}),
  );
});
it('replays after consumption without granting twice', async () => {
  await finalize(ctx, args);
  ctx.db.patch.mockClear();
  await expect(finalize(ctx, {...args, consumed: true})).resolves.toMatchObject(
    {alreadyRecorded: true, bulbsGranted: 0},
  );
  expect(ctx.db.insert).toHaveBeenCalledTimes(1);
  expect(ctx.db.patch).not.toHaveBeenCalled();
});
it('does not silently regrant legacy consumed purchases missing a ledger entry', async () => {
  await expect(finalize(ctx, {...args, consumed: true})).rejects.toThrow(
    'reconciliation',
  );
  expect(ctx.db.insert).not.toHaveBeenCalled();
});
it('rejects a receipt recorded for another account', async () => {
  existing = {
    userId: 'other-profile' as Id<'userProfiles'>,
    productId: args.productId,
  };
  await expect(finalize(ctx, args)).rejects.toThrow(
    'another purchase or account',
  );
  expect(ctx.db.patch).not.toHaveBeenCalled();
});
it('updates subscription expiry from Google instead of adding a fixed duration per retry', async () => {
  const expiry = Date.now() + 3_600_000;
  const subscription = {
    ...args,
    productId: 'dev.hyo.martie.premium',
    expiryTimeMillis: expiry,
  };
  await finalize(ctx, subscription);
  await finalize(ctx, subscription);
  expect(ctx.db.patch).toHaveBeenLastCalledWith(
    profile._id,
    expect.objectContaining({premiumExpiration: expiry}),
  );
  expect(ctx.db.insert).toHaveBeenCalledTimes(1);
});
