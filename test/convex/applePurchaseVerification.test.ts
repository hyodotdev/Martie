import {getAuthUserId} from '@convex-dev/auth/server';
import {
  VerificationException,
  VerificationStatus,
} from '@apple/app-store-server-library';
import type {JWSTransactionDecodedPayload} from '@apple/app-store-server-library';
import {v5 as uuidv5} from 'uuid';
import {verifyApplePurchase} from '../../convex/apple';

jest.mock('@convex-dev/auth/server', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

const mockVerifyTransaction = jest.fn();
const mockVerifierCtor = jest.fn();
jest.mock('@apple/app-store-server-library', () => {
  class MockVerificationException extends Error {
    status: number;
    constructor(status: number) {
      super('mock verification failure');
      this.status = status;
    }
  }
  return {
    SignedDataVerifier: jest
      .fn()
      .mockImplementation((...ctorArgs: unknown[]) => {
        mockVerifierCtor(...ctorArgs);
        return {verifyAndDecodeTransaction: mockVerifyTransaction};
      }),
    Environment: {
      SANDBOX: 'Sandbox',
      PRODUCTION: 'Production',
      XCODE: 'Xcode',
      LOCAL_TESTING: 'LocalTesting',
    },
    VerificationException: MockVerificationException,
    VerificationStatus: {
      OK: 0,
      VERIFICATION_FAILURE: 1,
      RETRYABLE_VERIFICATION_FAILURE: 2,
      INVALID_APP_IDENTIFIER: 3,
      INVALID_ENVIRONMENT: 4,
      INVALID_CHAIN_LENGTH: 5,
      INVALID_CERTIFICATE: 6,
      FAILURE: 7,
    },
  };
});

type Args = {signedTransaction: string; productId: string};
type Result = {
  purchaseId: string;
  alreadyRecorded: boolean;
  bulbsGranted: number;
};
type Context = {runMutation: jest.Mock};
const verify = (
  verifyApplePurchase as unknown as {
    _handler: (ctx: Context, args: Args) => Promise<Result>;
  }
)._handler;

const decodedTransaction = (
  overrides: Partial<JWSTransactionDecodedPayload> = {},
): JWSTransactionDecodedPayload => ({
  transactionId: 'apple-txn-1',
  productId: 'dev.hyo.martie.10bulbs',
  bundleId: 'dev.hyo.martie',
  environment: 'Production',
  type: 'Consumable',
  quantity: 1,
  price: 1400,
  currency: 'KRW',
  ...overrides,
});

const args: Args = {
  signedTransaction: 'signed-jws-payload',
  productId: 'dev.hyo.martie.10bulbs',
};
const ctx: Context = {runMutation: jest.fn()};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.APPLE_IAP_ALLOW_SANDBOX;
  jest.mocked(getAuthUserId).mockResolvedValue('user-a' as never);
  mockVerifyTransaction.mockResolvedValue(decodedTransaction());
  ctx.runMutation.mockResolvedValue({
    purchaseId: 'purchase-a',
    alreadyRecorded: false,
    bulbsGranted: 10,
  });
});

it('rejects anonymous verification before contacting Apple', async () => {
  jest.mocked(getAuthUserId).mockResolvedValue(null);
  await expect(verify(ctx, args)).rejects.toThrow('Sign in');
  expect(mockVerifierCtor).not.toHaveBeenCalled();
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it.each([{signedTransaction: ''}, {productId: 'unknown.sku'}])(
  'rejects invalid request %s without verifying',
  async (invalid) => {
    await expect(verify(ctx, {...args, ...invalid})).rejects.toThrow(
      'Invalid Apple purchase request',
    );
    expect(mockVerifierCtor).not.toHaveBeenCalled();
  },
);

it('rejects oversized JWS input without verifying', async () => {
  await expect(
    verify(ctx, {...args, signedTransaction: `${'x'.repeat(16385)}`}),
  ).rejects.toThrow('Invalid Apple purchase request');
  expect(mockVerifierCtor).not.toHaveBeenCalled();
});

it('verifies against production with online checks and the app identity', async () => {
  const result = await verify(ctx, args);
  expect(mockVerifierCtor).toHaveBeenCalledTimes(1);
  expect(mockVerifierCtor).toHaveBeenCalledWith(
    expect.anything(),
    true,
    'Production',
    'dev.hyo.martie',
    6740057833,
  );
  expect(mockVerifyTransaction).toHaveBeenCalledWith(args.signedTransaction);
  expect(ctx.runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      userId: 'user-a',
      productId: args.productId,
      transactionId: 'apple-txn-1',
      quantity: 1,
      amount: 1.4,
      currency: 'KRW',
    }),
  );
  expect(result).toEqual({
    purchaseId: 'purchase-a',
    alreadyRecorded: false,
    bulbsGranted: 10,
  });
  expect(JSON.stringify(result)).not.toMatch(/signed-jws-payload/);
});

