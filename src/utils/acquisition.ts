import {storage, Storage} from './storage';

/**
 * Canonical channel slugs for the PMF #70 sprint. Use these on every
 * outbound link/QR/bio so the `signup_completed` cohort split stays
 * comparable across the funnel dashboard.
 *
 * Convention: `<surface>_<locale>` for content channels (Shorts, blog),
 * single-token slugs for partner traffic.
 *
 * To attribute a new channel, add a deep link like:
 *   https://hyo.dev/martie?source=<slug>
 * or `martie://?source=<slug>` for app-scheme links. The `_layout` URL
 * handler captures both forms automatically.
 */
export const ACQUISITION_CHANNELS = {
  // Partner / external traffic
  COFFEEBEAN: 'coffeebean',
  PRODUCT_HUNT: 'product_hunt',
  // Owned content surfaces — append locale (ko/en/ja)
  SHORTS_KO: 'shorts_ko',
  SHORTS_EN: 'shorts_en',
  SHORTS_JA: 'shorts_ja',
  BLOG_KO: 'blog_ko',
  BLOG_EN: 'blog_en',
  BLOG_JA: 'blog_ja',
  // Communities
  REDDIT: 'reddit',
  INDIRA: 'indira', // 인디라
  INDITER: 'inditer', // 인디터
  DCINSIDE: 'dcinside',
  // In-app surfaces
  REFERRAL: 'referral',
  SHARE_TWITTER: 'share_twitter',
  SHARE_LINE: 'share_line',
  SHARE_KAKAO: 'share_kakao',
  // Fallback
  ORGANIC: 'organic',
} as const;

export type AcquisitionChannel =
  (typeof ACQUISITION_CHANNELS)[keyof typeof ACQUISITION_CHANNELS];

/**
 * Accepts a registered `AcquisitionChannel` for autocomplete on known
 * partners, or any other free-form string for ad-hoc / future channels.
 * Use the `& {}` trick to keep autocomplete on the union without losing
 * `string` widening.
 */
type AcquisitionSourceInput = AcquisitionChannel | (string & {});

/**
 * Acquisition source — written once at first touch (deep link, referral,
 * Shorts bio link param, etc.), read by `signup_completed` so the channel
 * cohort is preserved across onboarding (PMF sprint #70).
 *
 * Sources are free-form strings; only the *first* source wins to keep
 * cohort attribution stable for late signups. Prefer ACQUISITION_CHANNELS
 * for known partners so the dashboard groups them consistently.
 */
export function setAcquisitionSourceOnce(
  source: AcquisitionSourceInput | null | undefined,
) {
  if (!source) return false;
  const trimmed = source.trim();
  if (!trimmed) return false;
  if (storage.getString(Storage.AcquisitionSource)) return false;
  storage.set(Storage.AcquisitionSource, trimmed);
  return true;
}

export function getAcquisitionSource(): string | undefined {
  return storage.getString(Storage.AcquisitionSource);
}

export function ensureFirstLaunchTimestamp(): number {
  const existing = storage.getNumber(Storage.FirstLaunchAt);
  if (existing) return existing;
  const now = Date.now();
  storage.set(Storage.FirstLaunchAt, now);
  return now;
}

export function getFirstLaunchTimestamp(): number | undefined {
  return storage.getNumber(Storage.FirstLaunchAt);
}
