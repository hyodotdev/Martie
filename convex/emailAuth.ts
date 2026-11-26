import {createFunctionHandle} from 'convex/server';
import {v} from 'convex/values';
import {setupConvexAuth} from '@convex-dev/auth/server';
import type {TokenBundle} from '@convex-dev/auth/react';
import {components, internal} from './_generated/api';
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from './_generated/server';
import type {Id} from './_generated/dataModel';
import {signInLinkTemplatesMartie} from './emailTemplates';
import {sendResendEmail} from './utils/resendClient';
import {parseEmailList} from './utils/emailList';
import {fixedOtpCodeFor} from './utils/fixedOtp';

// Convex Auth 2. Apps from 2.8.0 sign in with an emailed link; older apps
// keep the email codes of `convex/auth.ts` until they update.
//
// Martie's sign-in methods are custom methods on `bindMethod`, which Convex
// Auth 2.1 marks internal. Keep `@convex-dev/auth` pinned to an exact
// version and recheck this file on every upgrade.

const RESEND_API_KEY = process.env.AUTH_RESEND_KEY;
const isProduction = process.env.ENVIRONMENT === 'production';
const FROM_EMAIL = isProduction ? 'martie@hyo.dev' : 'onboarding@resend.dev';

// `https://hyo.dev/martie/*` opens the app (associated domains and Android
// app links). The email component appends the `code` query parameter.
const LINK_URL = 'https://hyo.dev/martie/sign-in-link';
const LINK_URL_PATTERN = /https:\/\/hyo\.dev\/martie\/sign-in-link\?\S+/;
const LINK_PURPOSE = 'martie/emailLink/signIn';
const LINK_TTL_MS = 10 * 60 * 1000;

const vLocale = v.union(v.literal('en'), v.literal('ko'), v.literal('ja'));
type Locale = 'en' | 'ko' | 'ja';

const isLocale = (value: string | null): value is Locale =>
  value === 'en' || value === 'ko' || value === 'ja';

type EmailProfile = {email: string};

// Explicit result types: the methods reference `internal.emailAuth`, whose
// type is inferred from this module, so inferring them would be circular.
type SendLinkResult =
  {success: true; browserSecret: string} | {success: false; error: string};
type SignInResult<Error extends string = string> =
  {status: 'complete'; tokens: TokenBundle} | {status: 'error'; error: Error};

const core = setupConvexAuth({component: components.auth});

type MethodBuilders<Profile> = ReturnType<
  typeof core.bindMethod<string, Profile>
>;

export const {refreshSession, signOut, isAuthenticated} = core;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const vEmailProfile = v.object({email: v.string()});

async function insertUser(ctx: MutationCtx, email: string) {
  return await ctx.db.insert('users', {
    email: normalizeEmail(email),
    emailVerificationTime: Date.now(),
  });
}

export const createLinkUser = internalMutation({
  args: {
    method: v.object({
      name: v.literal('martieEmailLink'),
      profile: vEmailProfile,
    }),
  },
  returns: v.id('users'),
  handler: async (ctx, {method}) => insertUser(ctx, method.profile.email),
});

export const createReviewUser = internalMutation({
  args: {
    method: v.object({
      name: v.literal('martieReviewCode'),
      profile: vEmailProfile,
    }),
  },
  returns: v.id('users'),
  handler: async (ctx, {method}) => insertUser(ctx, method.profile.email),
});

export const createLegacyUser = internalMutation({
  args: {
    method: v.object({
      name: v.literal('martieLegacySession'),
      profile: v.object({}),
    }),
  },
  returns: v.id('users'),
  handler: async () => {
    throw new Error('A legacy session only signs in an existing user');
  },
});

/**
 * The Martie user that signed in with this address before 2.8.0, if any.
 * One address can have two users when it signed in through two locales'
 * code providers; the one with a live profile wins, then the newest.
 */
export const userByEmail = internalQuery({
  args: {email: v.string()},
  returns: v.union(v.id('users'), v.null()),
  handler: async (ctx, {email}) => {
    const normalizedEmail = normalizeEmail(email);
    const candidates = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', normalizedEmail))
      .collect();
    if (candidates.length === 0) {
      // Older apps sent the address as typed, so `users.email` can differ
      // in case; profile emails are stored lowercase.
      const profile = await ctx.db
        .query('userProfiles')
        .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
        .first();
      return profile?.userId ?? null;
    }
    if (candidates.length === 1) return candidates[0]._id;

    const ranked = await Promise.all(
      candidates.map(async (user) => {
        const profile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .first();
        return {user, live: !!profile && !profile.deletedAt};
      }),
    );
    ranked.sort(
      (a, b) =>
        Number(b.live) - Number(a.live) ||
        b.user._creationTime - a.user._creationTime,
    );
    return ranked[0].user._id;
  },
});

