import notifee, {
  AuthorizationStatus,
  Notification,
  type TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import {
  addDays,
  addMinutes,
  addYears,
  differenceInCalendarDays,
  isToday,
  startOfDay,
} from 'date-fns';
import {t} from '../STRINGS';
import {toast, ToastOptions} from '@backpackapp-io/react-native-toast';
import {logError} from './error';
import {logEvent, LOG_EVENTS} from './analytics';

const NOTIFICATION_HOUR = 7;
const NEXT_DAILY_READY_HOUR = 9;
const MAX_TRIGGER_NOTIFICATION_COUNT = __DEV__ ? 2 : 30;
const ANDROID_CHANNEL_ID = 'daily-saju';
const NEXT_DAILY_READY_ID = 'next-daily-ready';

type NotificationArgs = {
  id: string;
  title: string;
  date: Date;
};

export type NotiPermissionSource =
  | 'onboarding'
  | 'settings'
  | 'd2_retry'
  | 'd3_retry'
  | 'other';

export async function requestNotificationPermission(
  toastOptions?: ToastOptions,
  source: NotiPermissionSource = 'other',
): Promise<boolean> {
  logEvent(LOG_EVENTS.NOTI_PERMISSION_REQUESTED, {source});
  const settings = await notifee.requestPermission();
  const granted =
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

  logEvent(LOG_EVENTS.NOTI_PERMISSION_RESULT, {
    source,
    granted,
    authorizationStatus: settings.authorizationStatus,
  });

  if (!granted) {
    // Suppress toast during onboarding/retry — showing negative friction on
    // first-time/silent re-ask hurts retention. We still track the result
    // via the analytics event above, so the funnel remains visible.
    const isPassive =
      source === 'onboarding' ||
      source === 'd2_retry' ||
      source === 'd3_retry';
    if (!isPassive) {
      toast(t('common.notificationPermissionNotGranted'), toastOptions);
    }
    return false;
  }

  return true;
}

export async function createDailyQuizNotifications(date?: Date): Promise<void> {
  try {
    const now = new Date();
    const todayAt7AM = date || startOfDay(now);
    todayAt7AM.setHours(NOTIFICATION_HOUR, 0, 0, 0);

    // 알림 배열 생성
    const notifications = Array.from(
      {length: MAX_TRIGGER_NOTIFICATION_COUNT},
      (_, index) => {
        const notificationDate = addDays(startOfDay(now), index);
        notificationDate.setHours(NOTIFICATION_HOUR, 0, 0, 0);

        return {
          id: `daily-quiz-${index + 1}`,
          title: t('common.dailyQuizzesArrived'),
          date: notificationDate,
        };
      },
    );

    await clearAllNotifications();

    for (const [index, notification] of notifications.entries()) {
      let notificationTime: Date;

      if (__DEV__) {
        // 개발 모드에서는 현재 시간 기준으로 1분씩 추가
        notificationTime = addMinutes(now, index + 1);
      } else {
        // 실제 모드에서는 오전 7시 고정
        notificationTime = notification.date;

        // 오늘 알림이 오전 7시 이전이거나 현재 시간보다 과거라면 건너뛰기
        if (
          (isToday(notification.date) && notification.date < todayAt7AM) ||
          notification.date <= now
        ) {
          console.log(
            `알림 건너뜀: ${notification.id}, 예약 시간=${notification.date.toLocaleString()}`,
          );
          continue;
        }
      }

      const details: Notification = {
        id: notification.id,
        title: notification.title,
        android: {channelId: ANDROID_CHANNEL_ID},
      };

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: notificationTime.getTime(),
      };

      try {
        await notifee.createTriggerNotification(details, trigger);

        __DEV__ &&
          console.log(
            `알림 생성: ${notification.id}, 예약 시간=${notificationTime.toLocaleString()}`,
          );
      } catch (error: any) {
        logError(error, 'createDailyQuizNotifications');
      }
    }
  } catch (error: any) {
    logError(error, 'createDailySQuizNotifications');
  }
}

