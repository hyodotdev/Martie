import {v} from 'convex/values';
import {internalMutation} from '../_generated/server';
import {getAuthUserId} from '@convex-dev/auth/server';
import {internal} from '../_generated/api';

const SUB_MONTHLY = 'dev.hyo.martie.premium';
const SUB_YEARLY = 'dev.hyo.martie.premium_year';
const PREMIUM_SUBSCRIPTION_IDS = [SUB_MONTHLY, SUB_YEARLY];
const CERTIFIED_BADGE_SKU = 'dev.hyo.martie.certified';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BULB_COUNT = 9999;
const MAX_REPORT_ATTEMPTS = 20;
// Node actions stop after ten minutes; recover an interrupted report after that.
const REPORT_WATCHDOG_MS = 11 * 60_000;
const REPORT_RETRY_BASE_MS = 60_000;
const REPORT_RETRY_MAX_MS = 60 * 60_000;
const ALT_BILLING_BULBS: Record<string, number> = {
  'dev.hyo.martie.10bulbs': 10,
  'dev.hyo.martie.30bulbs': 30,
};

const getPremiumDurationMs = (productId: string): number =>
  productId === SUB_YEARLY ? 365 * DAY_MS : 30 * DAY_MS;

/**
 * Grant an Amazon Appstore purchase after `amazon:verifyAmazonPurchase`
 * checked the receipt with Amazon RVS. Idempotent per receipt.
 */