const link: MethodBuilders<EmailProfile> = core.bindMethod<
  'martieEmailLink',
  EmailProfile
>({
  name: 'martieEmailLink',
  createUser: internal.emailAuth.createLinkUser,
});

/**
 * Email a sign-in link that works for 10 minutes, only on this device:
 * opening it also needs the `browserSecret` returned here.
 */
export const sendSignInLink = link.authMutation({
  args: {email: v.string(), locale: vLocale},
  handler: async (ctx, {email, locale}): Promise<SendLinkResult> => {
    const start = await ctx.runMutation(
      components.authEmail.challenge.custom.start,
      {
        email: normalizeEmail(email),
        purpose: LINK_PURPOSE,
        expectedUserId: null,
        url: `${LINK_URL}?lang=${locale}`,
        emailSender: {
          kind: 'resend',
          sendEmailHandle: await createFunctionHandle(
            internal.emailAuth.deliverSignInLink,
          ),
          from: `Martie <${FROM_EMAIL}>`,
          // `deliverSignInLink` reads the key from the deployment env.
          apiKey: '',
          initialBackoffMs: 30 * 1000,
          retryAttempts: 5,
        },
        subject: signInLinkTemplatesMartie[locale].subject,
        intro: '',
        ttlMs: LINK_TTL_MS,
      },
    );
    if (!start.success) {
      return {success: false as const, error: start.userError.error};
    }
    return {success: true as const, browserSecret: start.browserSecret};
  },
});

/**
 * Sign in with the code from the link and the secret kept on the device. An
 * address that no Convex Auth 2 user owns yet goes to the Martie user that
 * signed in with it before 2.8.0, so nobody loses their account.
 */
export const signInWithLink = link.authMutation({
  args: {emailCode: v.string(), browserSecret: v.string()},
  handler: async (ctx, {emailCode, browserSecret}): Promise<SignInResult> => {
    const claim = {emailCode, browserSecret, purpose: LINK_PURPOSE};
    const peek = await ctx.runQuery(
      components.authEmail.challenge.custom.peek,
      {
        ...claim,
        currentUserId: null,
      },
    );
    if (!peek.success) {
      return {status: 'error' as const, error: peek.userError.error};
    }

    if (peek.emailOwnerId !== null) {
      const complete = await ctx.runMutation(
        components.authEmail.challenge.custom.complete,
        {...claim, currentUserId: null},
      );
      if (!complete.success || complete.emailOwnerId === null) {
        throw new Error('Unexpected error when claiming the sign-in link');
      }
      const tokens = await ctx.convexAuth.completeSignIn({
        userId: complete.emailOwnerId,
        profile: {email: complete.email},
        authenticatedBy: components.authEmail,
      });
      return {status: 'complete' as const, tokens};
    }

    // The person proved control of the address with this link, and the
    // existing user verified the same address with an email code, so the
    // address belongs to that user. Only otherwise is the user new.
    const existingUserId: Id<'users'> | null = await ctx.runQuery(
      internal.emailAuth.userByEmail,
      {
        email: peek.email,
      },
    );
    const userId: string =
      existingUserId ??
      (
        await ctx.convexAuth.signUpWithoutSession({
          profile: {email: peek.email},
        })
      ).userId;
    const recorded = await ctx.runMutation(
      components.authEmail.challenge.custom
        ._internal_dangerous_completeForNewUser,
      {...claim, userId},
    );
    if (!recorded.success) {
      throw new Error(
        `Unexpected error when recording the email address: ${recorded.userError.error}`,
      );
    }
    const tokens = await ctx.convexAuth.completeSignIn({
      userId,
      profile: {email: recorded.email},
      authenticatedBy: components.authEmail,
    });
    return {status: 'complete' as const, tokens};
  },
});

/**
 * The component hands every challenge email to this mutation in place of
 * the Resend component, so Martie sends its own localized copy.
 */
