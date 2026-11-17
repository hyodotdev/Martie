import {Linking, Platform} from 'react-native';

import {
  ANDROID_PACKAGE_NAME,
  APP_STORE_URLS,
  MARTIE_SHARE_URL,
} from './constants';

export type StorePlatform = typeof Platform.OS;

export function getMartieStoreUrls(platform: StorePlatform): string[] {
  if (platform === 'android') {
    return [
      `market://details?id=${ANDROID_PACKAGE_NAME}`,
      APP_STORE_URLS.android,
    ];
  }

  if (platform === 'ios') {
    return [APP_STORE_URLS.ios];
  }

  return [MARTIE_SHARE_URL];
}

export async function openFirstAvailableUrl(urls: string[]): Promise<boolean> {
  let lastError: unknown;

  for (const [index, url] of urls.entries()) {
    const isFallbackUrl = index === urls.length - 1;
    const canOpenUrl = isFallbackUrl
      ? true
      : await Linking.canOpenURL(url).catch((error) => {
          lastError = error;
          return false;
        });

    if (!canOpenUrl) {
      continue;
    }

    try {
      await Linking.openURL(url);
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.error('Failed to open Martie store URL:', lastError);
  }

  return false;
}

export function openMartieStore(
  platform: StorePlatform = Platform.OS,
): Promise<boolean> {
  return openFirstAvailableUrl(getMartieStoreUrls(platform));
}
