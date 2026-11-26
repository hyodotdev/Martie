'use node';
import {action, internalAction, type ActionCtx} from './_generated/server';
import {internal} from './_generated/api';
import type {Doc, Id} from './_generated/dataModel';
import {google} from 'googleapis';
import {v} from 'convex/values';
import {getGoogleServiceAccountAuth} from './iap';
import {getAuthUserId} from './utils/auth';

const TOSS_API_BASE = 'https://api.tosspayments.com';
const TOSS_PAYMENT_METHOD_ALT = 'toss_alternative_billing';
const TOSS_PAYMENT_METHOD_TEST = 'toss_test';
const MAX_REPORT_ATTEMPTS = 20;

// Mirrors MOCK_TOSS_PAYMENT_KEY_PREFIX in src/utils/alternativeBilling.ts
// (duplicated: convex cannot import the client util chain).
const MOCK_PAYMENT_KEY_PREFIX = 'MOCK-TOSS-';
const MOCK_PAYMENT_DEPLOYMENT = 'https://blessed-chameleon-803.convex.cloud';

// Server-side KRW price table for Toss alternative-billing orders.
// Must stay in sync with Play Console pricing and the client fallback.
// Verified against Play Console KR pricing on 2026-09-26.
const BULB_PACK_KRW: Record<string, number> = {
  'dev.hyo.martie.10bulbs': 1400,
  'dev.hyo.martie.30bulbs': 3800,
};

type TossPaymentResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  method?: string;
};

type TossErrorResponse = {
  code: string;
  message: string;
};

export type AlternativeBillingEntitlementResult = {
  purchaseId: Id<'purchases'>;
  alreadyRecorded: boolean;
  bulbsGranted: number;
  reportStatus: 'pending' | 'retrying' | 'reported' | 'skipped' | 'failed';
  reportAttempts: number;
};

export type AlternativeBillingReportResult =
  | {status: 'reported'; createTime: string | null}
  | {status: 'pending'; attempts: number}
  | {status: 'failed'; attempts: number}
  | {status: 'skipped'};

export const getAlternativeBillingReportResult = (
  entitlement: AlternativeBillingEntitlementResult,
): AlternativeBillingReportResult => {
  switch (entitlement.reportStatus) {
    case 'reported':
      return {status: 'reported', createTime: null};
    case 'skipped':
      return {status: 'skipped'};
    case 'failed':
      return {status: 'failed', attempts: entitlement.reportAttempts};
    default:
      return {status: 'pending', attempts: entitlement.reportAttempts};
  }
};

type TossConfirmResult = {
  paymentKey: string;
  orderId: string;
  amount: number;
  status: string;
  method: string | null;
  approvedAt: string | null;
  alreadyConfirmed: boolean;
  entitlement: AlternativeBillingEntitlementResult;
  report: AlternativeBillingReportResult;
};

const getTossSecretKey = (): string => {
  const key = process.env.TOSS_SECRET_KEY;

  if (!key) {
    throw new Error('TOSS_SECRET_KEY is not configured');
  }

  return key;
};

const tossAuthHeader = (secretKey: string): string =>
  `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

const confirmWithToss = async (
  secretKey: string,
  body: {paymentKey: string; orderId: string; amount: number},
): Promise<{
  ok: boolean;
  status: number;
  json: TossPaymentResponse & TossErrorResponse;
}> => {
  const res = await fetch(`${TOSS_API_BASE}/v1/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: tossAuthHeader(secretKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as TossPaymentResponse & TossErrorResponse;

  return {ok: res.ok, status: res.status, json};
};

const getTossPayment = async (
  secretKey: string,
  paymentKey: string,
): Promise<TossPaymentResponse & TossErrorResponse> => {
  const res = await fetch(
    `${TOSS_API_BASE}/v1/payments/${encodeURIComponent(paymentKey)}`,
    {
      method: 'GET',
      headers: {Authorization: tossAuthHeader(secretKey)},
    },
  );

  return (await res.json()) as TossPaymentResponse & TossErrorResponse;
};

