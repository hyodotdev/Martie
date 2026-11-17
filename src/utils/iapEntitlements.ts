import {Platform} from 'react-native';

export const BULB_PACK_SKUS = [
  'dev.hyo.martie.10bulbs',
  'dev.hyo.martie.30bulbs',
];
export const SUB_MONTHLY = 'dev.hyo.martie.premium';
export const SUB_YEARLY = 'dev.hyo.martie.premium_year';
export const PREMIUM_SUBSCRIPTION_IDS = [SUB_MONTHLY, SUB_YEARLY];
export const CERTIFIED_BADGE_SKU = 'dev.hyo.martie.certified';
export const BADGE_SKUS = [CERTIFIED_BADGE_SKU];

export type PremiumPlan = 'monthly' | 'yearly';

export type PurchaseLike = {
  autoRenewingAndroid?: unknown;
  currentPlanId?: unknown;
  dataAndroid?: unknown;
  id?: unknown;
  ids?: unknown;
  isActive?: unknown;
  isAutoRenewing?: unknown;
  isDeferred?: unknown;
  isPending?: unknown;
  isSuspendedAndroid?: unknown;
  productId?: unknown;
  purchaseToken?: unknown;
  store?: unknown;
  transactionDate?: unknown;
  transactionId?: unknown;
};

export const getPremiumPlanForSubscriptionId = (
  productId: string,
): PremiumPlan => (productId === SUB_YEARLY ? 'yearly' : 'monthly');

const getAmazonReceiptTermSku = (
  purchase?: PurchaseLike | null,
): string | null => {
  if (typeof purchase?.dataAndroid !== 'string') {
    return null;
  }

  try {
    const receipt = JSON.parse(purchase.dataAndroid);
    return typeof receipt?.termSku === 'string' ? receipt.termSku : null;
  } catch {
    return null;
  }
};

export const getSubscriptionPlanProductId = (
  purchase?: PurchaseLike | null,
): string | null => {
  const candidates = [
    purchase?.productId,
    purchase?.currentPlanId,
    getAmazonReceiptTermSku(purchase),
    ...(Array.isArray(purchase?.ids) ? purchase.ids : []),
  ];

  return (
    candidates.find(
      (candidate) =>
        typeof candidate === 'string' &&
        PREMIUM_SUBSCRIPTION_IDS.includes(candidate),
    ) ?? null
  );
};

export const isActiveSubscriptionPurchase = (
  purchase?: PurchaseLike | null,
): boolean => {
  if (!purchase) {
    return false;
  }

  if (
    purchase.isSuspendedAndroid ||
    purchase.isDeferred ||
    purchase.isPending
  ) {
    return false;
  }

  if (purchase.isActive === false) {
    return false;
  }

  if (purchase.isActive === true) {
    return true;
  }

  return !!getSubscriptionPlanProductId(purchase);
};

export const getPurchaseRecordTransactionId = (
  purchase: PurchaseLike,
): string => {
  const transactionId =
    Platform.OS === 'android'
      ? purchase.purchaseToken || purchase.transactionId || purchase.id
      : purchase.transactionId || purchase.id || purchase.purchaseToken;

  if (transactionId) {
    return String(transactionId);
  }

  if (purchase.productId && purchase.transactionDate) {
    return [
      purchase.store || Platform.OS,
      purchase.productId,
      purchase.transactionDate,
    ].join(':');
  }

  throw new Error('Purchase is missing a stable transaction identifier');
};
