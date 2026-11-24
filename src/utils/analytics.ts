import {
  getAnalytics,
  logEvent as firebaseLogEvent,
  setUserId,
  setUserProperties as firebaseSetUserProperties,
  logScreenView as firebaseLogScreenView,
} from '@react-native-firebase/analytics';
import {Platform} from 'react-native';
import {
  flushProductAnalytics,
  trackProductAnalyticsEvent,
} from './productAnalytics';

export const LOG_EVENTS = {
  // Quiz capture (legacy)
  CAPTURE_QUIZ_RESULT: 'capture_quiz_result',
  CAPTURE_LEVEL_RESULT: 'capture_level_result',

  // App lifecycle
  APP_LAUNCH: 'app_launch',
  FIRST_OPEN: 'first_open',

  // Onboarding funnel
  ONBOARDING_SEEN: 'onboarding_seen',
  ONBOARDING_FINISHED: 'onboarding_finished',

  // Acquisition funnel — channel cohort tracking (PMF sprint #70)
  ACQUISITION_SOURCE_CAPTURED: 'acquisition_source_captured',
  SIGNUP_COMPLETED: 'signup_completed',

  // Daily quiz funnel
  DAILY_QUIZ_STARTED: 'daily_quiz_started',
  DAILY_QUIZ_COMPLETED: 'daily_quiz_completed',
  DAILY_QUIZ_ABANDONED: 'daily_quiz_abandoned',
  DAILY_RETURN_CTA_SHOWN: 'daily_return_cta_shown',
  DAILY_RETURN_CTA_PRESSED: 'daily_return_cta_pressed',
  NEXT_DAILY_NOTIFICATION_SCHEDULED: 'next_daily_notification_scheduled',

  // Per-question granularity (difficulty-vs-accuracy analysis)
  QUIZ_CORRECT: 'quiz_correct',
  QUIZ_WRONG: 'quiz_wrong',
  PRACTICE_QUIZ_FINISH_REQUESTED: 'practice_quiz_finish_requested',
  PRACTICE_QUIZ_COMPLETED: 'practice_quiz_completed',
  PRACTICE_QUIZ_COMPLETION_SYNCED: 'practice_quiz_completion_synced',
  PRACTICE_QUIZ_FINAL_ACTION: 'practice_quiz_final_action',

  // Category funnel
  CATEGORY_SELECTED: 'category_selected',
  CATEGORY_ABANDONED: 'category_abandoned',

  // Session
  SESSION_START: 'app_session_started',
  SESSION_END: 'app_session_ended',

  // Streak lifecycle (retention-critical)
  STREAK_STATE: 'streak_state',
  STREAK_MILESTONE: 'streak_milestone',
  STREAK_BROKEN: 'streak_broken',
  STREAK_FREEZE_USED: 'streak_freeze_used',
  STREAK_RECOVERY_SHOWN: 'streak_recovery_shown',
  STREAK_RECOVERY_ACCEPTED: 'streak_recovery_accepted',

  // Notification permission funnel
  NOTI_PERMISSION_REQUESTED: 'noti_permission_requested',
  NOTI_PERMISSION_RESULT: 'noti_permission_result',

  // Share / viral
  SHARE_INITIATED: 'share_initiated',
  SHARE_COMPLETED: 'share_completed',
  // Fired when the OS share sheet closes for image shares (expo-sharing
  // does not return an action, so completion cannot be verified)
  SHARE_SHEET_CLOSED: 'share_sheet_closed',

  // Economy / friction
  BULB_DEPLETED: 'bulb_depleted',

  // Navigation / discovery
  TAB_CHANGED: 'tab_changed',

  // Article engagement
  ARTICLE_OPENED: 'article_opened',
  ARTICLE_READ_COMPLETE: 'article_read_complete',

  // AI chat
  AI_CHAT_MESSAGE_SENT: 'ai_chat_message_sent',

  // Auth friction
  LOGIN_PROMPT_SHOWN: 'login_prompt_shown',
  LOGIN_PROMPT_DISMISSED: 'login_prompt_dismissed',
  LOGIN_PROMPT_ACCEPTED: 'login_prompt_accepted',

  // 1:1 battle
  BATTLE_ROOM_CREATED: 'battle_room_created',
  BATTLE_INVITE_SHARED: 'battle_invite_shared',
  BATTLE_LINK_OPENED: 'battle_link_opened',
  BATTLE_GUEST_KICKED: 'battle_guest_kicked',
  BATTLE_JOINED: 'battle_joined',
  BATTLE_JOIN_FAILED: 'battle_join_failed',
  BATTLE_READY: 'battle_ready',
  BATTLE_STARTED: 'battle_started',
  BATTLE_ANSWERED: 'battle_answered',
  BATTLE_FINISHED: 'battle_finished',
  BATTLE_LEFT: 'battle_left',
  BATTLE_REMATCH: 'battle_rematch',
} as const;

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

