import {finalizeApplePurchase} from '../../convex/applePurchases';
import type {Doc, Id} from '../../convex/_generated/dataModel';

jest.mock('../../convex/utils/auth', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

type Args = {
  userId: Id<'users'>;
  productId: string;
  transactionId: string;
  quantity: number;
  amount: number;
  currency: string;
  expiryTimeMillis?: number;
};
type Result = {
  purchaseId: Id<'purchases'>;
  alreadyRecorded: boolean;
  bulbsGranted: number;
};
type Context = {db: {query: jest.Mock; insert: jest.Mock; patch: jest.Mock}};
const finalize = (
  finalizeApplePurchase as unknown as {
    _handler: (ctx: Context, args: Args) => Promise<Result>;
  }
)._handler;

const args: Args = {
  userId: 'user-a' as Id<'users'>,
  productId: 'dev.hyo.martie.10bulbs',
  transactionId: 'apple-txn-1',
  quantity: 1,
  amount: 1.4,
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
      insert: jest.fn(
        async (
          _table: string,
          data: {
            userId: Id<'userProfiles'>;
            productId: string;
            transactionId: string;
            paymentMethod: string;
          },
        ) => {
          existing = {
            _id: 'purchase-a' as Id<'purchases'>,
            userId: data.userId,
            productId: data.productId,
            transactionId: data.transactionId,
            paymentMethod: data.paymentMethod,
          };
          return 'purchase-a';
        },
      ),
      patch: jest.fn().mockResolvedValue(undefined),
    },
  };
});

it('atomically grants the verified quantity and records the ledger entry', async () => {
  await expect(finalize(ctx, {...args, quantity: 2})).resolves.toMatchObject({
    alreadyRecorded: false,
    bulbsGranted: 20,
  });
  expect(ctx.db.insert).toHaveBeenCalledWith(
    'purchases',
    expect.objectContaining({
      productId: args.productId,
      transactionId: args.transactionId,
      paymentMethod: 'apple',
      amount: args.amount,
      currency: args.currency,
    }),
  );
  expect(ctx.db.patch).toHaveBeenCalledWith(
    profile._id,
    expect.objectContaining({bulbCount: 25}),
  );
});

it('matches a legacy Apple transaction without granting duplicate bulbs', async () => {
  existing = {
    _id: 'purchase-legacy' as Id<'purchases'>,
    userId: profile._id as unknown as Id<'userProfiles'>,
    productId: args.productId,
    paymentMethod: 'ios',
  };
  await expect(finalize(ctx, args)).resolves.toMatchObject({
    purchaseId: 'purchase-legacy',
    alreadyRecorded: true,
    bulbsGranted: 0,
  });
  expect(ctx.db.insert).not.toHaveBeenCalled();
  expect(ctx.db.patch).not.toHaveBeenCalled();
});

it('replays a verified receipt without granting twice', async () => {
  await finalize(ctx, args);
  ctx.db.patch.mockClear();
  await expect(finalize(ctx, args)).resolves.toMatchObject({
    alreadyRecorded: true,
    bulbsGranted: 0,
  });
  expect(ctx.db.insert).toHaveBeenCalledTimes(1);
  expect(ctx.db.patch).not.toHaveBeenCalled();
});

it.each([
  {
    name: 'another account',
    row: {userId: 'other-profile' as unknown as Id<'userProfiles'>},
  },
  {name: 'another product', row: {productId: 'dev.hyo.martie.30bulbs'}},
  {name: 'Google billing', row: {paymentMethod: 'google'}},
  {
    name: 'another provider',
    row: {alternativeBillingProvider: 'toss' as const},
  },
])('rejects a receipt recorded for $name', async ({row}) => {
  existing = {
    _id: 'purchase-a' as Id<'purchases'>,
    userId: profile._id as unknown as Id<'userProfiles'>,
    productId: args.productId,
    paymentMethod: 'apple',
    ...row,
  };
  await expect(finalize(ctx, args)).rejects.toThrow(
    'another purchase or account',
  );
  expect(ctx.db.patch).not.toHaveBeenCalled();
});

it('caps bulbs at the account maximum', async () => {
  const capped = {...profile, bulbCount: 9995};
  ctx.db.query.mockImplementation((table: string) => ({
    withIndex: () => ({
      first: async () => (table === 'userProfiles' ? capped : existing),
    }),
  }));
  await finalize(ctx, {...args, quantity: 2});
  expect(ctx.db.patch).toHaveBeenCalledWith(
    profile._id,
    expect.objectContaining({bulbCount: 9999}),
  );
});

it('sets subscription expiry from Apple instead of a fixed duration', async () => {
  const expiry = Date.now() + 2_592_000_000;
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

it('grants the certified badge without bulbs and stays idempotent', async () => {
  const badge = {...args, productId: 'dev.hyo.martie.certified'};
  await expect(finalize(ctx, badge)).resolves.toMatchObject({
    alreadyRecorded: false,
    bulbsGranted: 0,
  });
  expect(ctx.db.patch).toHaveBeenCalledWith(
    profile._id,
    expect.objectContaining({hasCertifiedBadge: true}),
  );
  await expect(finalize(ctx, badge)).resolves.toMatchObject({
    alreadyRecorded: true,
    bulbsGranted: 0,
  });
  expect(ctx.db.insert).toHaveBeenCalledTimes(1);
});

it.each([
  {
    name: 'expired subscription',
    patch: {productId: 'dev.hyo.martie.premium', expiryTimeMillis: 1},
  },
  {name: 'unsupported product', patch: {productId: 'unknown.sku'}},
  {name: 'invalid quantity', patch: {quantity: 0}},
  {name: 'invalid price', patch: {amount: Number.NaN}},
])('rejects $name without recording', async ({patch}) => {
  await expect(finalize(ctx, {...args, ...patch})).rejects.toThrow();
  expect(ctx.db.insert).not.toHaveBeenCalled();
  expect(ctx.db.patch).not.toHaveBeenCalled();
});
