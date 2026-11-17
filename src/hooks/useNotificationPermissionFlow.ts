import {useEffect, useRef} from 'react';
import notifee, {AuthorizationStatus} from '@notifee/react-native';
import {storage, Storage} from '../utils/storage';
import {
  requestNotificationPermission,
  type NotiPermissionSource,
} from '../utils/notifee';
import {ensureFirstLaunchTimestamp} from '../utils/acquisition';
import {logError} from '../utils/error';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ASK_COUNT = 3; // initial + D2 + D3
// Each entry is the delay measured from the *previous* ask (lastAsked),
// so [24h, 24h] yields D1 → D2 → D3 (24h gaps). Earlier [24h, 48h] would
// stretch to D1/D2/D4 because the second wait starts from D2's lastAsked.
const RETRY_DELAYS_MS = [ONE_DAY_MS, ONE_DAY_MS]; // D2, D3 (24h intervals)

type Source = Extract<
  NotiPermissionSource,
  'onboarding' | 'd2_retry' | 'd3_retry'
>;

/**
 * Notification permission flow (PMF sprint #70).
 *
 * 1. **First daily completed**: ask once after the user gets value.
 * 2. **Denied + 24h elapsed**: re-ask on D2.
 * 3. **Denied + 48h elapsed**: final retry on D3.
 *
 * After 3 denials we stop nagging — re-asking after that is annoying and
 * a user can still enable notifications via Settings (the in-app permission
 * card on the My tab handles that path).
 *
 * The first request is intentionally triggered from the daily result path,
 * not app launch. The launch hook only handles users who already completed
 * their first daily quiz before this flow shipped, plus D2/D3 retry timing.
 */
export function useNotificationPermissionFlow(): void {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Fire-and-forget — we never want to block the splash on this.
    void runPermissionFlow();
  }, []);
}

export async function requestFirstDailyNotificationPermission(): Promise<boolean> {
  try {
    const current = await notifee.getNotificationSettings();
    const isGranted =
      current.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      current.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    if (isGranted) {
      storage.set(Storage.NotiPermissionGranted, true);
      return true;
    }

    const askCount = storage.getNumber(Storage.NotiPermissionAskCount) ?? 0;
    if (askCount > 0) return false;

    storage.set(Storage.NotiPermissionAskedAt, Date.now());
    storage.set(Storage.NotiPermissionAskCount, 1);

    const granted = await requestNotificationPermission(
      undefined,
      'onboarding',
    );
    storage.set(Storage.NotiPermissionGranted, granted);
    return granted;
  } catch (error) {
    logError(error, 'requestFirstDailyNotificationPermission');
    return false;
  }
}

async function runPermissionFlow(): Promise<void> {
  try {
    ensureFirstLaunchTimestamp();

    // If already granted, nothing to do — but reflect current OS state in
    // local cache so we stop trying to re-ask.
    const current = await notifee.getNotificationSettings();
    const isGranted =
      current.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      current.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    if (isGranted) {
      storage.set(Storage.NotiPermissionGranted, true);
      return;
    }

    const askCount = storage.getNumber(Storage.NotiPermissionAskCount) ?? 0;
    if (askCount >= MAX_ASK_COUNT) return;

    if (askCount === 0) {
      if (!storage.getBoolean(Storage.DidFinishFirstDaily)) return;
      await requestFirstDailyNotificationPermission();
      return;
    }

    const lastAsked = storage.getNumber(Storage.NotiPermissionAskedAt);

    let source: Source;
    if (askCount === 1) {
      source = 'd2_retry';
    } else {
      source = 'd3_retry';
    }

    // Enforce minimum delay before re-asking.
    if (lastAsked && askCount > 0) {
      const minDelay = RETRY_DELAYS_MS[askCount - 1] ?? ONE_DAY_MS;
      if (Date.now() - lastAsked < minDelay) return;
    }

    storage.set(Storage.NotiPermissionAskedAt, Date.now());
    storage.set(Storage.NotiPermissionAskCount, askCount + 1);

    const granted = await requestNotificationPermission(undefined, source);
    storage.set(Storage.NotiPermissionGranted, granted);
  } catch (error) {
    logError(error, 'useNotificationPermissionFlow');
  }
}