const getErrorMessage = (error: unknown, transactionToken?: string): string => {
  const message =
    error instanceof Error ? error.message : 'Google reporting request failed';
  return transactionToken
    ? message.split(transactionToken).join('[redacted]')
    : message;
};

const isAlreadyReportedError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {code?: unknown; response?: {status?: unknown}};
  return candidate.code === 409 || candidate.response?.status === 409;
};

const reportPurchaseToGoogle = async (
  purchase: Doc<'purchases'>,
): Promise<{createTime: string | null}> => {
  const provider = purchase.alternativeBillingProvider;
  const packageName = purchase.alternativeBillingPackageName;
  const transactionToken = purchase.alternativeBillingTransactionToken;
  const transactionTime = purchase.alternativeBillingTransactionTime;

  if (!provider || !packageName || !transactionToken || !transactionTime) {
    throw new Error('Alternative billing report data is incomplete');
  }

  if (process.env.GOOGLE_REPORT_ALT_BILLING !== '1') {
    throw new Error('GOOGLE_REPORT_ALT_BILLING is not enabled');
  }

  const isSandbox =
    purchase.alternativeBillingIsSandbox ?? (provider === 'toss'
      ? !(process.env.TOSS_SECRET_KEY ?? '').startsWith('live_')
      : process.env.NAVER_PAY_MODE !== 'production');
  if (isSandbox && process.env.GOOGLE_REPORT_ALT_BILLING_TEST_ORDERS !== '1') {
    throw new Error('Google reporting for sandbox orders is not enabled');
  }

  if (!Number.isInteger(purchase.amount) || purchase.amount <= 0) {
    throw new Error(`Invalid report amount: ${purchase.amount}`);
  }

  const totalMicros = Math.round(purchase.amount * 1_000_000);
  const preTaxMicros = Math.round(totalMicros / 1.1);
  const taxMicros = totalMicros - preTaxMicros;
  const auth = getGoogleServiceAccountAuth();
  const androidpublisher = google.androidpublisher({version: 'v3', auth});
  const response =
    await androidpublisher.externaltransactions.createexternaltransaction({
      parent: `applications/${packageName}`,
      externalTransactionId: purchase.transactionId,
      requestBody: {
        oneTimeTransaction: {externalTransactionToken: transactionToken},
        originalPreTaxAmount: {
          currency: 'KRW',
          priceMicros: String(preTaxMicros),
        },
        originalTaxAmount: {
          currency: 'KRW',
          priceMicros: String(taxMicros),
        },
        transactionTime,
        userTaxAddress: {regionCode: 'KR'},
      },
    });

  return {createTime: response.data.createTime ?? null};
};

