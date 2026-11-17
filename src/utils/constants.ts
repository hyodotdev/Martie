export const AsyncStorageKey = {
  Token: 'token',
  DarkMode: 'dark-mode',
};

export const delayPressIn = 200;
export const WEB_URL = 'https://hyochan.dev';
export const QUIZ_TIME_IN_SECONDS = 15;
export const QUIZ_PASSED_SCORE = 70;

export const EMAIL_ADDRESS =
  process.env.NODE_ENV !== 'production'
    ? 'onboarding@resend.dev'
    : 'martie@hyo.dev';

export const BUBBLE_MESSAGE_CYCLE_INTERVAL = 50000; // 50초
export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 12;
export const MAX_BULB_COUNT = 9999;
export const INITIAL_BULB_COUNT = 2;
export const QUIZ_LIMIT = 10;
export const REWARDED_BULB_COUNT = 2;
export const MARTIE_SHARE_URL = 'https://hyo.dev/martie';
export const MARTIE_INVITE_URL_BASE = `${MARTIE_SHARE_URL}/invite`;

// App Store URLs
export const ANDROID_PACKAGE_NAME = 'dev.hyo.martie';

export const APP_STORE_URLS = {
  ios: 'https://apps.apple.com/app/id6740057833',
  android: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`,
};
