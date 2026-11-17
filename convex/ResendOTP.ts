import {Email} from '@convex-dev/auth/providers/Email';
import type {GenericActionCtxWithAuthConfig} from '@convex-dev/auth/server';
import {alphabet, generateRandomString} from 'oslo/crypto';
import {sha256 as rawSha256} from '@oslojs/crypto/sha2';
import {encodeHexLowerCase} from '@oslojs/encoding';
import {internal} from './_generated/api';
import {emailTemplatesMartie} from './emailTemplates';
import {sendResendEmail} from './utils/resendClient';
import {parseEmailList} from './utils/emailList';

interface SendVerificationRequestArgs {
  identifier: string;
  provider: {apiKey?: string; id: string};
  token: string;
}

const RESEND_API_KEY = process.env.AUTH_RESEND_KEY;
const isProduction = process.env.ENVIRONMENT === 'production';
const DEV_FIXED_OTP_CODE = process.env.DEV_FIXED_OTP_CODE ?? null;
const FROM_EMAIL =
  process.env.ENVIRONMENT !== 'production'
    ? 'onboarding@resend.dev'
    : 'martie@hyo.dev';

const FIXED_OTP_EMAILS = parseEmailList(
  process.env.APP_REVIEW_FIXED_OTP_EMAILS ??
    process.env.APP_REVIEW_FIXED_OTP_EMAIL,
);
// Development-only bypass. Both the emails and the code must be set
// explicitly in the Convex env; there are no built-in defaults.
const DEV_FIXED_OTP_EMAILS = parseEmailList(process.env.DEV_FIXED_OTP_EMAILS);
const FIXED_OTP_CODE = process.env.APP_REVIEW_FIXED_OTP_CODE ?? null;

const textEncoder = new TextEncoder();

const hashToken = (token: string) =>
  encodeHexLowerCase(rawSha256(textEncoder.encode(token)));

async function tryApplyFixedOtp(
  ctx: GenericActionCtxWithAuthConfig<any> | undefined,
  email: string,
  originalToken: string,
  providerId: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const allowedEmails = new Set(
    [...FIXED_OTP_EMAILS, ...(isProduction ? [] : DEV_FIXED_OTP_EMAILS)].map(
      (value) => value.toLowerCase(),
    ),
  );
  const isEmailAllowed = allowedEmails.has(normalizedEmail);
  const accountEmail = email.trim();

  const targetCodeRaw = isProduction
    ? FIXED_OTP_CODE
    : (FIXED_OTP_CODE ?? DEV_FIXED_OTP_CODE);
  const targetCode = targetCodeRaw?.trim();

  if (!ctx) {
    console.warn('[auth] Fixed OTP override skipped: missing ctx');
    return false;
  }

  if (!isEmailAllowed) {
    console.warn('[auth] Fixed OTP override skipped: email not allowed', {
      email: accountEmail,
      provider: providerId,
    });
    return false;
  }

  if (!targetCode) {
    console.warn(
      '[auth] Fixed OTP override skipped: target code not configured',
    );
    return false;
  }

  const success = await ctx.runMutation(
    internal.internals.overrideVerificationCode,
    {
      email: accountEmail,
      provider: providerId,
      originalHash: hashToken(originalToken),
      fixedHash: hashToken(targetCode),
    },
  );

  if (!success) {
    console.warn(
      '[auth] Fixed OTP requested but no verification code entry was found.',
    );
    return false;
  }

  if (!isProduction) {
    console.info('[auth] Using development fixed OTP', {
      email: accountEmail,
      code: targetCode,
    });
  }
  return true;
}

type MartieLocale = keyof typeof emailTemplatesMartie;

const createResendOtpProvider = (id: string, locale: MartieLocale) =>
  Email({
    id,
    apiKey: RESEND_API_KEY,
    maxAge: 60 * 15, // 15 minutes
    async generateVerificationToken() {
      return generateRandomString(8, alphabet('0-9'));
    },
    async sendVerificationRequest(
      {identifier: email, provider, token}: SendVerificationRequestArgs,
      ctx?: GenericActionCtxWithAuthConfig<any>,
    ) {
      if (await tryApplyFixedOtp(ctx, email, token, provider.id)) {
        return;
      }

      const template = emailTemplatesMartie[locale];

      await sendResendEmail(provider.apiKey ?? RESEND_API_KEY, {
        from: `Martie <${FROM_EMAIL}>`,
        to: [email],
        subject: template.subject,
        text: template.text(token),
        html: template.html(token),
      });
    },
  });

export const ResendOtpMartieEn = createResendOtpProvider('resend-otp', 'en');
export const ResendOtpMartieKo = createResendOtpProvider('resend-otp-ko', 'ko');
export const ResendOtpMartieJa = createResendOtpProvider('resend-otp-ja', 'ja');