export const deliverSignInLink = internalMutation({
  args: {
    options: v.object({
      apiKey: v.string(),
      testMode: v.boolean(),
      initialBackoffMs: v.number(),
      retryAttempts: v.number(),
    }),
    from: v.string(),
    to: v.array(v.string()),
    subject: v.string(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, {from, to, text}) => {
    const link = text.match(LINK_URL_PATTERN)?.[0];
    if (!link) throw new Error('The challenge email has no sign-in link');
    const lang = new URL(link).searchParams.get('lang');
    await ctx.scheduler.runAfter(0, internal.emailAuth.sendSignInLinkEmail, {
      from,
      to,
      link,
      locale: isLocale(lang) ? lang : 'en',
    });
    return null;
  },
});

// The link lives 10 minutes, so retries stop well before it expires.
const SEND_RETRY_DELAYS_MS = [10 * 1000, 30 * 1000, 90 * 1000];

export const sendSignInLinkEmail = internalAction({
  args: {
    from: v.string(),
    to: v.array(v.string()),
    link: v.string(),
    locale: vLocale,
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const template = signInLinkTemplatesMartie[args.locale];
    try {
      await sendResendEmail(RESEND_API_KEY, {
        from: args.from,
        to: args.to,
        subject: template.subject,
        text: template.text(args.link),
        html: template.html(args.link),
      });
    } catch (error) {
      const attempt = args.attempt ?? 0;
      const delay = SEND_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) throw error;
      console.warn('[auth] Retrying the sign-in link email', {attempt, error});
      await ctx.scheduler.runAfter(
        delay,
        internal.emailAuth.sendSignInLinkEmail,
        {...args, attempt: attempt + 1},
      );
    }
  },
});

// App Review (and development E2E) cannot open an emailed link, so the
// allow-listed review emails sign in with the fixed code instead, like the
// email codes before 2.8.0.
const FIXED_CODE_EMAILS = parseEmailList(
  process.env.APP_REVIEW_FIXED_OTP_EMAILS ??
    process.env.APP_REVIEW_FIXED_OTP_EMAIL,
);
const DEV_FIXED_CODE_EMAILS = parseEmailList(process.env.DEV_FIXED_OTP_EMAILS);

const review: MethodBuilders<EmailProfile> = core.bindMethod<
  'martieReviewCode',
  EmailProfile
>({
  name: 'martieReviewCode',
  createUser: internal.emailAuth.createReviewUser,
});

export const signInWithReviewCode = review.authMutation({
  args: {email: v.string(), code: v.string()},
  handler: async (
    ctx,
    {email, code},
  ): Promise<SignInResult<'INCORRECT_CODE'>> => {
    const normalizedEmail = normalizeEmail(email);
    const allowed = new Set([
      ...FIXED_CODE_EMAILS,
      ...(isProduction ? [] : DEV_FIXED_CODE_EMAILS),
    ]);
    const expected = fixedOtpCodeFor({
      isProduction,
      reviewCode: process.env.APP_REVIEW_FIXED_OTP_CODE ?? null,
      devCode: process.env.DEV_FIXED_OTP_CODE ?? null,
    });
    if (!allowed.has(normalizedEmail) || expected === null) {
      return {status: 'error' as const, error: 'INCORRECT_CODE' as const};
    }
    const attemptAllowed: boolean = await ctx.runMutation(
      internal.emailAuth.takeReviewCodeAttempt,
      {email: normalizedEmail},
    );
    if (!attemptAllowed || code.trim() !== expected) {
      return {status: 'error' as const, error: 'INCORRECT_CODE' as const};
    }
    await ctx.runMutation(internal.emailAuth.resetReviewCodeAttempts, {
      email: normalizedEmail,
    });

    const userId: Id<'users'> | null = await ctx.runQuery(
      internal.emailAuth.userByEmail,
      {email: normalizedEmail},
    );
    const tokens =
      userId === null
        ? await ctx.convexAuth.completeSignUp({
            profile: {email: normalizedEmail},
            authenticatedBy: components.auth,
          })
        : await ctx.convexAuth.completeSignIn({
            userId,
            profile: {email: normalizedEmail},
            authenticatedBy: components.auth,
          });
    return {status: 'complete' as const, tokens};
  },
});

