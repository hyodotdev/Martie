import {internalAction, internalMutation} from './_generated/server';
import {v} from 'convex/values';
import {sendResendEmail} from './utils/resendClient';

const RESEND_API_KEY = process.env.AUTH_RESEND_KEY;

export const sendEmailAction = internalAction({
  args: v.object({
    fromEmail: v.string(),
    subject: v.string(),
    message: v.string(),
  }),
  handler: async (ctx, {fromEmail, subject, message}) => {
    try {
      await sendResendEmail(RESEND_API_KEY, {
        from: `Martie <${fromEmail}>`,
        to: ['hyo@hyo.dev'],
        subject: subject,
        text: `${message}\n\nFrom: ${fromEmail}`,
      });
      return {success: true};
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error(`Failed to send email`);
    }
  },
});

export const overrideVerificationCode = internalMutation({
  args: v.object({
    email: v.string(),
    provider: v.string(),
    originalHash: v.string(),
    fixedHash: v.string(),
  }),
  handler: async (ctx, {email, provider, originalHash, fixedHash}) => {
    const account = await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', (q) =>
        q.eq('provider', provider).eq('providerAccountId', email),
      )
      .unique();

    if (!account) {
      console.warn('[auth] No auth account found for override', {
        email,
        provider,
      });
      return false;
    }

    let matches = await ctx.db
      .query('authVerificationCodes')
      .withIndex('accountId', (q) => q.eq('accountId', account._id))
      .collect();

    if (matches.length === 0) {
      console.warn('[auth] No verification codes found for account', {
        email,
        provider,
      });
      return false;
    }

    const [latest, ...rest] = matches.sort(
      (a, b) => b._creationTime - a._creationTime,
    );

    for (const duplicate of rest) {
      await ctx.db.delete(duplicate._id);
    }

    // Remove any other entries already using the fixed hash to keep lookup unique.
    const conflicting = await ctx.db
      .query('authVerificationCodes')
      .withIndex('code', (q) => q.eq('code', fixedHash))
      .collect();

    for (const row of conflicting) {
      if (row._id === latest._id) continue;
      await ctx.db.delete(row._id);
    }

    await ctx.db.patch(latest._id, {code: fixedHash});
    console.info('[auth] Patched verification code for account', {
      email,
      provider,
    });
    return true;
  },
});
