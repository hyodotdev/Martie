import * as SecureStore from 'expo-secure-store';
import type {Id} from '../../convex/_generated/dataModel';

type ConfirmationArgs = {
  amount: number;
  productId: string;
  packageName: string;
  transactionToken: string;
  reportRequired: boolean;
};

export type PendingAlternativeBillingPayment =
  | {
      provider: 'toss';
      args: ConfirmationArgs & {paymentKey: string; orderId: string};
    }
  | {
      provider: 'naver';
      args: ConfirmationArgs & {paymentId: string; merchantPayKey: string};
    };

export type AlternativeBillingConfirmationResult = {
  entitlement: {alreadyRecorded: boolean; bulbsGranted: number};
  report: {status: string};
};

const storageKey = (userId: Id<'users'>): string =>
  `martie-alt-billing-${userId}`;
const orderId = (payment: PendingAlternativeBillingPayment): string =>
  payment.provider === 'toss'
    ? payment.args.orderId
    : payment.args.merchantPayKey;
const writes = new Map<string, Promise<void>>();
const confirmations = new Map<
  string,
  Promise<AlternativeBillingConfirmationResult>
>();

const isPayment = (
  value: unknown,
): value is PendingAlternativeBillingPayment => {
  if (typeof value !== 'object' || value === null || !('args' in value))
    return false;
  const args = value.args;
  if (typeof args !== 'object' || args === null) return false;
  return (
    'provider' in value &&
    'amount' in args &&
    typeof args.amount === 'number' &&
    'productId' in args &&
    typeof args.productId === 'string' &&
    'packageName' in args &&
    typeof args.packageName === 'string' &&
    'transactionToken' in args &&
    typeof args.transactionToken === 'string' &&
    'reportRequired' in args &&
    typeof args.reportRequired === 'boolean' &&
    ((value.provider === 'toss' &&
      'paymentKey' in args &&
      typeof args.paymentKey === 'string' &&
      'orderId' in args &&
      typeof args.orderId === 'string') ||
      (value.provider === 'naver' &&
        'paymentId' in args &&
        typeof args.paymentId === 'string' &&
        'merchantPayKey' in args &&
        typeof args.merchantPayKey === 'string'))
  );
};

export const readPendingAlternativeBillingPayments = async (
  userId: Id<'users'>,
): Promise<PendingAlternativeBillingPayment[]> => {
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isPayment)) {
    throw new Error('Invalid saved payment confirmation');
  }
  return parsed;
};

const updatePending = (
  userId: Id<'users'>,
  update: (
    payments: PendingAlternativeBillingPayment[],
  ) => PendingAlternativeBillingPayment[],
): Promise<void> => {
  const key = storageKey(userId);
  const write = (writes.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const next = update(await readPendingAlternativeBillingPayments(userId));
      if (next.length === 0) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await SecureStore.setItemAsync(key, JSON.stringify(next), {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
    });
  writes.set(key, write);
  void write
    .finally(() => {
      if (writes.get(key) === write) writes.delete(key);
    })
    .catch(() => {});
  return write;
};

// Persist before provider approval: after a timeout or process death the same
// account can replay the approval, without starting another payment window.
export const confirmAlternativeBillingPayment = (
  userId: Id<'users'>,
  payment: PendingAlternativeBillingPayment,
  approve: () => Promise<AlternativeBillingConfirmationResult>,
): Promise<AlternativeBillingConfirmationResult> => {
  const id = orderId(payment);
  const key = `${userId}:${payment.provider}:${id}`;
  const existing = confirmations.get(key);
  if (existing) return existing;

  const confirmation = (async () => {
    await updatePending(userId, (payments) => [
      ...payments.filter(
        (pending) =>
          pending.provider !== payment.provider || orderId(pending) !== id,
      ),
      payment,
    ]);
    const result = await approve();
    await updatePending(userId, (payments) =>
      payments.filter(
        (pending) =>
          pending.provider !== payment.provider || orderId(pending) !== id,
      ),
    );
    return result;
  })();
  confirmations.set(key, confirmation);
  void confirmation
    .finally(() => {
      if (confirmations.get(key) === confirmation) confirmations.delete(key);
    })
    .catch(() => {});
  return confirmation;
};
