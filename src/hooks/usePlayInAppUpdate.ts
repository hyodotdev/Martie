import Constants from 'expo-constants';
import * as InAppUpdates from 'expo-in-app-updates';
import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';

import {logError} from '../utils/error';

// Google Play's own update flow. Fire OS and Horizon builds have no Play Store,
// and development builds are never published there.
export const playInAppUpdatesEnabled = (): boolean =>
  !__DEV__ &&
  Platform.OS === 'android' &&
  Constants.expoConfig?.extra?.iapStore === 'google';

/**
 * Starts Google Play's in-app update once per launch. A version Martie forces
 * to update gets the blocking immediate flow; any other update downloads in
 * the background and installs on the next launch, so it never restarts the
 * app mid-session (see bun-patches/expo-in-app-updates). `forceUpdate` stays
 * `undefined` until the force-update version has loaded.
 */
export function usePlayInAppUpdate(forceUpdate: boolean | undefined): void {
  const started = useRef(false);

  useEffect(() => {
    if (forceUpdate === undefined || started.current) return;
    if (!playInAppUpdatesEnabled()) return;
    started.current = true;

    void (async () => {
      try {
        const update = await InAppUpdates.checkForUpdate();
        if (!update.updateAvailable) return;
        // Play requires resuming an immediate update that was interrupted.
        if (update.updateInProgress) {
          await InAppUpdates.startUpdate(true);
        } else if (forceUpdate && update.immediateAllowed) {
          await InAppUpdates.startUpdate(true);
        } else if (update.flexibleAllowed) {
          await InAppUpdates.startUpdate(false);
        }
      } catch (error) {
        logError(error, 'play_in_app_update');
      }
    })();
  }, [forceUpdate]);
}