const processAlternativeBillingReportNow = async (
  ctx: ActionCtx,
  transactionId: string,
  attempts?: number,
): Promise<AlternativeBillingReportResult> => {
  const purchase = await ctx.runQuery(
    internal.purchase.queries.getAlternativeBillingPurchase,
    {transactionId},
  );
  if (!purchase) {
    throw new Error(`Alternative billing purchase not found: ${transactionId}`);
  }

  if (purchase.alternativeBillingReportStatus === 'reported') {
    return {status: 'reported', createTime: null};
  }
  if (purchase.alternativeBillingReportStatus === 'skipped') {
    return {status: 'skipped'};
  }
  if (purchase.alternativeBillingReportStatus === 'failed') {
    return {
      status: 'failed',
      attempts: purchase.alternativeBillingReportAttempts ?? 0,
    };
  }
  // Keep scheduled jobs created by the previous version resumable.
  if (attempts === undefined) {
    const previousAttempts = purchase.alternativeBillingReportAttempts ?? 0;
    await ctx.runMutation(
      internal.purchase.mutations.dispatchAlternativeBillingReport,
      {transactionId, attempts: previousAttempts},
    );
    return {status: 'pending', attempts: previousAttempts};
  }
  if (
    attempts < 1 ||
    attempts > MAX_REPORT_ATTEMPTS ||
    purchase.alternativeBillingReportAttempts !== attempts
  ) {
    return {
      status: 'pending',
      attempts: purchase.alternativeBillingReportAttempts ?? 0,
    };
  }

  try {
    const result = await reportPurchaseToGoogle(purchase);
    await ctx.runMutation(
      internal.purchase.mutations.markAlternativeBillingReported,
      {transactionId, attempts},
    );
    console.log(`[alt-billing] reported order ${transactionId}`);
    return {status: 'reported', createTime: result.createTime};
  } catch (error) {
    if (isAlreadyReportedError(error)) {
      await ctx.runMutation(
        internal.purchase.mutations.markAlternativeBillingReported,
        {transactionId, attempts},
      );
      console.log(`[alt-billing] order ${transactionId} was already reported`);
      return {status: 'reported', createTime: null};
    }

    const exhausted = attempts >= MAX_REPORT_ATTEMPTS;
    const message = getErrorMessage(
      error,
      purchase.alternativeBillingTransactionToken,
    );
    await ctx.runMutation(
      internal.purchase.mutations.markAlternativeBillingReportRetry,
      {
        transactionId,
        attempts,
        error: message,
      },
    );

    console.error(
      `[alt-billing] report ${exhausted ? 'failed' : 'retry scheduled'} for ${transactionId}: ${message}`,
    );
    return exhausted
      ? {status: 'failed', attempts}
      : {status: 'pending', attempts};
  }
};

export const processAlternativeBillingReport = internalAction({
  args: {transactionId: v.string(), attempts: v.optional(v.number())},
  handler: async (ctx, {transactionId, attempts}) =>
    await processAlternativeBillingReportNow(ctx, transactionId, attempts),
});