export async function createNotifications(
  notifications: NotificationArgs[],
  maxNotifications = MAX_TRIGGER_NOTIFICATION_COUNT,
): Promise<NotificationArgs[]> {
  const notificationArr: NotificationArgs[] = [];

  try {
    const processedNotifications = notifications.map((notification) => {
      const now = new Date();

      now.setHours(NOTIFICATION_HOUR, 0, 0, 0);

      let nextDate = notification.date;

      nextDate.setHours(NOTIFICATION_HOUR, 0, 0, 0);

      let isAnniversary = false;
      let anniversaryYear = 0;

      while (nextDate.getTime() < now.getTime()) {
        nextDate = addYears(nextDate, 1);
        anniversaryYear += 1;
        isAnniversary = true;
      }

      return {
        ...notification,
        date: nextDate,
        isAnniversary,
        anniversaryYear,
      };
    });

    // Step 2: 가까운 날짜 기준으로 정렬하고 상위 {maxNotifications} 추출
    const sortedNotifications = processedNotifications
      .sort((a, b) => a.date.getTime() - b.date.getTime()) // 가까운 날짜 순으로 정렬
      .slice(0, maxNotifications); // 상위 {maxNotifications}개만 가져오기

    // Step 3: 새 알림 등록
    for (const notification of sortedNotifications) {
      const details: Notification = {
        id: notification.id,
        title: notification.isAnniversary
          ? `${notification.title} (${notification.anniversaryYear}주년)`
          : notification.title,
        android: {channelId: ANDROID_CHANNEL_ID},
      };

      try {
        const id = await createNotification(details, notification.date);

        // 알림 등록 성공 시 배열에 추가
        if (id) {
          notificationArr.push({
            id: notification.id,
            title: notification.title,
            date: notification.date,
          });
        }
      } catch (error: Error | any) {
        logError(error, 'createNotifications.item');
      }
    }

    // Step 4: 결과 정렬 및 반환
    const sortedResult = notificationArr
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((el) => ({
        id: el.id,
        title: el.title,
        date: el.date,
      }));

    return sortedResult;
  } catch (error: Error | any) {
    logError(error, 'createNotifications');
    return [];
  }
}

export async function createNotification(
  details: Notification,
  date: Date,
): Promise<string | undefined> {
  const triggerNotifications = await notifee.getTriggerNotifications();

  // 지난 날짜는 스킵
  if (date.getTime() <= Date.now()) {
    return;
  }

  const existingNotifications = triggerNotifications
    .map((notification) => {
      const noti = notification?.notification;

      if (!noti.id) {
        return null;
      }

      const trigger = notification.trigger as TimestampTrigger;

      if (trigger.type === TriggerType.TIMESTAMP && trigger.timestamp) {
        const id = noti.id;
        const date = new Date(trigger.timestamp);

        return {id, date};
      }

      return null;
    })
    .filter(Boolean) as {id: string; date: Date}[];

  const now = new Date();
  const dayDifference = differenceInCalendarDays(date, now);
  let notificationTime: Date;

  if (__DEV__) {
    // __DEV__ 환경에서는 날짜 차이에 따라 분 추가
    notificationTime = new Date();
    notificationTime.setHours(
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    );

    notificationTime = addMinutes(notificationTime, dayDifference);
  } else {
    notificationTime = date;
    notificationTime.setHours(NOTIFICATION_HOUR, 0, 0, 0);
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: notificationTime.getTime(),
  };

  if (existingNotifications.length < MAX_TRIGGER_NOTIFICATION_COUNT) {
    // 알림이 {MAX_NOTIFICATION_COUNT}개 미만이면 새 알림 추가

    return await notifee.createTriggerNotification(details, trigger);
  } else {
    existingNotifications.sort((a, b) => a.date.getTime() - b.date.getTime());

    const latestNotification = existingNotifications.pop();

    if (
      latestNotification &&
      latestNotification.date.getTime() > notificationTime.getTime()
    ) {
      // 가장 늦은 알림 제거
      await clearNotification(latestNotification.id);

      // 새로운 알림 추가
      return await notifee.createTriggerNotification(details, trigger);
    }
  }
}

export async function updateNotification({
  id,
  date,
  detail,
}: {
  id: string;
  date: Date;
  detail: Notification;
}): Promise<void> {
  const notificationTime = new Date(date);

  notificationTime.setHours(NOTIFICATION_HOUR, 0, 0, 0);

  // 기존 알림을 제거
  try {
    await clearNotification(id);
  } catch (error: Error | any) {
    logError(error, 'updateNotification.clearNotification');
  }

  // 새로운 알림 등록
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: notificationTime.getTime(),
  };

  await notifee.createTriggerNotification({...detail, id}, trigger);
}

/**
 * 스트릭 리마인더 알림 (다단계: 21:00 → 22:30 → 23:30)
 *
 * 단일 21시 알림은 놓치기 쉽다 — 같은 날 짧은 간격으로 점점 톤을 올려
 * 자정 전 복구 기회를 늘린다 (PMF sprint #70).
 */
type StreakReminderStage = {
  id: string;
  hour: number;
  minute: number;
  titleKey:
    | 'daily.streakReminderTitle'
    | 'daily.streakReminderNudgeTitle'
    | 'daily.streakReminderUrgentTitle';
  bodyKey:
    | 'daily.streakReminderBody'
    | 'daily.streakReminderNudgeBody'
    | 'daily.streakReminderUrgentBody';
};

