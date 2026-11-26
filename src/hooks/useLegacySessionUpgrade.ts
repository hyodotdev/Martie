import {useEffect, useState} from 'react';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../../convex/_generated/api';
import {logError} from '../utils/error';
import {
  upgradeLegacySession,
  type KeyValueStorage,
} from '../utils/legacySession';

// Offline, the first launch of 2.8.0 starts signed out rather than hang on
// the splash; the old session stays and the next launch retries.
const UPGRADE_TIMEOUT_MS = 10 * 1000;

/**
 * Whether Convex Auth 2 may load: true once the session kept by Convex Auth
 * 0.0.x (if any) has been traded, so the app never starts signed out for a
 * moment and shows its guest screens.
 */
export function useLegacySessionUpgrade({
  convexUrl,
  storage,
}: {
  convexUrl: string;
  storage: KeyValueStorage;
}): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), UPGRADE_TIMEOUT_MS);
    upgradeLegacySession({
      convexUrl,
      storage,
      upgrade: (refreshToken) =>
        new ConvexHttpClient(convexUrl).mutation(
          api.emailAuth.upgradeLegacySession,
          {refreshToken},
        ),
    })
      .catch((error) => logError(error, 'legacy-session-upgrade'))
      .finally(() => {
        clearTimeout(timeout);
        setReady(true);
      });
    return () => clearTimeout(timeout);
  }, [convexUrl, storage]);

  return ready;
}
