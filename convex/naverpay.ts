'use node';
import {action} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';
import {
  getAlternativeBillingReportResult,
  type AlternativeBillingEntitlementResult,
  type AlternativeBillingReportResult,
} from './toss';

const DEV_API_BASE = 'https://dev-pay.paygate.naver.com';
const PROD_API_BASE = 'https://pay.paygate.naver.com';
const APPLY_PATH = '/naverpay-partner/naverpay/payments/v2.2/apply/payment';
const HISTORY_PATH = '/naverpay-partner/naverpay/payments/v2.3/list/history';
const NAVER_PAYMENT_METHOD_ALT = 'naver_alternative_billing';
const NAVER_PAYMENT_METHOD_TEST = 'naver_test';

// Server-side KRW price table for Naver Pay alternative-billing orders.
// Must stay in sync with Play Console pricing and the client fallback.
// Verified against Play Console KR pricing on 2026-09-26.
const BULB_PACK_KRW: Record<string, number> = {
  'dev.hyo.martie.10bulbs': 1400,
  'dev.hyo.martie.30bulbs': 3800,
};

type NaverApplyDetail = {
  paymentId: string;
  payHistId?: string;
  merchantId?: string;
  merchantPayKey?: string;
  merchantUserKey?: string;
  admissionTypeCode?: string;
  admissionYmdt?: string;
  admissionState?: string;
  totalPayAmount?: number;
};

type NaverApplyResponse = {
  code: string;
  message?: string;
  body?: {detail?: NaverApplyDetail};
};

type NaverApplyResult = {
  paymentId: string;
  payHistId: string | null;
  merchantPayKey: string;
  amount: number;
  admissionYmdt: string | null;
  alreadyComplete: boolean;
  entitlement: AlternativeBillingEntitlementResult;
  report: AlternativeBillingReportResult;
};

const getNaverCredentials = (): {
  clientId: string;
  clientSecret: string;
  chainId: string;
} => {
  const clientId = process.env.NAVER_PAY_CLIENT_ID;
  const clientSecret = process.env.NAVER_PAY_CLIENT_SECRET;
  const chainId = process.env.NAVER_PAY_CHAIN_ID;

  if (!clientId || !clientSecret || !chainId) {
    throw new Error('NAVER_PAY_CLIENT_ID/SECRET/CHAIN_ID is not configured');
  }

  return {clientId, clientSecret, chainId};
};

