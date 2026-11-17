import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const purchasesTable = defineTable({
  userId: v.id('userProfiles'),
  productId: v.string(),
  amount: v.number(),
  currency: v.string(),
  paymentMethod: v.string(),
  transactionId: v.string(),
  metadata: v.optional(v.any()),
  alternativeBillingProvider: v.optional(
    v.union(v.literal('toss'), v.literal('naver')),
  ),
  alternativeBillingPackageName: v.optional(v.string()),
  alternativeBillingIsSandbox: v.optional(v.boolean()),
  alternativeBillingTransactionToken: v.optional(v.string()),
  alternativeBillingTransactionTime: v.optional(v.string()),
  alternativeBillingReportStatus: v.optional(
    v.union(
      v.literal('pending'),
      v.literal('retrying'),
      v.literal('reported'),
      v.literal('skipped'),
      v.literal('failed'),
    ),
  ),
  alternativeBillingReportAttempts: v.optional(v.number()),
  alternativeBillingNextRetryAt: v.optional(v.number()),
  alternativeBillingLastError: v.optional(v.string()),
  alternativeBillingReportedAt: v.optional(v.number()),
  alternativeBillingProviderTransactionId: v.optional(v.string()),
  createdAt: v.number(),
})
  .index('by_userId', ['userId'])
  .index('by_transactionId', ['transactionId']);