// Confirm a Toss widget payment server-side after the client receives
// paymentKey/orderId/amount from the Toss SDK.
export const confirmPayment = action({
  args: {
    paymentKey: v.string(),
    orderId: v.string(),
    amount: v.number(),
    productId: v.string(),
    packageName: v.string(),
    transactionToken: v.string(),
    reportRequired: v.boolean(),
  },
  handler: async (
    ctx,
    {
      paymentKey,
      orderId,
      amount,
      productId,
      packageName,
      transactionToken,
      reportRequired,
    },
  ): Promise<TossConfirmResult> => {
    if (!(await getAuthUserId(ctx))) {
      throw new Error('Sign in is required for alternative billing');
    }
    if (packageName !== 'dev.hyo.martie') {
      throw new Error('Invalid alternative billing package');
    }

    const expected = BULB_PACK_KRW[productId];

    if (expected === undefined) {
      throw new Error(`Unknown productId for Toss payment: ${productId}`);
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error(`Invalid Toss amount: ${amount}`);
    }

    if (amount !== expected) {
      throw new Error(
        `Toss amount mismatch for ${productId}: got ${amount}, expected ${expected}`,
      );
    }
    if (reportRequired && !transactionToken.trim()) {
      throw new Error('Missing external transaction token');
    }

    const secretKey = getTossSecretKey();
    if (secretKey.startsWith('live_') && !reportRequired) {
      throw new Error('Google reporting is required for live alternative billing');
    }

    // Test-mode simulated approval (see prefix comment above). Amount and
    // product validations above still apply; only the Toss API call is
    // skipped, and only with a test secret.
    if (paymentKey.startsWith(MOCK_PAYMENT_KEY_PREFIX)) {
      if (
        !secretKey.startsWith('test_') ||
        reportRequired ||
        process.env.CONVEX_CLOUD_URL !== MOCK_PAYMENT_DEPLOYMENT
      ) {
        throw new Error('Mock Toss payments are only allowed in the test deployment');
      }

      const approvedAt = new Date().toISOString();
      const entitlement = (await ctx.runMutation(
        internal.purchase.mutations.finalizeAlternativeBillingPurchase,
        {
          provider: 'toss',
          packageName,
          productId,
          amountKrw: amount,
          paymentMethod: reportRequired
            ? TOSS_PAYMENT_METHOD_ALT
            : TOSS_PAYMENT_METHOD_TEST,
          transactionId: orderId,
          transactionToken,
          transactionTime: approvedAt,
          providerTransactionId: paymentKey,
          reportRequired,
          isSandbox: true,
        },
      )) as AlternativeBillingEntitlementResult;
      const report = getAlternativeBillingReportResult(entitlement);

      return {
        paymentKey,
        orderId,
        amount,
        status: 'DONE',
        method: 'MOCK',
        approvedAt,
        alreadyConfirmed: false,
        entitlement,
        report,
      };
    }

    const {ok, status, json} = await confirmWithToss(secretKey, {
      paymentKey,
      orderId,
      amount,
    });

    if (ok) {
      if (
        json.orderId !== orderId ||
        json.totalAmount !== amount ||
        json.paymentKey !== paymentKey
      ) {
        throw new Error('Toss confirm response does not match the order');
      }
      if (json.status !== 'DONE') {
        throw new Error('Toss payment is not completed');
      }

      const transactionTime = json.approvedAt ?? new Date().toISOString();
      const entitlement = (await ctx.runMutation(
        internal.purchase.mutations.finalizeAlternativeBillingPurchase,
        {
          provider: 'toss',
          packageName,
          productId,
          amountKrw: json.totalAmount,
          paymentMethod: reportRequired
            ? TOSS_PAYMENT_METHOD_ALT
            : TOSS_PAYMENT_METHOD_TEST,
          transactionId: json.orderId,
          transactionToken,
          transactionTime,
          providerTransactionId: json.paymentKey,
          reportRequired,
          isSandbox: !secretKey.startsWith('live_'),
        },
      )) as AlternativeBillingEntitlementResult;
      const report = getAlternativeBillingReportResult(entitlement);

      return {
        paymentKey: json.paymentKey,
        orderId: json.orderId,
        amount: json.totalAmount,
        status: json.status,
        method: json.method ?? null,
        approvedAt: json.approvedAt ?? null,
        alreadyConfirmed: false,
        entitlement,
        report,
      };
    }

    // Retry-safe: a confirm retried after success returns
    // ALREADY_PROCESSED_PAYMENT — recover by reading the payment instead.
    if (json.code === 'ALREADY_PROCESSED_PAYMENT') {
      const payment = await getTossPayment(secretKey, paymentKey);

      if (
        payment.orderId !== orderId ||
        payment.totalAmount !== amount ||
        payment.paymentKey !== paymentKey
      ) {
        throw new Error('Toss payment does not match the order');
      }
      if (payment.status !== 'DONE') {
        throw new Error('Toss payment is not completed');
      }

      const transactionTime = payment.approvedAt ?? new Date().toISOString();
      const entitlement = (await ctx.runMutation(
        internal.purchase.mutations.finalizeAlternativeBillingPurchase,
        {
          provider: 'toss',
          packageName,
          productId,
          amountKrw: payment.totalAmount,
          paymentMethod: reportRequired
            ? TOSS_PAYMENT_METHOD_ALT
            : TOSS_PAYMENT_METHOD_TEST,
          transactionId: payment.orderId,
          transactionToken,
          transactionTime,
          providerTransactionId: payment.paymentKey,
          reportRequired,
          isSandbox: !secretKey.startsWith('live_'),
        },
      )) as AlternativeBillingEntitlementResult;
      const report = getAlternativeBillingReportResult(entitlement);

      return {
        paymentKey: payment.paymentKey,
        orderId: payment.orderId,
        amount: payment.totalAmount,
        status: payment.status,
        method: payment.method ?? null,
        approvedAt: payment.approvedAt ?? null,
        alreadyConfirmed: true,
        entitlement,
        report,
      };
    }

    throw new Error(
      `Toss confirm failed: ${json.code ?? status} ${json.message ?? ''}`,
    );
  },
});
