import {getAuthUserId} from '../../convex/utils/auth';
import {google} from 'googleapis';
import * as iap from '../../convex/iap';
import {verifyPurchase} from '../../convex/iap';

jest.mock('../../convex/utils/auth', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});
const mockProductGet = jest.fn();
const mockSubscriptionGet = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn(() => ({
        getClient: async () => ({
          getAccessToken: async () => ({token: 'fake-bearer'}),
        }),
      })),
    },
    androidpublisher: jest.fn(() => ({
      purchases: {
        products: {get: mockProductGet},
        subscriptionsv2: {get: mockSubscriptionGet},
      },
    })),
  },
}));

type Args = {
  packageName: string;
  productId: string;
  purchaseToken: string;
  completePurchase?: boolean;
};
type Context = {runMutation: jest.Mock};
const verify = (
  verifyPurchase as unknown as {
    _handler: (ctx: Context, args: Args) => Promise<unknown>;
  }
)._handler;
const args: Args = {
  packageName: 'dev.hyo.martie',
  productId: 'dev.hyo.martie.10bulbs',
  purchaseToken: 'fake-receipt',
  completePurchase: true,
};
const ctx = {runMutation: jest.fn()};
const previousKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
    client_email: 'test@example.invalid',
    private_key: 'fake-key',
  });
  jest.mocked(getAuthUserId).mockResolvedValue('user-a' as never);
  mockProductGet.mockResolvedValue({
    data: {
      purchaseState: 0,
      consumptionState: 0,
      quantity: 1,
      obfuscatedExternalAccountId: 'user-a',
      secret: 'do-not-return',
    },
  });
  ctx.runMutation.mockResolvedValue({
    purchaseId: 'purchase-a',
    alreadyRecorded: false,
    bulbsGranted: 10,
  });
});
afterAll(() => {
  if (previousKey === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  else process.env.GOOGLE_SERVICE_ACCOUNT_KEY = previousKey;
});
it('never exposes a Google access token to clients', () => {
  expect(Object.keys(iap)).not.toContain('getGoogleAccessToken');
});
it('rejects anonymous verification before contacting Google', async () => {
  jest.mocked(getAuthUserId).mockResolvedValue(null);
  await expect(verify(ctx, args)).rejects.toThrow('Sign in');
  expect(google.androidpublisher).not.toHaveBeenCalled();
});
it.each([
  {packageName: 'other.app'},
  {productId: 'unknown'},
  {purchaseToken: ''},
])('rejects invalid request %s', async (invalid) => {
  await expect(verify(ctx, {...args, ...invalid})).rejects.toThrow();
  expect(google.androidpublisher).not.toHaveBeenCalled();
});
it('verifies products and grants through an internal mutation without returning provider data', async () => {
  const result = await verify(ctx, args);
  expect(mockProductGet).toHaveBeenCalledWith({
    packageName: args.packageName,
    productId: args.productId,
    token: args.purchaseToken,
  });
  expect(ctx.runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      userId: 'user-a',
      transactionId: args.purchaseToken,
      quantity: 1,
    }),
  );
  expect(result).toEqual({
    isValid: true,
    expiryTimeMillis: null,
    entitlement: {
      purchaseId: 'purchase-a',
      alreadyRecorded: false,
      bulbsGranted: 10,
    },
  });
  expect(JSON.stringify(result)).not.toMatch(
    /fake-receipt|fake-key|do-not-return/,
  );
});
it.each([1, 2, undefined])(
  'does not grant canceled/pending/unknown product state %s',
  async (purchaseState) => {
    mockProductGet.mockResolvedValue({data: {purchaseState}});
    await expect(verify(ctx, args)).resolves.toMatchObject({isValid: false});
    expect(ctx.runMutation).not.toHaveBeenCalled();
  },
);
it('rejects a receipt bound to another account', async () => {
  mockProductGet.mockResolvedValue({
    data: {purchaseState: 0, obfuscatedExternalAccountId: 'user-b'},
  });
  await expect(verify(ctx, args)).rejects.toThrow('another account');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});
it('preserves the legacy subscription expiry response without implicitly granting', async () => {
  const expiry = Date.now() + 86_400_000;
  mockSubscriptionGet.mockResolvedValue({
    data: {
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      lineItems: [
        {
          productId: 'dev.hyo.martie.premium',
          expiryTime: new Date(expiry).toISOString(),
        },
      ],
    },
  });
  await expect(
    verify(ctx, {
      ...args,
      productId: 'dev.hyo.martie.premium',
      completePurchase: undefined,
    }),
  ).resolves.toEqual({
    isValid: true,
    expiryTimeMillis: String(expiry),
    entitlement: null,
  });
  expect(ctx.runMutation).not.toHaveBeenCalled();
});
it('sanitizes Google errors including request credentials', async () => {
  mockProductGet.mockRejectedValue(new Error('Authorization: fake-bearer'));
  await expect(verify(ctx, args)).rejects.toThrow(
    'Google purchase verification failed',
  );
  expect(ctx.runMutation).not.toHaveBeenCalled();
});
