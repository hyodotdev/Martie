import {getAuthUserId} from '@convex-dev/auth/server';
import {applyPayment} from '../../convex/naverpay';

jest.mock('@convex-dev/auth/server', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});
jest.mock('../../convex/iap', () => ({
  getGoogleServiceAccountAuth: jest.fn(() => ({})),
}));

type ApplyArgs = {
  paymentId: string;
  merchantPayKey: string;
  amount: number;
  productId: string;
  packageName: string;
  transactionToken: string;
  reportRequired: boolean;
};
type ApplyContext = {runMutation: jest.Mock};
const apply = (
  applyPayment as unknown as {
    _handler: (ctx: ApplyContext, args: ApplyArgs) => Promise<unknown>;
  }
)._handler;
const args: ApplyArgs = {
  paymentId: 'payment-1',
  merchantPayKey: 'order-1',
  amount: 1400,
  productId: 'dev.hyo.martie.10bulbs',
  packageName: 'dev.hyo.martie',
  transactionToken: '',
  reportRequired: false,
};
const detail = {
  paymentId: args.paymentId,
  merchantPayKey: args.merchantPayKey,
  totalPayAmount: args.amount,
  admissionTypeCode: '01',
  admissionState: 'SUCCESS',
  admissionYmdt: '20261006123456',
};
const respond = (value: unknown) => {
  jest.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => value,
  } as Response);
};
const originalEnv = {...process.env};
let ctx: ApplyContext;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetch).mockReset();
  process.env.NAVER_PAY_MODE = 'development';
  process.env.NAVER_PAY_CLIENT_ID = 'test_client';
  process.env.NAVER_PAY_CLIENT_SECRET = 'test_secret';
  process.env.NAVER_PAY_CHAIN_ID = 'test_chain';
  jest.mocked(getAuthUserId).mockResolvedValue('user-1' as never);
  ctx = {
    runMutation: jest.fn().mockResolvedValue({
      purchaseId: 'purchase-1',
      alreadyRecorded: false,
      bulbsGranted: 10,
      reportStatus: 'skipped',
      reportAttempts: 0,
    }),
  };
});

afterEach(() => { process.env = {...originalEnv}; });

it('rejects unauthenticated Naver approval without contacting the provider', async () => {
  jest.mocked(getAuthUserId).mockResolvedValue(null);
  await expect(apply(ctx, args)).rejects.toThrow('Sign in is required');
  expect(fetch).not.toHaveBeenCalled();
});

it('always checks the server price, including non-reporting orders', async () => {
  await expect(apply(ctx, {...args, amount: 1})).rejects.toThrow('amount mismatch');
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects a missing reporting token before approving a charge', async () => {
  await expect(apply(ctx, {...args, reportRequired: true})).rejects.toThrow(
    'Missing external transaction token',
  );
  expect(fetch).not.toHaveBeenCalled();
});

it('uses the original Korea approval time when finalizing a payment', async () => {
  respond({code: 'Success', body: {detail}});
  await expect(apply(ctx, args)).resolves.toMatchObject({
    amount: args.amount,
    report: {status: 'skipped'},
  });
  expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(),
    expect.objectContaining({transactionTime: '2026-10-06T03:34:56.000Z'}),
  );
});

it.each([
  {admissionState: 'FAIL'},
  {admissionTypeCode: '03'},
  {admissionTypeCode: '04'},
])('rejects an unsuccessful or cancelled approval %o', async (fields) => {
  respond({code: 'Success', body: {detail: {...detail, ...fields}}});
  await expect(apply(ctx, args)).rejects.toThrow('Naver Pay payment is not completed');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('recovers AlreadyComplete without detail by querying payment history', async () => {
  respond({code: 'AlreadyComplete'});
  respond({code: 'Success', body: {list: [detail], totalCount: 1}});
  await expect(apply(ctx, args)).resolves.toMatchObject({alreadyComplete: true});
  expect(fetch).toHaveBeenNthCalledWith(2,
    expect.stringContaining('/payments/v2.3/list/history/payment-1'),
    expect.objectContaining({method: 'POST'}),
  );
  expect(ctx.runMutation).toHaveBeenCalledTimes(1);
});

it('rejects a refund found while recovering an already approved payment', async () => {
  respond({code: 'AlreadyComplete', body: {detail}});
  respond({code: 'Success', body: {
    list: [detail, {...detail, admissionTypeCode: '03'}], totalCount: 2,
  }});
  await expect(apply(ctx, args)).rejects.toThrow('Naver Pay payment was cancelled');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('recovers an approval beyond the first history page', async () => {
  respond({code: 'AlreadyComplete'});
  respond({code: 'Success', body: {
    list: Array.from({length: 100}, () => ({...detail, admissionState: 'FAIL'})),
    totalCount: 101,
  }});
  respond({code: 'Success', body: {list: [detail], totalCount: 101}});
  await expect(apply(ctx, args)).resolves.toMatchObject({alreadyComplete: true});
  expect(fetch).toHaveBeenNthCalledWith(3, expect.any(String),
    expect.objectContaining({body: JSON.stringify({pageNumber: 2, rowsPerPage: 100})}),
  );
  expect(ctx.runMutation).toHaveBeenCalledTimes(1);
});

it('rejects cancellation on a later history page', async () => {
  respond({code: 'AlreadyComplete'});
  respond({code: 'Success', body: {
    list: [detail, ...Array.from({length: 99}, () => ({...detail, admissionState: 'FAIL'}))],
    totalCount: 101,
  }});
  respond({code: 'Success', body: {
    list: [{...detail, admissionTypeCode: '03'}], totalCount: 101,
  }});
  await expect(apply(ctx, args)).rejects.toThrow('Naver Pay payment was cancelled');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('does not grant when a later history page is missing', async () => {
  respond({code: 'AlreadyComplete'});
  respond({code: 'Success', body: {list: [detail], totalCount: 2}});
  respond({code: 'Success', body: {list: [], totalCount: 2}});
  await expect(apply(ctx, args)).rejects.toThrow('history is incomplete');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it.each([
  {merchantPayKey: 'another-order'},
  {paymentId: 'another-payment'},
  {totalPayAmount: 1},
])('rejects an approval for different payment details %o', async (fields) => {
  respond({code: 'Success', body: {detail: {...detail, ...fields}}});
  await expect(apply(ctx, args)).rejects.toThrow();
  expect(ctx.runMutation).not.toHaveBeenCalled();
});

it('does not finalize failed or cancelled provider responses', async () => {
  respond({code: 'Fail', message: 'Payment cancelled'});
  await expect(apply(ctx, args)).rejects.toThrow('Naver Pay apply failed');
  expect(ctx.runMutation).not.toHaveBeenCalled();
});


it('cannot suppress Google reporting on live Naver payments', async () => {
  process.env.NAVER_PAY_MODE = 'production';
  await expect(apply(ctx, args)).rejects.toThrow('Google reporting is required');
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects a different Android package before approving Naver', async () => {
  await expect(apply(ctx, {...args, packageName: 'other.app'})).rejects.toThrow(
    'Invalid alternative billing package',
  );
  expect(fetch).not.toHaveBeenCalled();
});