it('rejects a product mismatch between request and signed transaction', async () => {
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({productId: 'dev.hyo.martie.30bulbs'}),
  );
  await expect(verify(ctx, args)).rejects.toThrow('product mismatch');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('rejects a type mismatch for the allowlisted product', async () => {
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({type: 'Auto-Renewable Subscription'}),
  );
  await expect(verify(ctx, args)).rejects.toThrow('Unsupported Apple product');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it.each([
  decodedTransaction({revocationDate: Date.now()}),
  decodedTransaction({revocationReason: 1}),
])(
  'rejects a revoked transaction without claiming live refund status',
  async (revoked) => {
    mockVerifyTransaction.mockResolvedValue(revoked);
    await expect(verify(ctx, args)).rejects.toThrow('revoked or refunded');
    expect(ctx.runMutation).not.toHaveBeenCalled();
  },
);

it('rejects an upgraded subscription transaction', async () => {
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({isUpgraded: true}),
  );
  await expect(verify(ctx, args)).rejects.toThrow('upgraded');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('rejects family-shared transactions bound to another purchaser', async () => {
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({inAppOwnershipType: 'FAMILY_SHARED'}),
  );
  await expect(verify(ctx, args)).rejects.toThrow('family-shared');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('rejects an expired subscription but grants a live one with its expiry', async () => {
  const subscription = {
    ...args,
    productId: 'dev.hyo.martie.premium',
  };
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({
      productId: subscription.productId,
      type: 'Auto-Renewable Subscription',
      expiresDate: Date.now() - 1000,
    }),
  );
  await expect(verify(ctx, subscription)).rejects.toThrow('expired');
  expect(ctx.runMutation).not.toHaveBeenCalled();

  const expiry = Date.now() + 2_592_000_000;
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({
      productId: subscription.productId,
      type: 'Auto-Renewable Subscription',
      expiresDate: expiry,
    }),
  );
  await verify(ctx, subscription);
  expect(ctx.runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({expiryTimeMillis: expiry}),
  );
});

it('rejects a transaction bound to another account token', async () => {
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({
      appAccountToken: uuidv5('martie:user:user-b', uuidv5.URL),
    }),
  );
  await expect(verify(ctx, args)).rejects.toThrow('another account');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('accepts the matching account token and tokenless restored receipts', async () => {
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({
      appAccountToken: uuidv5('martie:user:user-a', uuidv5.URL),
    }),
  );
  await expect(verify(ctx, args)).resolves.toMatchObject({
    purchaseId: 'purchase-a',
  });

  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({appAccountToken: undefined}),
  );
  await expect(verify(ctx, args)).resolves.toMatchObject({
    purchaseId: 'purchase-a',
  });
  expect(ctx.runMutation).toHaveBeenCalledTimes(2);
});

it('rejects sandbox receipts unless explicitly allowed', async () => {
  mockVerifyTransaction.mockRejectedValue(
    new VerificationException(VerificationStatus.INVALID_ENVIRONMENT),
  );
  await expect(verify(ctx, args)).rejects.toThrow('sandbox');
  expect(mockVerifierCtor).toHaveBeenCalledTimes(1);
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('retries sandbox receipts with a sandbox verifier when allowed', async () => {
  process.env.APPLE_IAP_ALLOW_SANDBOX = 'true';
  mockVerifyTransaction
    .mockRejectedValueOnce(
      new VerificationException(VerificationStatus.INVALID_ENVIRONMENT),
    )
    .mockResolvedValueOnce(decodedTransaction({environment: 'Sandbox'}));
  await expect(verify(ctx, args)).resolves.toMatchObject({
    purchaseId: 'purchase-a',
  });
  expect(mockVerifierCtor).toHaveBeenCalledTimes(2);
  expect(mockVerifierCtor.mock.calls[1]?.[2]).toBe('Sandbox');
  expect(ctx.runMutation).toHaveBeenCalledTimes(1);
});

it('sanitizes verifier errors without leaking the submitted JWS', async () => {
  mockVerifyTransaction.mockRejectedValue(
    new Error(`bad chain for ${args.signedTransaction}`),
  );
  await expect(verify(ctx, args)).rejects.toThrow(
    'Apple purchase verification failed',
  );
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('rejects transactions missing identifier, quantity, or price', async () => {
  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({transactionId: undefined}),
  );
  await expect(verify(ctx, args)).rejects.toThrow('identifier');

  mockVerifyTransaction.mockResolvedValue(decodedTransaction({quantity: 0}));
  await expect(verify(ctx, args)).rejects.toThrow('quantity');

  mockVerifyTransaction.mockResolvedValue(
    decodedTransaction({price: undefined, currency: undefined}),
  );
  await expect(verify(ctx, args)).rejects.toThrow('price information');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});
