import {getAuthUserId} from '@convex-dev/auth/server';
import {verifyAmazonPurchase} from '../../convex/amazon';
import {isCorrectOption} from '../../convex/quizResult/grading';

jest.mock('@convex-dev/auth/server', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

type Args = {
  productId: string;
  receiptId: string;
  amazonUserId: string;
  amount?: number;
  currency?: string;
};
type Context = {runMutation: jest.Mock};

const verify = (
  verifyAmazonPurchase as unknown as {
    _handler: (ctx: Context, args: Args) => Promise<unknown>;
  }
)._handler;

const args: Args = {
  productId: 'dev.hyo.martie.10bulbs',
  receiptId: 'receipt-1',
  amazonUserId: 'amazon-user',
};
const env = {...process.env};
const mockFetch = jest.fn();
let ctx: Context;

const respond = (body: object, status = 200) =>
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

beforeEach(() => {
  process.env = {...env, AMAZON_IAP_SHARED_SECRET: 'shared-secret'};
  delete process.env.AMAZON_RVS_SANDBOX;
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  ctx = {
    runMutation: jest
      .fn()
      .mockResolvedValue({
        purchaseId: 'p',
        alreadyRecorded: false,
        bulbsGranted: 10,
      }),
  };
  jest.mocked(getAuthUserId).mockResolvedValue('user-a' as never);
});

afterAll(() => {
  process.env = env;
});

it('grants a matching receipt through the internal finalizer', async () => {
  respond({
    receiptId: 'receipt-1',
    productId: 'dev.hyo.martie.10bulbs',
    productType: 'CONSUMABLE',
    cancelDate: null,
  });
  await expect(verify(ctx, args)).resolves.toEqual(
    expect.objectContaining({bulbsGranted: 10}),
  );
  expect(mockFetch.mock.calls[0][0]).toContain(
    '/user/amazon-user/receiptId/receipt-1',
  );
  expect(ctx.runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      userId: 'user-a',
      transactionId: 'amazon:receipt-1',
      sandbox: false,
    }),
  );
});

it.each([
  ['another product', {productId: 'dev.hyo.martie.30bulbs'}],
  ['another receipt', {receiptId: 'receipt-2'}],
  ['a wrong type', {productType: 'ENTITLED'}],
  ['a canceled receipt', {cancelDate: 1700000000000}],
  ['a test receipt in production', {testTransaction: true}],
])('rejects %s', async (_label, override) => {
  respond({
    receiptId: 'receipt-1',
    productId: 'dev.hyo.martie.10bulbs',
    productType: 'CONSUMABLE',
    cancelDate: null,
    ...override,
  });
  await expect(verify(ctx, args)).rejects.toThrow();
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('fails closed without the shared secret and never leaks it', async () => {
  delete process.env.AMAZON_IAP_SHARED_SECRET;
  await expect(verify(ctx, args)).rejects.toThrow('not configured');
  process.env.AMAZON_IAP_SHARED_SECRET = 'shared-secret';
  respond({}, 400);
  const error = await verify(ctx, args).catch((e: unknown) => e);
  expect(String(error)).not.toContain('shared-secret');
  expect(ctx.runMutation).not.toHaveBeenCalled();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it('requires a signed-in account and a known product', async () => {
  jest.mocked(getAuthUserId).mockResolvedValueOnce(null);
  await expect(verify(ctx, args)).rejects.toThrow('Sign in');
  await expect(verify(ctx, {...args, productId: 'unknown'})).rejects.toThrow(
    'Invalid',
  );
  expect(mockFetch).not.toHaveBeenCalled();
});

describe('isCorrectOption', () => {
  const options = [{isAnswer: false}, {isAnswer: true}, {}];
  it.each([
    [1, true],
    [0, false],
    [2, false],
    [-1, false],
    [3, false],
    [1.5, false],
  ])('index %p -> %p', (index, expected) => {
    expect(isCorrectOption(options, index)).toBe(expected);
  });
});
