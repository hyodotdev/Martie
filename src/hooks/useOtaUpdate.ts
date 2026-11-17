import {useCallback, useState} from 'react';
import * as Patch from '@codemagic/react-native-patch';

import {logError} from '../utils/error';
import {logEvent} from '../utils/analytics';

// A cold start on a slow network must never hold the loading screen open.
export const OTA_CHECK_TIMEOUT_MS = 4000;

export type OtaCheckOutcome =
  'disabled' | 'up_to_date' | 'applied' | 'timeout' | 'failed';

/**
 * Over-the-air updates come from Codemagic Patch. Development builds load
 * their bundle from Metro, so there is nothing to replace there.
 */
export const otaUpdatesEnabled = !__DEV__;

async function applyUpdate(
  canRestart: () => boolean,
): Promise<OtaCheckOutcome> {
  let found: Patch.UpdateCheckResult;
  try {
    found = await Patch.checkForUpdate();
  } catch (error) {
    logEvent('update_check_failed', {reason: 'check_failed'});
    logError(error, 'ota_check');
    return 'failed';
  }
  if (found.action === 'up-to-date') return 'up_to_date';
  try {
    // `embedded-revert` means every update for this binary was withdrawn:
    // installing it returns the app to the bundle from the store build.
    const target =
      found.action === 'ota-update'
        ? await Patch.downloadUpdate(found.remotePackage)
        : found;
    await Patch.installUpdate(target, {
      installMode: Patch.InstallMode.ON_NEXT_RESTART,
    });
  } catch (error) {
    logEvent('update_check_failed', {reason: 'download_failed'});
    logError(error, 'ota_apply');
    return 'failed';
  }
  logEvent('update_pending');
  // Once the app is on screen, a late download waits for the next launch
  // instead of restarting under the user.
  if (!canRestart()) return 'timeout';
  // Restarting replaces the process, so this normally never settles.
  await Patch.restartApp();
  return 'applied';
}

/**
 * Applies an available update before the first screen. Anything other than
 * a reload reports the running bundle healthy, which keeps Patch from rolling
 * it back on the next launch.
 */
export async function checkOtaUpdate(
  timeoutMs = OTA_CHECK_TIMEOUT_MS,
  enabled = otaUpdatesEnabled,
): Promise<OtaCheckOutcome> {
  if (!enabled) return 'disabled';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const outcome = await Promise.race([
    applyUpdate(() => !timedOut),
    new Promise<OtaCheckOutcome>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve('timeout');
      }, timeoutMs);
    }),
  ]);
  clearTimeout(timer);
  if (outcome !== 'applied') {
    void Patch.notifyAppReady().catch((error: unknown) =>
      logError(error, 'ota_ready'),
    );
  }
  return outcome;
}

export const useOtaUpdate = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkUpdate = useCallback(async () => {
    if (!otaUpdatesEnabled) return false;
    setIsChecking(true);
    const outcome = await checkOtaUpdate();
    // An applied update keeps the loading screen up until the restart.
    if (outcome !== 'applied') setIsChecking(false);
    return outcome === 'applied';
  }, []);

  return {isChecking, checkUpdate};
};