const STREAK_REMINDER_STAGES: StreakReminderStage[] = [
  {
    id: 'streak-reminder',
    hour: 21,
    minute: 0,
    titleKey: 'daily.streakReminderTitle',
    bodyKey: 'daily.streakReminderBody',
  },
  {
    id: 'streak-reminder-nudge',
    hour: 22,
    minute: 30,
    titleKey: 'daily.streakReminderNudgeTitle',
    bodyKey: 'daily.streakReminderNudgeBody',
  },
  {
    id: 'streak-reminder-urgent',
    hour: 23,
    minute: 30,
    titleKey: 'daily.streakReminderUrgentTitle',
    bodyKey: 'daily.streakReminderUrgentBody',
  },
];

const STREAK_REMINDER_IDS = STREAK_REMINDER_STAGES.map((s) => s.id);

export async function createStreakReminderNotification(): Promise<void> {
  try {
    const now = new Date();

    // 매번 다시 등록 — 단계별 시각이 바뀌었거나 어제분이 남아있을 수 있음.
    // Trigger notifications must be canceled with the trigger-specific API;
    // `cancelNotification` only targets *displayed* notifications and would
    // leave the schedules in place, causing duplicates the next day.
    for (const id of STREAK_REMINDER_IDS) {
      try {
        await notifee.cancelTriggerNotification(id);
      } catch {
        // ignore
      }
    }

    for (const stage of STREAK_REMINDER_STAGES) {
      const reminderTime = new Date(now);
      reminderTime.setHours(stage.hour, stage.minute, 0, 0);

      // 해당 시각이 이미 지났으면 내일로
      if (reminderTime.getTime() <= now.getTime()) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      const details: Notification = {
        id: stage.id,
        title: t(stage.titleKey),
        body: t(stage.bodyKey),
        android: {channelId: ANDROID_CHANNEL_ID},
      };

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: reminderTime.getTime(),
      };

      await notifee.createTriggerNotification(details, trigger);
    }
  } catch (error: any) {
    logError(error, 'createStreakReminderNotification');
  }
}

export async function createNextDailyReadyNotification({
  wrongCount = 0,
}: {
  wrongCount?: number;
} = {}): Promise<void> {
  try {
    const now = new Date();
    const notificationTime = new Date(now);
    notificationTime.setDate(notificationTime.getDate() + 1);
    notificationTime.setHours(NEXT_DAILY_READY_HOUR, 0, 0, 0);

    try {
      await notifee.cancelTriggerNotification(NEXT_DAILY_READY_ID);
    } catch {
      // ignore
    }

    const details: Notification = {
      id: NEXT_DAILY_READY_ID,
      title: t('daily.nextDailyReadyTitle'),
      body:
        wrongCount > 0
          ? t('daily.nextDailyReadyBodyWithReview', {count: wrongCount})
          : t('daily.nextDailyReadyBody'),
      android: {channelId: ANDROID_CHANNEL_ID},
    };

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: notificationTime.getTime(),
    };

    await notifee.createTriggerNotification(details, trigger);
    logEvent(LOG_EVENTS.NEXT_DAILY_NOTIFICATION_SCHEDULED, {
      wrongCount,
      scheduledFor: notificationTime.toISOString(),
    });
  } catch (error: any) {
    logError(error, 'createNextDailyReadyNotification');
  }
}

/**
 * 스트릭 리마인더 알림 취소 (데일리 퀴즈 완료 시 호출) — 다단계 모두 제거.
 * Use `cancelTriggerNotification` since these were created via
 * `createTriggerNotification`; `cancelNotification` only clears displayed
 * notifications and leaves the future-scheduled triggers behind.
 */
export async function cancelStreakReminderNotification(): Promise<void> {
  for (const id of STREAK_REMINDER_IDS) {
    try {
      await notifee.cancelTriggerNotification(id);
    } catch {
      // ignore
    }
  }
}

/**
 * 모든 알림 제거
 */
export async function clearAllNotifications(): Promise<void> {
  const notificationIds = await notifee.getTriggerNotificationIds();

  for (const id of notificationIds) {
    await notifee.cancelNotification(id);
  }
}

/**
 * 특정 알림 ID 제거
 * @param id 알림 ID
 */
export async function clearNotification(id: string): Promise<void> {
  return await notifee.cancelNotification(id);
}

/**
 * 현재 등록된 알림을 콘솔에 출력
 */
export async function logScheduledNotifications(): Promise<void> {
  try {
    const triggerNotifications = await notifee.getTriggerNotifications();

    triggerNotifications.forEach((notification, index) => {
      const {id, title} = notification.notification;
      const trigger = notification.trigger as TimestampTrigger;

      if (trigger.type === TriggerType.TIMESTAMP && trigger.timestamp) {
        console.log(
          `알림 ${index + 1}: ID=${id}, 제목="${title}", 예약 시간=${new Date(
            trigger.timestamp,
          ).toLocaleString()}`,
        );
      } else {
        console.log(
          `알림 ${index + 1}: ID=${id}, 제목="${title}", 예약된 트리거가 없습니다.`,
        );
      }
    });
  } catch (error: any) {
    logError(error, 'logScheduledNotifications');
  }
}
