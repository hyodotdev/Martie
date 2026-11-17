import {getAuthUserId} from '@convex-dev/auth/server';
import {confirmPayment} from '../../convex/toss';

jest.mock('@convex-dev/auth/server', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});
jest.mock('../../convex/iap', () => ({
  getGoogleServiceAccountAuth: jest.fn(() => ({})),
}));

type ConfirmArgs = {
  paymentKey: string;
  orderId: string;
  amount: number;
  productId: string;
  packageName: string;
  transactionToken: string;
  reportRequired: boolean;
};
type ConfirmContext = {runMutation: jest.Mock};
const confirm = (
  confirmPayment as unknown as {
    _handler: (ctx: ConfirmContext, args: ConfirmArgs) => Promise<unknown>;
  }
)._handler;
const args: ConfirmArgs = {
  paymentKey: 'MOCK-TOSS-payment',
  orderId: 'order-1',
  amount: 1400,
  productId: 'dev.hyo.martie.10bulbs',
  packageName: 'dev.hyo.martie',
  transactionToken: '',
  reportRequired: false,
};
const originalEnv = {...process.env};
let ctx: ConfirmContext;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.TOSS_SECRET_KEY = 'test_secret';
  process.env.CONVEX_CLOUD_URL = 'https://blessed-chameleon-803.convex.cloud';
  jest.mocked(getAuthUserId).mockResolvedValue('user-1' as never);
  ctx = {
    runMutation: jest.fn().mockResolvedValue({
      purchaseId: 'purchase-1',
      alreadyRecorded: false,
      bulbsGranted: 10,
      reportStatus: 'skipped',
    }),
  };
});
afterEach(() => {
  process.env = {...originalEnv};
});

it('rejects unauthenticated checkout before confirming the provider', async () => {
  jest.mocked(getAuthUserId).mockResolvedValue(null);
  await expect(confirm(ctx, args)).rejects.toThrow(
    'Sign in is required for alternative billing',
  );
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('rejects client-supplied amounts that differ from the server price', async () => {
  await expect(confirm(ctx, {...args, amount: 1})).rejects.toThrow(
    'Toss amount mismatch',
  );
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('atomically finalizes an approved sandbox payment', async () => {
  await expect(confirm(ctx, args)).resolves.toMatchObject({
    orderId: args.orderId,
    amount: args.amount,
    entitlement: {bulbsGranted: 10},
    report: {status: 'skipped'},
  });
  expect(ctx.runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      transactionId: args.orderId,
      productId: args.productId,
      reportRequired: false,
    }),
  );
});


it.each(['WAITING_FOR_DEPOSIT', 'CANCELED', 'PARTIAL_CANCELED'])(
  'does not grant an unpaid or refunded Toss payment (%s)',
  async (status) => {
    jest.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({code: 'ALREADY_PROCESSED_PAYMENT'}),
    } as Response).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        paymentKey: 'payment-1',
        orderId: args.orderId,
        totalAmount: args.amount,
        status,
      }),
    } as Response);
    await expect(confirm(ctx, {...args, paymentKey: 'payment-1'})).rejects.toThrow(
      'Toss payment is not completed',
    );
    expect(ctx.runMutation).not.toHaveBeenCalled();
  },
);

it('rejects a provider response for another payment key', async () => {
  jest.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      paymentKey: 'another-payment',
      orderId: args.orderId,
      totalAmount: args.amount,
      status: 'DONE',
    }),
  } as Response);
  await expect(confirm(ctx, {...args, paymentKey: 'payment-1'})).rejects.toThrow(
    'Toss confirm response does not match the order',
  );
  expect(ctx.runMutation).not.toHaveBeenCalled();
});


it('rejects a missing UCB token before contacting Toss', async () => {
  await expect(confirm(ctx, {...args, reportRequired: true})).rejects.toThrow(
    'Missing external transaction token',
  );
  expect(fetch).not.toHaveBeenCalled();
});

it('cannot suppress Google reporting on live Toss payments', async () => {
  process.env.TOSS_SECRET_KEY = 'live_secret';
  await expect(confirm(ctx, {...args, paymentKey: 'live-payment'})).rejects.toThrow(
    'Google reporting is required',
  );
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects a different Android package before approving Toss', async () => {
  await expect(confirm(ctx, {...args, packageName: 'other.app'})).rejects.toThrow(
    'Invalid alternative billing package',
  );
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  'https://proficient-vole-163.convex.cloud',
  'https://unknown.convex.cloud',
  '',
])('cannot simulate a payment on %s', async (deployment) => {
  process.env.CONVEX_CLOUD_URL = deployment;
  await expect(confirm(ctx, args)).rejects.toThrow(
    'Mock Toss payments are only allowed in the test deployment',
  );
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('cannot report a simulated UCB payment to Google', async () => {
  await expect(confirm(ctx, {
    ...args, reportRequired: true, transactionToken: 'listener-token',
  })).rejects.toThrow('Mock Toss payments are only allowed in the test deployment');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});
