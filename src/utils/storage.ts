import {createMMKV} from 'react-native-mmkv';

export const storage = createMMKV();

export const Storage = {
  DidFinishOnboarding: 'DidFinishOnboarding',
  DidFinishTutorial: 'DidFinishTutorial',
  ThemeType: 'ThemeType',
  BulbCount: 'BulbCount',
  LastQuizCursor: 'LastQuizCursor',
  LastCheckInDate: 'LastCheckInDate',
  Volume: 'Volume',
  IsRewarded: 'IsRewarded',
  Locale: 'Locale',
  DidFinishFirstDaily: 'DidFinishFirstDaily',
  PendingReferralCode: 'PendingReferralCode',
  PendingBattleCode: 'PendingBattleCode',
  GuestDailyResult: 'GuestDailyResult',
  LastDailyCompletionSummary: 'LastDailyCompletionSummary',
  // Acquisition source attribution (from deep links / referrals)
  AcquisitionSource: 'AcquisitionSource',
  // Notification permission re-ask flow (D2/D3 retry)
  NotiPermissionAskedAt: 'NotiPermissionAskedAt',
  NotiPermissionAskCount: 'NotiPermissionAskCount',
  NotiPermissionGranted: 'NotiPermissionGranted',
  // First app launch — anchor for cohort + retry timing
  FirstLaunchAt: 'FirstLaunchAt',
  // Last seen streak — used by recovery modal to detect a reset
  LastSeenStreak: 'LastSeenStreak',
  // Date string of the last day the recovery modal was *shown* (or
  // dismissed) — throttles re-popping within the same calendar day.
  // Persisted MMKV key kept as 'StreakRecoveryUsedAt' for backward
  // compatibility with installs already in the wild.
  StreakRecoveryLastSeenAt: 'StreakRecoveryUsedAt',
  // Marks the first successful sign-in on this device, so signup_completed
  // fires once per *new* signup rather than on every re-login.
  DidFireSignupCompleted: 'DidFireSignupCompleted',
  AppReviewLastAskedAt: 'AppReviewLastAskedAt',
  AppReviewAskCount: 'AppReviewAskCount',
  ProductAnalyticsVisitor: 'ProductAnalyticsVisitor',
  ProductAnalyticsQueue: 'ProductAnalyticsQueue',
  // Stable non-identifiable user key for Naver Pay (alternative billing tests)
  NaverUserKey: 'NaverUserKey',
} as const;