// Approve a Naver Pay 결제형 payment after the client receives paymentId
// from the JS SDK returnUrl redirect.
export const applyPayment = action({
  args: {
    paymentId: v.string(),
    merchantPayKey: v.string(),
    amount: v.number(),
    productId: v.string(),
    packageName: v.string(),
    transactionToken: v.string(),
    reportRequired: v.boolean(),
  },
  handler: async (
    ctx,
    {
      paymentId,
      merchantPayKey,
      amount,
      productId,
      packageName,
      transactionToken,
      reportRequired,
    },
  ): Promise<NaverApplyResult> => {
    if (!(await getAuthUserId(ctx))) {
      throw new Error('Sign in is required for alternative billing');
    }
    if (packageName !== 'dev.hyo.martie') {
      throw new Error('Invalid alternative billing package');
    }

    const expected = BULB_PACK_KRW[productId];

    if (expected === undefined) {
      throw new Error(`Unknown productId for Naver Pay: ${productId}`);
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error(`Invalid Naver Pay amount: ${amount}`);
    }

    if (amount !== expected) {
      throw new Error(
        `Naver Pay amount mismatch for ${productId}: got ${amount}, expected ${expected}`,
      );
    }
    if (reportRequired && !transactionToken.trim()) {
      throw new Error('Missing external transaction token');
    }
    if (process.env.NAVER_PAY_MODE === 'production' && !reportRequired) {
      throw new Error('Google reporting is required for live alternative billing');
    }

    const {clientId, clientSecret, chainId} = getNaverCredentials();
    const base =
      process.env.NAVER_PAY_MODE === 'production'
        ? PROD_API_BASE
        : DEV_API_BASE;

    const res = await fetch(`${base}${APPLY_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'X-NaverPay-Chain-Id': chainId,
        'X-NaverPay-Idempotency-Key': merchantPayKey,
      },
      body: new URLSearchParams({paymentId}).toString(),
      // Naver requires a 60s timeout for approval calls.
      signal: AbortSignal.timeout(60000),
    });
    const json = (await res.json()) as NaverApplyResponse;

    if (json.code === 'Success' || json.code === 'AlreadyComplete') {
      let detail = json.body?.detail;
      if (json.code === 'AlreadyComplete') {
        const entries: NaverApplyDetail[] = [];
        let totalCount = 0;
        let pageNumber = 1;
        const historyTimeout = AbortSignal.timeout(60000);
        do {
          const historyResponse = await fetch(
            `${base}${HISTORY_PATH}/${encodeURIComponent(paymentId)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
                'X-NaverPay-Chain-Id': chainId,
              },
              body: JSON.stringify({pageNumber, rowsPerPage: 100}),
              signal: historyTimeout,
            },
          );
          const history = (await historyResponse.json()) as {
            code: string;
            body?: {list?: NaverApplyDetail[]; totalCount?: number};
          };
          const page = history.body?.list;
          const count = history.body?.totalCount;
          if (
            !historyResponse.ok ||
            history.code !== 'Success' ||
            !Array.isArray(page) ||
            page.length === 0 ||
            page.length > 100 ||
            typeof count !== 'number' ||
            !Number.isSafeInteger(count) ||
            count < 1 ||
            count > 10000 ||
            (pageNumber > 1 && count !== totalCount) ||
            entries.length + page.length > count
          ) {
            throw new Error('Naver Pay payment history is incomplete');
          }
          totalCount = count;
          entries.push(...page);
          pageNumber += 1;
        } while (entries.length < totalCount);
        if (
          entries.some(
            (entry) =>
              entry.admissionState === 'SUCCESS' &&
              (entry.admissionTypeCode === '03' ||
                entry.admissionTypeCode === '04'),
          )
        ) {
          throw new Error('Naver Pay payment was cancelled');
        }
        detail = entries.find(
          (entry) =>
            entry.paymentId === paymentId &&
            entry.admissionState === 'SUCCESS' &&
            entry.admissionTypeCode === '01',
        );
      }

      if (
        !detail ||
        detail.merchantPayKey !== merchantPayKey ||
        detail.paymentId !== paymentId
      ) {
        throw new Error('Naver Pay approval does not match the order');
      }

      if (detail.totalPayAmount !== amount) {
        throw new Error(
          `Naver Pay amount mismatch: got ${detail.totalPayAmount}, expected ${amount}`,
        );
      }
      if (
        detail.admissionState !== 'SUCCESS' ||
        detail.admissionTypeCode !== '01'
      ) {
        throw new Error('Naver Pay payment is not completed');
      }

      const approvalTime = detail.admissionYmdt;
      if (!approvalTime || !/^\d{14}$/.test(approvalTime)) {
        throw new Error('Naver Pay approval time is missing or invalid');
      }
      const transactionTime = new Date(
        `${approvalTime.slice(0, 4)}-${approvalTime.slice(4, 6)}-${approvalTime.slice(6, 8)}T${approvalTime.slice(8, 10)}:${approvalTime.slice(10, 12)}:${approvalTime.slice(12, 14)}+09:00`,
      ).toISOString();
      const entitlement = (await ctx.runMutation(
        internal.purchase.mutations.finalizeAlternativeBillingPurchase,
        {
          provider: 'naver',
          packageName,
          productId,
          amountKrw: detail.totalPayAmount,
          paymentMethod: reportRequired
            ? NAVER_PAYMENT_METHOD_ALT
            : NAVER_PAYMENT_METHOD_TEST,
          transactionId: merchantPayKey,
          transactionToken,
          transactionTime,
          providerTransactionId: detail.paymentId,
          reportRequired,
          isSandbox: process.env.NAVER_PAY_MODE !== 'production',
        },
      )) as AlternativeBillingEntitlementResult;
      const report = getAlternativeBillingReportResult(entitlement);

      return {
        paymentId: detail.paymentId,
        payHistId: detail.payHistId ?? null,
        merchantPayKey: detail.merchantPayKey,
        amount: detail.totalPayAmount,
        admissionYmdt: detail.admissionYmdt ?? null,
        alreadyComplete: json.code === 'AlreadyComplete',
        entitlement,
        report,
      };
    }

    throw new Error(
      `Naver Pay apply failed: ${json.code} ${json.message ?? ''}`,
    );
  },
});