export const isStreakMilestone = (streak: number): boolean =>
  STREAK_MILESTONES.includes(streak);

const isNativeProduction = !__DEV__ && Platform.OS !== 'web';
const analytics = isNativeProduction ? getAnalytics() : null;

type AnalyticsParams = Record<string, unknown>;

const getBaseAnalyticsCommonParams = (): AnalyticsParams => ({
  app_platform: Platform.OS,
  app_environment: __DEV__ ? 'development' : 'production',
});

const FIREBASE_USER_PROPERTY_KEYS = [
  'email',
  'displayName',
  'level',
  'current_streak',
  'longest_streak',
  'is_premium',
  'feather_count',
  'language',
];

let analyticsCommonParams: AnalyticsParams = getBaseAnalyticsCommonParams();

function handleAnalyticsError(label: string, error: unknown) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to ${label}:`, error);
  }
}

function normalizeAnalyticsParams(params?: AnalyticsParams): AnalyticsParams {
  return {
    ...analyticsCommonParams,
    ...(params ?? {}),
  };
}

export const setUser = (user: {
  id: string;
  email: string;
  displayName: string;
}) => {
  if (analytics) {
    setUserId(analytics, user.id);
    firebaseSetUserProperties(analytics, {
      email: user.email,
      displayName: user.displayName,
    });
  }
};

export const setUserProperties = (
  properties: Record<string, string | null>,
) => {
  if (!analytics) return;
  firebaseSetUserProperties(analytics, properties);
};

type UserAnalyticsProps = {
  level?: number;
  currentStreak?: number;
  longestStreak?: number;
  isPremium?: boolean;
  featherCount?: number;
  language?: string;
};

export const updateUserAnalyticsProperties = (props: UserAnalyticsProps) => {
  const stringified: {[key: string]: string} = {};
  if (props.level !== undefined) stringified.level = String(props.level);
  if (props.currentStreak !== undefined)
    stringified.current_streak = String(props.currentStreak);
  if (props.longestStreak !== undefined)
    stringified.longest_streak = String(props.longestStreak);
  if (props.isPremium !== undefined)
    stringified.is_premium = props.isPremium ? 'true' : 'false';
  if (props.featherCount !== undefined)
    stringified.feather_count = String(props.featherCount);
  if (props.language !== undefined) stringified.language = props.language;
  if (analytics) {
    firebaseSetUserProperties(analytics, stringified);
  }
  registerAnalyticsSuperProperties({
    ...(props.language !== undefined ? {language: props.language} : {}),
    ...(props.isPremium !== undefined ? {is_premium: props.isPremium} : {}),
  });
};

export const logEvent = (name: string, params?: AnalyticsParams) => {
  const normalizedParams = normalizeAnalyticsParams(params);
  trackProductAnalyticsEvent(name, normalizedParams);
  if (!analytics) return;

  try {
    firebaseLogEvent(analytics, name, normalizedParams);
  } catch (error) {
    handleAnalyticsError(`log Firebase event ${name}`, error);
  }
};

export const logScreenView = (params: {
  screen_name: string;
  screen_class: string;
}) => {
  if (!analytics) return;

  try {
    void firebaseLogScreenView(analytics, {
      screen_name: params.screen_name,
      screen_class: params.screen_class,
    }).catch((error) =>
      handleAnalyticsError('log Firebase screen view', error),
    );
  } catch (error) {
    handleAnalyticsError('log Firebase screen view', error);
  }
};

export const registerAnalyticsSuperProperties = (
  properties: AnalyticsParams,
) => {
  analyticsCommonParams = {
    ...analyticsCommonParams,
    ...properties,
  };
};

export const resetAnalyticsUser = () => {
  if (analytics) {
    setUserId(analytics, null);
  }
  analyticsCommonParams = getBaseAnalyticsCommonParams();

  const clearedUserProperties = FIREBASE_USER_PROPERTY_KEYS.reduce<{
    [key: string]: null;
  }>((result, key) => {
    result[key] = null;
    return result;
  }, {});
  if (analytics) {
    try {
      void firebaseSetUserProperties(analytics, clearedUserProperties).catch(
        (error) =>
          handleAnalyticsError('clear Firebase user properties', error),
      );
    } catch (error) {
      handleAnalyticsError('clear Firebase user properties', error);
    }
  }
};

export const flushAnalytics = flushProductAnalytics;
