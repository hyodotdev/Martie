import {getAuthUserId as getLegacyAuthUserId} from '@convex-dev/auth-v1/server';
import {components} from '../_generated/api';
import type {Id} from '../_generated/dataModel';
import type {ActionCtx, MutationCtx, QueryCtx} from '../_generated/server';

// Convex Auth 2 issues tokens from `${CONVEX_CLOUD_URL}/components/auth`.
// Every other token comes from Convex Auth 0.0.x, which apps older than
// 2.8.0 still use.
const SESSION_ISSUER_SUFFIX = '/components/auth';

/** The signed-in user, from either generation of Convex Auth tokens. */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<Id<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return null;
  if (!identity.issuer.endsWith(SESSION_ISSUER_SUFFIX)) {
    return getLegacyAuthUserId(ctx);
  }
  // A Convex Auth 2 token names a session, which lives until sign-out,
  // revocation or expiry. This is the lookup of its `getAuthUserId`.
  const session = await ctx.runQuery(components.auth.public.getSession, {
    sessionId: identity.subject,
  });
  return session === null ? null : (session.userId as Id<'users'>);
}
