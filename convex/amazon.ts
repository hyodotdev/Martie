import {getAuthUserId} from '@convex-dev/auth/server';
import {ConvexError, v} from 'convex/values';
import {action} from './_generated/server';
import {internal} from './_generated/api';
import type {Id} from './_generated/dataModel';

const PRODUCT_TYPES: Record<
  string,
  'CONSUMABLE' | 'ENTITLED' | 'SUBSCRIPTION'
> = {
  'dev.hyo.martie.10bulbs': 'CONSUMABLE',
  'dev.hyo.martie.30bulbs': 'CONSUMABLE',
  'dev.hyo.martie.certified': 'ENTITLED',
  'dev.hyo.martie.premium': 'SUBSCRIPTION',
  'dev.hyo.martie.premium_year': 'SUBSCRIPTION',
};

type AmazonReceipt = {
  receiptId?: unknown;
  productId?: unknown;
  termSku?: unknown;
  productType?: unknown;
  cancelDate?: unknown;
  testTransaction?: unknown;
};

/**
 * Verify an Amazon Appstore receipt with Amazon RVS and grant it once.
 * Needs `AMAZON_IAP_SHARED_SECRET` (Amazon developer console → Shared Key).
 * `AMAZON_RVS_SANDBOX=true` targets the App Tester sandbox on test deployments.
 */
export const verifyAmazonPurchase = action({
  args: {
    productId: v.string(),
    receiptId: v.string(),
    amazonUserId: v.string(),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    purchaseId: Id<'purchases'>;
    alreadyRecorded: boolean;
    bulbsGranted: number;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Sign in is required for purchases');

    const expectedType = PRODUCT_TYPES[args.productId];
    const receiptId = args.receiptId.trim();
    const amazonUserId = args.amazonUserId.trim();
    if (
      !expectedType ||
      !receiptId ||
      receiptId.length > 4096 ||
      !amazonUserId ||
      amazonUserId.length > 512
    ) {
      throw new ConvexError('Invalid Amazon purchase request');
    }

    const secret = process.env.AMAZON_IAP_SHARED_SECRET?.trim();
    if (!secret) {
      throw new ConvexError('Amazon purchase verification is not configured');
    }
    const sandbox = process.env.AMAZON_RVS_SANDBOX === 'true';
    const url =
      'https://appstore-sdk.amazon.com' +
      (sandbox ? '/sandbox' : '') +
      '/version/1.0/verifyReceiptId/developer/' +
      encodeURIComponent(secret) +
      '/user/' +
      encodeURIComponent(amazonUserId) +
      '/receiptId/' +
      encodeURIComponent(receiptId);

    let receipt: AmazonReceipt;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Amazon RVS responded ${response.status}`);
      }
      receipt = (await response.json()) as AmazonReceipt;
    } catch {
      // Never echo the request URL: it contains the shared secret.
      throw new ConvexError('Amazon purchase verification failed');
    }

    const productMatches =
      receipt.productId === args.productId ||
      (expectedType === 'SUBSCRIPTION' && receipt.termSku === args.productId);
    if (
      receipt.receiptId !== receiptId ||
      !productMatches ||
      receipt.productType !== expectedType
    ) {
      throw new ConvexError('Amazon purchase does not match the product');
    }
    if (receipt.cancelDate !== null && receipt.cancelDate !== undefined) {
      throw new ConvexError('Amazon purchase was canceled');
    }
    if (receipt.testTransaction === true && !sandbox) {
      throw new ConvexError('Test purchases are not accepted here');
    }

    return await ctx.runMutation(
      internal.purchase.mutations.finalizeAmazonPurchase,
      {
        userId,
        productId: args.productId,
        transactionId: `amazon:${receiptId}`,
        amount: args.amount ?? 0,
        currency: args.currency ?? 'USD',
        sandbox,
      },
    );
  },
});
