import {v} from 'convex/values';
import {internalMutation} from './_generated/server';

const SUB_MONTHLY = 'dev.hyo.martie.premium';
const SUB_YEARLY = 'dev.hyo.martie.premium_year';
const PREMIUM_SUBSCRIPTION_IDS = [SUB_MONTHLY, SUB_YEARLY];
const CERTIFIED_BADGE_SKU = 'dev.hyo.martie.certified';
const APPLE_BULBS: Record<string, number> = {
  'dev.hyo.martie.10bulbs': 10,
  'dev.hyo.martie.30bulbs': 30,
};
const MAX_BULB_COUNT = 9999;

export const finalizeApplePurchase = internalMutation({
  args: {
    userId: v.id('users'),
    productId: v.string(),
    transactionId: v.string(),
    quantity: v.number(),
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
        existing.alternativeBillingProvider ||
        !['apple', 'ios'].includes(existing.paymentMethod))
    ) {
      throw new Error('Apple purchase belongs to another purchase or account');
    }
    const subscription = PREMIUM_SUBSCRIPTION_IDS.includes(args.productId);
    const bulbs = APPLE_BULBS[args.productId] ?? 0;
    if (!subscription && !bulbs && args.productId !== CERTIFIED_BADGE_SKU) {
      throw new Error('Unsupported Apple product');
    }
    if (
      subscription &&
      (!args.expiryTimeMillis || args.expiryTimeMillis <= Date.now())
    ) {
      throw new Error('Apple subscription has expired');
    }
    if (
      !Number.isSafeInteger(args.quantity) ||
      args.quantity < 1 ||
      args.quantity > 100
    ) {
      throw new Error('Invalid Apple purchase quantity');
    }
    if (
      !Number.isFinite(args.amount) ||
      args.amount < 0 ||
      !/^[A-Z]{3}$/.test(args.currency)
    ) {
      throw new Error('Invalid Apple purchase price');
    }
    const purchaseId =
      existing?._id ??
      (await ctx.db.insert('purchases', {
        userId: profile._id,
        productId: args.productId,
        transactionId: args.transactionId,
        paymentMethod: 'apple',
        amount: args.amount,
        currency: args.currency,
        metadata: {appleVerified: true, quantity: args.quantity},
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
