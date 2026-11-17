import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {AppState, Platform, type AppStateStatus} from 'react-native';
import {useAlternativeBillingRecovery} from '../../../src/hooks/useAlternativeBillingRecovery';
import type {PendingAlternativeBillingPayment} from '../../../src/utils/pendingAlternativeBilling';

let mockAuthenticated = true;
let mockUserId = 'user-a';
const mockRead = jest.fn();
const mockToss = jest.fn();
const mockNaver = jest.fn();
const mockConfirm = jest.fn(
  (_user: string, _payment: unknown, approve: () => Promise<unknown>) =>
    approve(),
);
jest.mock('../../../convex/_generated/api', () => ({
  api: {
    user: {queries: {currentUser: 'user'}},
    toss: {confirmPayment: 'toss'},
    naverpay: {applyPayment: 'naver'},
  },
}));
jest.mock('convex/react', () => ({
  useConvexAuth: () => ({isAuthenticated: mockAuthenticated}),
  useQuery: () => (mockAuthenticated ? {_id: mockUserId} : null),
  useAction: (action: string) => (action === 'toss' ? mockToss : mockNaver),
}));
jest.mock('../../../src/utils/pendingAlternativeBilling', () => ({
  readPendingAlternativeBillingPayments: (...args: unknown[]) =>
    mockRead(...args),
  confirmAlternativeBillingPayment: (...args: Parameters<typeof mockConfirm>) =>
    mockConfirm(...args),
}));
jest.mock('../../../src/utils/analytics', () => ({logEvent: jest.fn()}));
const payment: PendingAlternativeBillingPayment = {
  provider: 'toss',
  args: {
    productId: 'dev.hyo.martie.10bulbs',
    amount: 1400,
    packageName: 'dev.hyo.martie',
    reportRequired: true,
    transactionToken: 'report-token',
    orderId: 'order-1',
    paymentKey: 'provider-key',
  },
};
const Recovery = (): null => {
  useAlternativeBillingRecovery();
  return null;
};
let renderer: ReactTestRenderer;
let foreground: (state: AppStateStatus) => void;
const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
  mockUserId = 'user-a';
  mockRead.mockResolvedValue([payment]);
  mockToss.mockResolvedValue({
    entitlement: {alreadyRecorded: true},
    report: {status: 'reported'},
  });
  Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      foreground = listener;
      return {remove: jest.fn()};
    });
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  Object.defineProperty(Platform, 'OS', {
    value: originalOS,
    configurable: true,
  });
  jest.restoreAllMocks();
});

it('replays saved confirmation on authenticated launch and foreground', async () => {
  await act(async () => {
    renderer = create(<Recovery />);
  });
  expect(mockRead).toHaveBeenCalledWith('user-a');
  expect(mockToss).toHaveBeenCalledWith(payment.args);
  await act(async () => {
    foreground('active');
  });
  expect(mockToss).toHaveBeenCalledTimes(2);
});
it('does not read or confirm saved payments while signed out', async () => {
  mockAuthenticated = false;
  await act(async () => {
    renderer = create(<Recovery />);
  });
  expect(mockRead).not.toHaveBeenCalled();
  expect(mockToss).not.toHaveBeenCalled();
});
it('does not approve a saved payment after the account changes during storage read', async () => {
  let resolve: (
    payments: PendingAlternativeBillingPayment[],
  ) => void = () => {};
  mockRead.mockImplementationOnce(
    () =>
      new Promise<PendingAlternativeBillingPayment[]>((finish) => {
        resolve = finish;
      }),
  );
  await act(async () => {
    renderer = create(<Recovery />);
  });
  mockAuthenticated = false;
  await act(async () => {
    renderer.update(<Recovery />);
  });
  await act(async () => {
    resolve([payment]);
  });
  expect(mockToss).not.toHaveBeenCalled();
});
it('retains failed approval for a later foreground retry without logging the token', async () => {
  mockToss.mockRejectedValueOnce(new Error('network unavailable'));
  await act(async () => {
    renderer = create(<Recovery />);
  });
  await act(async () => {
    foreground('active');
  });
  expect(mockToss).toHaveBeenCalledTimes(2);
});

it('recovers later payments even when an older confirmation fails', async () => {
  const second = {
    ...payment,
    args: {...payment.args, orderId: 'order-2', paymentKey: 'provider-key-2'},
  };
  mockRead.mockResolvedValueOnce([payment, second]);
  mockToss.mockRejectedValueOnce(new Error('expired provider authorization'));
  await act(async () => {
    renderer = create(<Recovery />);
  });
  expect(mockToss).toHaveBeenCalledTimes(2);
  expect(mockToss).toHaveBeenLastCalledWith(second.args);
});