// Like the email codes before 2.8.0: 10 failed codes per address per hour.
const REVIEW_CODE_ATTEMPTS = 10;
const REVIEW_CODE_WINDOW_MS = 60 * 60 * 1000;
const reviewCodeLimitId = (email: string) => `martieReviewCode:${email}`;

/** Use up one attempt; false once the address has none left this hour. */
export const takeReviewCodeAttempt = internalMutation({
  args: {email: v.string()},
  returns: v.boolean(),
  handler: async (ctx, {email}) => {
    const identifier = reviewCodeLimitId(email);
    const now = Date.now();
    const limit = await ctx.db
      .query('authRateLimits')
      .withIndex('identifier', (q) => q.eq('identifier', identifier))
      .unique();
    if (limit === null) {
      await ctx.db.insert('authRateLimits', {
        identifier,
        lastAttemptTime: now,
        attemptsLeft: REVIEW_CODE_ATTEMPTS - 1,
      });
      return true;
    }
    const attemptsLeft =
      now - limit.lastAttemptTime > REVIEW_CODE_WINDOW_MS
        ? REVIEW_CODE_ATTEMPTS
        : limit.attemptsLeft;
    if (attemptsLeft <= 0) return false;
    await ctx.db.patch(limit._id, {
      lastAttemptTime: now,
      attemptsLeft: attemptsLeft - 1,
    });
    return true;
  },
});

export const resetReviewCodeAttempts = internalMutation({
  args: {email: v.string()},
  returns: v.null(),
  handler: async (ctx, {email}) => {
    const limit = await ctx.db
      .query('authRateLimits')
      .withIndex('identifier', (q) =>
        q.eq('identifier', reviewCodeLimitId(email)),
      )
      .unique();
    if (limit !== null) await ctx.db.delete(limit._id);
    return null;
  },
});

const legacy: MethodBuilders<Record<string, never>> = core.bindMethod<
  'martieLegacySession',
  Record<string, never>
>({
  name: 'martieLegacySession',
  createUser: internal.emailAuth.createLegacyUser,
});

/**
 * Trade the refresh token an app kept from Convex Auth 0.0.x for a Convex
 * Auth 2 session of the same user, so updating to 2.8.0 signs nobody out.
 * The old session is deleted, thus the old token works only once.
 */
export const upgradeLegacySession = legacy.authMutation({
  args: {refreshToken: v.string()},
  handler: async (
    ctx,
    {refreshToken},
  ): Promise<SignInResult<'INVALID_SESSION'>> => {
    const userId: Id<'users'> | null = await ctx.runMutation(
      internal.emailAuth.consumeLegacySession,
      {refreshToken},
    );
    if (userId === null) {
      return {status: 'error' as const, error: 'INVALID_SESSION' as const};
    }
    const tokens = await ctx.convexAuth.completeSignIn({
      userId,
      profile: {},
      authenticatedBy: components.auth,
    });
    return {status: 'complete' as const, tokens};
  },
});

export const consumeLegacySession = internalMutation({
  args: {refreshToken: v.string()},
  returns: v.union(v.id('users'), v.null()),
  handler: async (ctx, {refreshToken}) => {
    // Convex Auth 0.0.x refresh tokens are `${refreshTokenId}|${sessionId}`.
    const [rawTokenId, rawSessionId] = refreshToken.split('|');
    const tokenId = ctx.db.normalizeId('authRefreshTokens', rawTokenId ?? '');
    const sessionId = ctx.db.normalizeId('authSessions', rawSessionId ?? '');
    if (tokenId === null || sessionId === null) return null;

    const now = Date.now();
    const token = await ctx.db.get(tokenId);
    const session = await ctx.db.get(sessionId);
    if (
      token === null ||
      session === null ||
      token.sessionId !== sessionId ||
      token.expirationTime <= now ||
      session.expirationTime <= now
    ) {
      return null;
    }

    const tokens = await ctx.db
      .query('authRefreshTokens')
      .withIndex('sessionId', (q) => q.eq('sessionId', sessionId))
      .collect();
    // Only the newest token of the session may be traded: an older one was
    // already replaced, so whoever holds it is not the current holder.
    if (tokens.some((other) => other.parentRefreshTokenId === tokenId)) {
      return null;
    }
    for (const other of tokens) {
      await ctx.db.delete(other._id);
    }
    await ctx.db.delete(sessionId);
    return session.userId;
  },
});
