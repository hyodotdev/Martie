import {v} from 'convex/values';
import {internalQuery} from '../_generated/server';

export const getAlternativeBillingPurchase = internalQuery({
  args: {transactionId: v.string()},
  handler: async (ctx, {transactionId}) =>
    await ctx.db
      .query('purchases')
      .withIndex('by_transactionId', (q) =>
        q.eq('transactionId', transactionId),
      )
      .first(),
});
