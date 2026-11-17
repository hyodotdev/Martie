import {Linking} from 'react-native';

// Resolves Android intent:// URLs (used by PG pages for app-switch) into a
// plain scheme:// URL that Linking can open. React Native fires ACTION_VIEW
// with the raw string, which cannot resolve intent:// URIs, so without this
// the handoff to an installed app (e.g. Toss) silently fails.
export const resolveAndroidIntentUrl = (url: string): string => {
  if (!url.startsWith('intent://')) {
    return url;
  }

  const marker = '#Intent;';
  const hash = url.indexOf(marker);

  if (hash === -1) {
    return url;
  }

  const path = url.slice('intent://'.length, hash);
  const params = `;${url.slice(hash + marker.length)}`;
  const scheme = /;scheme=([^;]+);?/.exec(params)?.[1];

  if (scheme) {
    return `${scheme}://${path}`;
  }

  const fallback = /;S\.browser_fallback_url=([^;]+);?/.exec(params)?.[1];

  if (fallback) {
    try {
      return decodeURIComponent(fallback);
    } catch {
      return fallback;
    }
  }

  return url;
};

const getIntentFallbackUrl = (url: string): string | null => {
  if (!url.startsWith('intent://')) {
    return null;
  }

  const marker = '#Intent;';
  const hash = url.indexOf(marker);

  if (hash === -1) {
    return null;
  }

  const params = `;${url.slice(hash + marker.length)}`;
  const fallback = /;S\.browser_fallback_url=([^;]+);?/.exec(params)?.[1];

  if (!fallback) {
    return null;
  }

  try {
    return decodeURIComponent(fallback);
  } catch {
    return fallback;
  }
};

// Opens a non-http(s) checkout URL (app scheme or intent://). Falls back to
// the intent's browser_fallback_url (usually a Play Store page) when the
// app itself cannot be opened. Resolves false when nothing could be opened.
export const openExternalCheckoutUrl = async (
  url: string,
): Promise<boolean> => {
  const resolved = resolveAndroidIntentUrl(url);

  try {
    await Linking.openURL(resolved);
    return true;
  } catch {
    const fallback = getIntentFallbackUrl(url);

    if (fallback && fallback !== resolved) {
      try {
        await Linking.openURL(fallback);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
};
