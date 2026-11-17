import type {Id} from '../../../convex/_generated/dataModel';
import {
  confirmAlternativeBillingPayment,
  readPendingAlternativeBillingPayments,
  type PendingAlternativeBillingPayment,
} from '../../../src/utils/pendingAlternativeBilling';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});

const userId = 'user-a' as Id<'users'>;
const payment: PendingAlternativeBillingPayment = {
  provider: 'toss',
  args: {
    paymentKey: 'provider-key',
    orderId: 'order-1',
    amount: 1400,
    productId: 'dev.hyo.martie.10bulbs',
    packageName: 'dev.hyo.martie',
    transactionToken: 'private-report-token',
    reportRequired: true,
  },
};
const result = {
  entitlement: {alreadyRecorded: false, bulbsGranted: 10},
  report: {status: 'pending'},
};

it('persists callback and token before approval and retains them after network failure', async () => {
  const approve = jest.fn(async () => {
    expect(await readPendingAlternativeBillingPayments(userId)).toEqual([
      payment,
    ]);
    throw new Error('network unavailable');
  });
  await expect(
    confirmAlternativeBillingPayment(userId, payment, approve),
  ).rejects.toThrow('network unavailable');
  expect(await readPendingAlternativeBillingPayments(userId)).toEqual([
    payment,
  ]);
});

it('recovers after remount only for the same account and erases confirmed tokens', async () => {
  expect(
    await readPendingAlternativeBillingPayments('user-b' as Id<'users'>),
  ).toEqual([]);
  await expect(
    confirmAlternativeBillingPayment(userId, payment, async () => {
      throw new Error('network');
    }),
  ).rejects.toThrow('network');
  const [pending] = await readPendingAlternativeBillingPayments(userId);
  const approve = jest.fn(async () => result);
  await expect(
    confirmAlternativeBillingPayment(userId, pending, approve),
  ).resolves.toEqual(result);
  expect(await readPendingAlternativeBillingPayments(userId)).toEqual([]);
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});

it('deduplicates a concurrent checkout callback and app-resume replay', async () => {
  let finish: (value: typeof result) => void = () => {};
  const approval = new Promise<typeof result>((resolve) => {
    finish = resolve;
  });
  const approve = jest.fn(() => approval);
  const first = confirmAlternativeBillingPayment(userId, payment, approve);
  const second = confirmAlternativeBillingPayment(userId, payment, approve);
  finish(result);
  await expect(Promise.all([first, second])).resolves.toEqual([result, result]);
  expect(approve).toHaveBeenCalledTimes(1);
  expect(await readPendingAlternativeBillingPayments(userId)).toEqual([]);
});

it('does not approve when the durable write fails', async () => {
  jest
    .mocked(SecureStore.setItemAsync)
    .mockRejectedValueOnce(new Error('storage unavailable'));
  const approve = jest.fn(async () => result);
  await expect(
    confirmAlternativeBillingPayment(userId, payment, approve),
  ).rejects.toThrow('storage unavailable');
  expect(approve).not.toHaveBeenCalled();
});