export const finalizeAmazonPurchase = internalMutation({
  args: {
    userId: v.id('users'),
    productId: v.string(),
    transactionId: v.string(),
    amount: v.number(),
    currency: v.string(),
    sandbox: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();
    if (!profile || profile.deletedAt)
      throw new Error('Purchase account is unavailable');
    const existing = await ctx.db
      .query('purchases')
      .withIndex('by_transactionId', (q) =>
        q.eq('transactionId', args.transactionId),
      )
      .first();
    if (
      existing &&
      (existing.userId !== profile._id || existing.productId !== args.productId)
    ) {
      throw new Error('Amazon purchase belongs to another purchase or account');
    }
    const subscription = PREMIUM_SUBSCRIPTION_IDS.includes(args.productId);
    const bulbs = ALT_BILLING_BULBS[args.productId] ?? 0;
    if (!subscription && !bulbs && args.productId !== CERTIFIED_BADGE_SKU) {
      throw new Error('Unsupported Amazon product');
    }
    const purchaseId =
      existing?._id ??
      (await ctx.db.insert('purchases', {
        userId: profile._id,
        productId: args.productId,
        transactionId: args.transactionId,
        paymentMethod: 'amazon',
        amount: args.amount,
        currency: args.currency,
        metadata: {amazonVerified: true, sandbox: args.sandbox},
        createdAt: Date.now(),
      }));
    if (existing) {
      return {purchaseId, alreadyRecorded: true, bulbsGranted: 0};
    }
    if (subscription) {
      await ctx.db.patch(profile._id, {
        isPremium: true,
        premiumExpiration:
          Math.max(profile.premiumExpiration ?? 0, Date.now()) +
          getPremiumDurationMs(args.productId),
        updatedAt: new Date().toISOString(),
      });
    } else if (args.productId === CERTIFIED_BADGE_SKU) {
      await ctx.db.patch(profile._id, {
        hasCertifiedBadge: true,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.patch(profile._id, {
        bulbCount: Math.min(
          MAX_BULB_COUNT,
          Math.max(0, profile.bulbCount ?? 0) + bulbs,
        ),
        updatedAt: new Date().toISOString(),
      });
    }
    return {purchaseId, alreadyRecorded: false, bulbsGranted: bulbs};
  },
});

export const finalizeGooglePurchase = internalMutation({
  args: {
    userId: v.id('users'),
    productId: v.string(),
    transactionId: v.string(),
    quantity: v.number(),
    consumed: v.boolean(),
    expiryTimeMillis: v.optional(v.number()),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();
    if (!profile || profile.deletedAt)
      throw new Error('Purchase account is unavailable');
    const existing = await ctx.db
      .query('purchases')
      .withIndex('by_transactionId', (q) =>
        q.eq('transactionId', args.transactionId),
      )
      .first();
    if (
      existing &&
      (existing.userId !== profile._id ||
        existing.productId !== args.productId ||
        existing.alternativeBillingProvider)
    ) {
      throw new Error('Google purchase belongs to another purchase or account');
    }
    const subscription = PREMIUM_SUBSCRIPTION_IDS.includes(args.productId);
    const bulbs = ALT_BILLING_BULBS[args.productId] ?? 0;
    if (!subscription && !bulbs && args.productId !== CERTIFIED_BADGE_SKU) {
      throw new Error('Unsupported Google product');
    }
    if (
      subscription &&
      (!args.expiryTimeMillis || args.expiryTimeMillis <= Date.now())
    ) {
      throw new Error('Google subscription has expired');
    }
    if (
      !Number.isSafeInteger(args.quantity) ||
      args.quantity < 1 ||
      args.quantity > 100
    ) {
      throw new Error('Invalid Google purchase quantity');
    }
    // Old consumed orders without a ledger entry require reconciliation, not a
    // second automatic grant. Recorded orders remain safe to retry after consume.
    if (!existing && bulbs && args.consumed) {
      throw new Error('Consumed Google purchase requires reconciliation');
    }
    const purchaseId =
      existing?._id ??
      (await ctx.db.insert('purchases', {
        userId: profile._id,
        productId: args.productId,
        transactionId: args.transactionId,
        paymentMethod: 'google',
        amount: args.amount,
        currency: args.currency,
        metadata: {googleVerified: true, quantity: args.quantity},
        createdAt: Date.now(),
      }));
    if (subscription) {
      await ctx.db.patch(profile._id, {
        isPremium: true,
        premiumExpiration: Math.max(
          profile.premiumExpiration ?? 0,
          args.expiryTimeMillis ?? 0,
        ),
        updatedAt: new Date().toISOString(),
      });
    } else if (args.productId === CERTIFIED_BADGE_SKU) {
      await ctx.db.patch(profile._id, {
        hasCertifiedBadge: true,
        updatedAt: new Date().toISOString(),
      });
    } else if (!existing) {
      await ctx.db.patch(profile._id, {
        bulbCount: Math.min(
          MAX_BULB_COUNT,
          Math.max(0, profile.bulbCount ?? 0) + bulbs * args.quantity,
        ),
        updatedAt: new Date().toISOString(),
      });
    }
    return {
      purchaseId,
      alreadyRecorded: !!existing,
      bulbsGranted: existing ? 0 : bulbs * args.quantity,
    };
  },
});

export const finalizeAlternativeBillingPurchase = internalMutation({
  args: {
    provider: v.union(v.literal('toss'), v.literal('naver')),
    packageName: v.string(),
    productId: v.string(),
    amountKrw: v.number(),
    paymentMethod: v.string(),
    transactionId: v.string(),
    transactionToken: v.string(),
    transactionTime: v.string(),
    providerTransactionId: v.string(),
    reportRequired: v.boolean(),
    isSandbox: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Sign in is required for alternative billing');
    }

    const bulbsToGrant = ALT_BILLING_BULBS[args.productId];
    if (!bulbsToGrant) {
      throw new Error(`Unknown alternative billing product: ${args.productId}`);
    }

    if (!Number.isInteger(args.amountKrw) || args.amountKrw <= 0) {
      throw new Error(`Invalid alternative billing amount: ${args.amountKrw}`);
    }

    if (args.reportRequired && !args.transactionToken.trim()) {
      throw new Error('Missing external transaction token');
    }

    const userProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
    if (!userProfile) {
      throw new Error('User profile not found. Please try signing in again.');
    }

    const existingPurchase = await ctx.db
      .query('purchases')
      .withIndex('by_transactionId', (q) =>
        q.eq('transactionId', args.transactionId),
      )
      .first();
    if (existingPurchase) {
      if (
        existingPurchase.userId !== userProfile._id ||
        existingPurchase.productId !== args.productId ||
        existingPurchase.alternativeBillingProvider !== args.provider ||
        existingPurchase.alternativeBillingProviderTransactionId !==
          args.providerTransactionId ||
        existingPurchase.amount !== args.amountKrw ||
        existingPurchase.alternativeBillingPackageName !== args.packageName
      ) {
        throw new Error(
          'Alternative billing transaction already belongs to another purchase',
        );
      }

      return {
        purchaseId: existingPurchase._id,
        alreadyRecorded: true,
        bulbsGranted: 0,
        reportStatus:
          existingPurchase.alternativeBillingReportStatus ?? 'skipped',
        reportAttempts: existingPurchase.alternativeBillingReportAttempts ?? 0,
      };
    }

    const now = Date.now();
    const reportStatus = args.reportRequired ? 'pending' : 'skipped';
    const purchaseId = await ctx.db.insert('purchases', {
      userId: userProfile._id,
      productId: args.productId,
      amount: args.amountKrw,
      currency: 'KRW',
      paymentMethod: args.paymentMethod,
      transactionId: args.transactionId,
      alternativeBillingProvider: args.provider,
      alternativeBillingPackageName: args.packageName,
      alternativeBillingIsSandbox: args.isSandbox,
      alternativeBillingTransactionToken: args.reportRequired
        ? args.transactionToken.trim()
        : undefined,
      alternativeBillingTransactionTime: args.transactionTime,
      alternativeBillingReportStatus: reportStatus,
      alternativeBillingReportAttempts: 0,
      alternativeBillingProviderTransactionId: args.providerTransactionId,
      createdAt: now,
    });
    const currentBulbs = userProfile.bulbCount ?? 0;
    const nextBulbs = Math.min(currentBulbs + bulbsToGrant, MAX_BULB_COUNT);

    await ctx.db.patch(userProfile._id, {
      bulbCount: nextBulbs,
      updatedAt: new Date(now).toISOString(),
    });

    if (args.reportRequired) {
      await ctx.scheduler.runAfter(
        0,
        internal.purchase.mutations.dispatchAlternativeBillingReport,
        {transactionId: args.transactionId, attempts: 0},
      );
    }

    return {
      purchaseId,
      alreadyRecorded: false,
      bulbsGranted: nextBulbs - currentBulbs,
      reportStatus,
      reportAttempts: 0,
    };
  },
});

export const dispatchAlternativeBillingReport = internalMutation({
  args: {transactionId: v.string(), attempts: v.number()},
  handler: async (ctx, {transactionId, attempts}): Promise<void> => {
    const purchase = await ctx.db
      .query('purchases')
      .withIndex('by_transactionId', (q) =>
        q.eq('transactionId', transactionId),
      )
      .first();
    if (
      !purchase ||
      purchase.alternativeBillingReportStatus === 'reported' ||
      purchase.alternativeBillingReportStatus === 'skipped' ||
      purchase.alternativeBillingReportStatus === 'failed' ||
      (purchase.alternativeBillingReportAttempts ?? 0) !== attempts ||
      (purchase.alternativeBillingNextRetryAt ?? 0) > Date.now()
    ) {
      return;
    }

    if (attempts >= MAX_REPORT_ATTEMPTS) {
      await ctx.db.patch(purchase._id, {
        alternativeBillingReportStatus: 'failed',
        alternativeBillingNextRetryAt: undefined,
      });
      return;
    }

    const nextAttempt = attempts + 1;
    await ctx.db.patch(purchase._id, {
      alternativeBillingReportStatus: 'retrying',
      alternativeBillingReportAttempts: nextAttempt,
      alternativeBillingNextRetryAt: Date.now() + REPORT_WATCHDOG_MS,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.toss.processAlternativeBillingReport,
      {transactionId, attempts: nextAttempt},
    );
    await ctx.scheduler.runAfter(
      REPORT_WATCHDOG_MS,
      internal.purchase.mutations.dispatchAlternativeBillingReport,
      {transactionId, attempts: nextAttempt},
    );
  },
});

export const markAlternativeBillingReportRetry = internalMutation({
  args: {
    transactionId: v.string(),
    attempts: v.number(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query('purchases')
      .withIndex('by_transactionId', (q) =>
        q.eq('transactionId', args.transactionId),
      )
      .first();
    if (
      !purchase ||
      purchase.alternativeBillingReportStatus === 'reported' ||
      purchase.alternativeBillingReportStatus === 'skipped' ||
      purchase.alternativeBillingReportStatus === 'failed' ||
      purchase.alternativeBillingReportAttempts !== args.attempts
    ) {
      return;
    }

    const exhausted = args.attempts >= MAX_REPORT_ATTEMPTS;
    const delayMs = Math.min(
      REPORT_RETRY_BASE_MS * 2 ** Math.max(0, args.attempts - 1),
      REPORT_RETRY_MAX_MS,
    );
    await ctx.db.patch(purchase._id, {
      alternativeBillingReportStatus: exhausted ? 'failed' : 'retrying',
      alternativeBillingNextRetryAt: exhausted
        ? undefined
        : Date.now() + delayMs,
      alternativeBillingLastError: args.error.slice(0, 500),
    });
    if (!exhausted) {
      await ctx.scheduler.runAfter(
        delayMs,
        internal.purchase.mutations.dispatchAlternativeBillingReport,
        {transactionId: args.transactionId, attempts: args.attempts},
      );
    }
  },
});

export const markAlternativeBillingReported = internalMutation({
  args: {
    transactionId: v.string(),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query('purchases')
      .withIndex('by_transactionId', (q) =>
        q.eq('transactionId', args.transactionId),
      )
      .first();
    if (!purchase) {
      throw new Error(
        `Alternative billing purchase not found: ${args.transactionId}`,
      );
    }

    await ctx.db.patch(purchase._id, {
      alternativeBillingReportStatus: 'reported',
      alternativeBillingReportAttempts: Math.max(
        purchase.alternativeBillingReportAttempts ?? 0,
        args.attempts,
      ),
      alternativeBillingTransactionToken: undefined,
      alternativeBillingNextRetryAt: undefined,
      alternativeBillingLastError: undefined,
      alternativeBillingReportedAt: Date.now(),
    });
  },
});
