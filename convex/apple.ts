'use node';
import {getAuthUserId} from '@convex-dev/auth/server';
import {
  Environment,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
} from '@apple/app-store-server-library';
import type {JWSTransactionDecodedPayload} from '@apple/app-store-server-library';
import {ConvexError, v} from 'convex/values';
import {v5 as uuidv5} from 'uuid';
import {internal} from './_generated/api';
import type {Id} from './_generated/dataModel';
import {action} from './_generated/server';
import {getAppleRootCertificates} from './appleRootCertificates';

const BUNDLE_ID = 'dev.hyo.martie';
const APP_APPLE_ID = 6740057833;
const MAX_JWS_LENGTH = 16384;
const EXPECTED_TYPES: Record<string, string> = {
  'dev.hyo.martie.10bulbs': 'Consumable',
  'dev.hyo.martie.30bulbs': 'Consumable',
  'dev.hyo.martie.certified': 'Non-Consumable',
  'dev.hyo.martie.premium': 'Auto-Renewable Subscription',
  'dev.hyo.martie.premium_year': 'Auto-Renewable Subscription',
};
const SUBSCRIPTIONS = ['dev.hyo.martie.premium', 'dev.hyo.martie.premium_year'];

// Older restored transactions may lack an account token.
export const expectedAppAccountToken = (userId: string): string =>
  uuidv5(`martie:user:${userId}`, uuidv5.URL);

const isSandboxAllowed = (): boolean =>
  process.env.APPLE_IAP_ALLOW_SANDBOX === 'true';

const isInvalidEnvironment = (error: unknown): boolean =>
  error instanceof VerificationException &&
  error.status === VerificationStatus.INVALID_ENVIRONMENT;

const decodeTransaction = async (
  signedTransaction: string,
): Promise<JWSTransactionDecodedPayload> => {
  const roots = getAppleRootCertificates();
  try {
    const production = new SignedDataVerifier(
      roots,
      true,
      Environment.PRODUCTION,
      BUNDLE_ID,
      APP_APPLE_ID,
    );
    return await production.verifyAndDecodeTransaction(signedTransaction);
  } catch (error) {
    if (!isInvalidEnvironment(error)) throw error;
    if (!isSandboxAllowed())
      throw new ConvexError('Apple sandbox purchases are not accepted');
    const sandbox = new SignedDataVerifier(
      roots,
      true,
      Environment.SANDBOX,
      BUNDLE_ID,
    );
    return await sandbox.verifyAndDecodeTransaction(signedTransaction);
  }
};

export const verifyApplePurchase = action({
  args: {
    signedTransaction: v.string(),
    productId: v.string(),
  },
  returns: v.object({
    purchaseId: v.id('purchases'),
    alreadyRecorded: v.boolean(),
    bulbsGranted: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    purchaseId: Id<'purchases'>;
    alreadyRecorded: boolean;
    bulbsGranted: number;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      throw new ConvexError('Sign in is required for Apple purchases');
    if (
      !EXPECTED_TYPES[args.productId] ||
      !args.signedTransaction.trim() ||
      args.signedTransaction.length > MAX_JWS_LENGTH
    ) {
      throw new ConvexError('Invalid Apple purchase request');
    }
    let decoded: JWSTransactionDecodedPayload;
    try {
      decoded = await decodeTransaction(args.signedTransaction);
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      // Verifier errors can echo the submitted JWS.
      throw new ConvexError('Apple purchase verification failed');
    }
    const transactionId = decoded.transactionId;
    if (!transactionId || typeof transactionId !== 'string') {
      throw new ConvexError('Apple transaction is missing its identifier');
    }
    if (decoded.productId !== args.productId) {
      throw new ConvexError('Apple purchase product mismatch');
    }
    if (decoded.type !== EXPECTED_TYPES[args.productId]) {
      throw new ConvexError('Unsupported Apple product');
    }
    if (
      decoded.inAppOwnershipType &&
      decoded.inAppOwnershipType !== 'PURCHASED'
    ) {
      throw new ConvexError('Apple family-shared purchases are not supported');
    }
    // The signed payload records revocation only at signing time; it is not
    // a live refund-status lookup.
    if (decoded.revocationDate != null || decoded.revocationReason != null) {
      throw new ConvexError('Apple transaction was revoked or refunded');
    }
    if (decoded.isUpgraded) {
      throw new ConvexError('Apple subscription was upgraded');
    }
    const subscription = SUBSCRIPTIONS.includes(args.productId);
    const expiry = decoded.expiresDate;
    if (subscription && (expiry == null || expiry <= Date.now())) {
      throw new ConvexError('Apple subscription has expired');
    }
    const quantity = decoded.quantity ?? 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new ConvexError('Invalid Apple purchase quantity');
    }
    if (decoded.appAccountToken) {
      if (decoded.appAccountToken !== expectedAppAccountToken(userId)) {
        throw new ConvexError('Apple purchase belongs to another account');
      }
    }
    const price = decoded.price;
    const currency = decoded.currency;
    if (
      price == null ||
      !Number.isFinite(price) ||
      price < 0 ||
      !currency ||
      !/^[A-Z]{3}$/.test(currency)
    ) {
      throw new ConvexError('Apple transaction is missing price information');
    }
    return await ctx.runMutation(
      internal.applePurchases.finalizeApplePurchase,
      {
        userId,
        productId: args.productId,
        transactionId,
        quantity,
        expiryTimeMillis: expiry,
        amount: price / 1000,
        currency,
      },
    );
  },
});
