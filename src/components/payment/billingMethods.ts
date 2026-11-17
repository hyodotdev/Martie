/**
 * @name billingMethods
 *
 * Pure billing-method metadata for the alternative-billing sheet.
 */

export type BillingMethod = 'googlePlay' | 'toss' | 'naver';

export const BILLING_METHODS: BillingMethod[] = [
  'googlePlay',
  'toss',
  'naver',
];

export const billingMethodCopy = {
  googlePlay: {
    titleKey: 'purchase.altBilling.payWithGooglePlay',
    descKey: 'purchase.altBilling.googlePlayDesc',
  },
  toss: {
    titleKey: 'purchase.altBilling.payWithToss',
    descKey: 'purchase.altBilling.tossDesc',
  },
  naver: {
    titleKey: 'purchase.altBilling.payWithNaverPay',
    descKey: 'purchase.altBilling.naverPayDesc',
  },
} as const satisfies Record<BillingMethod, {titleKey: string; descKey: string}>;

export const isBillingMethodReady = (
  method: BillingMethod,
  readiness: {tossReady: boolean; naverReady: boolean},
): boolean => {
  if (method === 'toss') {
    return readiness.tossReady;
  }

  if (method === 'naver') {
    return readiness.naverReady;
  }

  return true;
};
