import {Linking, Share} from 'react-native';
import {logEvent, LOG_EVENTS} from './analytics';
import {logError} from './error';

export type SocialPlatform =
  | 'twitter'
  | 'line'
  | 'kakao'
  | 'system'
  | 'copy';

/**
 * Wrap a share URL with a `?source=share_<platform>` query so the resulting
 * channel cohort shows up in `signup_completed` (PMF sprint #70).
 *
 * Uses URL/URLSearchParams so an existing `source` is *replaced* (not
 * duplicated) and any `#fragment` is preserved. Falls back to string
 * concatenation if the input is not a parseable absolute URL.
 */
export function withShareSource(
  url: string,
  platform: SocialPlatform,
): string {
  const value = `share_${platform}`;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('source', value);
    return parsed.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}source=${value}`;
  }
}

async function shareViaSystemSheet(text: string, url: string): Promise<boolean> {
  const result = await Share.share({message: `${text}\n${url}`});
  return result.action === Share.sharedAction;
}

/**
 * Open Twitter/X web intent. If a browser intent cannot be opened, use the
 * native share sheet so the button still gives the user a working path.
 */
async function shareToTwitter(text: string, url: string): Promise<boolean> {
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;
  try {
    await Linking.openURL(intent);
    return true;
  } catch {
    return shareViaSystemSheet(text, url);
  }
}

/**
 * LINE web share — works on iOS and Android via the official line.me URL
 * scheme. If opening the intent fails, fall back to the native share sheet.
 */
async function shareToLine(text: string, url: string): Promise<boolean> {
  const combined = `${text}\n${url}`;
  const intent = `https://line.me/R/share?text=${encodeURIComponent(combined)}`;
  try {
    await Linking.openURL(intent);
    return true;
  } catch {
    return shareViaSystemSheet(text, url);
  }
}

/**
 * KakaoTalk doesn't expose a web intent, so we route through the system
 * share sheet. On Korean devices KakaoTalk is the default destination, so
 * UX is the same — we just lose deterministic platform attribution.
 */
async function shareToKakao(text: string): Promise<boolean> {
  const result = await Share.share({message: text});
  return result.action === Share.sharedAction;
}

type ShareInput = {
  text: string;
  url: string;
  source: string; // analytics 'source' (e.g. 'daily_result', 'league')
  platform: SocialPlatform;
  extras?: Record<string, unknown>;
};

export async function shareToSocial(input: ShareInput): Promise<void> {
  const trackedUrl = withShareSource(input.url, input.platform);
  logEvent(LOG_EVENTS.SHARE_INITIATED, {
    source: input.source,
    variant: 'social',
    platform: input.platform,
    ...input.extras,
  });

  try {
    // Web intents (twitter/line) only confirm that the browser opened, not
    // that the share completed. Use SHARE_SHEET_CLOSED for those — same
    // semantics as image shares (analytics.ts comment). The system sheet
    // (kakao/system) returns Share.sharedAction, but on Android many target
    // apps never report completion back to the system, so SHARE_COMPLETED
    // there is a *floor* on real shares — Android numbers will under-count
    // versus iOS in the dashboard.
    let opened = false;
    let confirmed = false;
    switch (input.platform) {
      case 'twitter':
        opened = await shareToTwitter(input.text, trackedUrl);
        break;
      case 'line':
        opened = await shareToLine(input.text, trackedUrl);
        break;
      case 'kakao':
        opened = await shareToKakao(`${input.text}\n${trackedUrl}`);
        confirmed = opened;
        break;
      case 'system':
      default:
        opened = await shareViaSystemSheet(input.text, trackedUrl);
        confirmed = opened;
        break;
    }

    if (confirmed) {
      logEvent(LOG_EVENTS.SHARE_COMPLETED, {
        source: input.source,
        variant: 'social',
        platform: input.platform,
        ...input.extras,
      });
    } else if (opened) {
      logEvent(LOG_EVENTS.SHARE_SHEET_CLOSED, {
        source: input.source,
        variant: 'social',
        platform: input.platform,
        ...input.extras,
      });
    }
  } catch (error) {
    logError(error, `shareToSocial:${input.platform}`);
  }
}
