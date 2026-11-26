'use node';
import {getAuthUserId} from './utils/auth';
import {ConvexError, v} from 'convex/values';
import {google} from 'googleapis';
import {internal} from './_generated/api';
import type {Id} from './_generated/dataModel';
import {action} from './_generated/server';

const PACKAGE_NAME = 'dev.hyo.martie';
const PRODUCTS = [
  'dev.hyo.martie.10bulbs',
  'dev.hyo.martie.30bulbs',
  'dev.hyo.martie.certified',
];
const SUBSCRIPTIONS = ['dev.hyo.martie.premium', 'dev.hyo.martie.premium_year'];

export const getGoogleServiceAccountAuth = () => {
  try {
    const key: unknown = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? '',
    );
    if (
      !key ||
      typeof key !== 'object' ||
      !('client_email' in key) ||
      !('private_key' in key) ||
      typeof key.client_email !== 'string' ||
      typeof key.private_key !== 'string'
    ) {
      throw new Error('Invalid credentials');
    }
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: key.client_email,
        private_key: key.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
  } catch {
    throw new Error('Google verification credentials are unavailable');
  }
};

type VerificationResult = {
  isValid: boolean;
  expiryTimeMillis: string | null;
  entitlement: {
    purchaseId: Id<'purchases'>;
    alreadyRecorded: boolean;
    bulbsGranted: number;
  } | null;
};

export const verifyPurchase = action({
  args: {
    packageName: v.string(),
    productId: v.string(),
    purchaseToken: v.string(),
    completePurchase: v.optional(v.boolean()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<VerificationResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      throw new ConvexError('Sign in is required for Google purchases');
    const isSubscription = SUBSCRIPTIONS.includes(args.productId);
    if (
      args.packageName !== PACKAGE_NAME ||
      (!isSubscription && !PRODUCTS.includes(args.productId)) ||
      !args.purchaseToken.trim() ||
      args.purchaseToken.length > 4096
    ) {
      throw new ConvexError('Invalid Google purchase request');
    }
    const amount = args.amount ?? 0;
    const currency = args.currency ?? 'USD';
    if (
      !Number.isFinite(amount) ||
      amount < 0 ||
      !/^[A-Z]{3}$/.test(currency)
    ) {
      throw new ConvexError('Invalid purchase display price');
    }

    let valid = false;
    let expiry: number | undefined;
    let quantity = 1;
    let consumed = false;
    let accountId: string | null | undefined;
    try {
      const publisher = google.androidpublisher({
        version: 'v3',
        auth: getGoogleServiceAccountAuth(),
      });
      if (isSubscription) {
        const {data} = await publisher.purchases.subscriptionsv2.get({
          packageName: PACKAGE_NAME,
          token: args.purchaseToken,
        });
        const item = data.lineItems?.find(
          (line) => line.productId === args.productId,
        );
        expiry = Date.parse(item?.expiryTime ?? '');
        valid =
          Number.isFinite(expiry) &&
          expiry > Date.now() &&
          [
            'SUBSCRIPTION_STATE_ACTIVE',
            'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
            'SUBSCRIPTION_STATE_CANCELED',
          ].includes(data.subscriptionState ?? '');
        accountId =
          data.externalAccountIdentifiers?.obfuscatedExternalAccountId;
      } else {
        const {data} = await publisher.purchases.products.get({
          packageName: PACKAGE_NAME,
          productId: args.productId,
          token: args.purchaseToken,
        });
        quantity = data.quantity ?? 1;
        valid =
          data.purchaseState === 0 &&
          Number.isSafeInteger(quantity) &&
          quantity > 0 &&
          quantity <= 100 &&
          (!data.productId || data.productId === args.productId) &&
          (data.refundableQuantity == null ||
            data.refundableQuantity === quantity);
        consumed = data.consumptionState === 1;
        accountId = data.obfuscatedExternalAccountId;
      }
    } catch {
      // Google errors can contain authorization headers and request tokens.
      throw new ConvexError('Google purchase verification failed');
    }
    if (accountId && accountId !== userId) {
      throw new ConvexError('Google purchase belongs to another account');
    }
    if (!valid)
      return {isValid: false, expiryTimeMillis: null, entitlement: null};
    const entitlement = args.completePurchase
      ? await ctx.runMutation(
          internal.purchase.mutations.finalizeGooglePurchase,
          {
            userId,
            productId: args.productId,
            transactionId: args.purchaseToken,
            quantity,
            consumed,
            expiryTimeMillis: expiry,
            amount,
            currency,
          },
        )
      : null;
    return {
      isValid: true,
      expiryTimeMillis: expiry === undefined ? null : String(expiry),
      entitlement,
    };
  },
});
