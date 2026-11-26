import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {useAuthActions} from '@convex-dev/auth/react';
import {useConvexAuth, useMutation} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {logError} from '../utils/error';

// Convex Auth 0.0.x (apps before 2.8.0) kept its session in secure storage
// under these keys, suffixed by the deployment URL without its punctuation.
const legacyKey = (key: string): string =>
  `${key}_${(process.env.EXPO_PUBLIC_CONVEX_URL ?? '').replace(/[^a-zA-Z0-9]/g, '')}`;

const LEGACY_REFRESH_TOKEN_KEY = legacyKey('__convexAuthRefreshToken');
const LEGACY_KEYS = [
  LEGACY_REFRESH_TOKEN_KEY,
  legacyKey('__convexAuthJWT'),
  legacyKey('__convexAuthOAuthVerifier'),
  legacyKey('__convexAuthServerStateFetchTime'),
];

/**
 * On the first launch after updating to 2.8.0, trade the session kept by
 * Convex Auth 0.0.x for a Convex Auth 2 one, so the update signs nobody out.
 * A network failure keeps the old keys, so the next launch retries.
 */
export function useLegacySessionUpgrade(): void {
  const {isLoading, isAuthenticated} = useConvexAuth();
  const {setSession} = useAuthActions();
  const upgradeLegacySession = useMutation(
    api.emailAuth.upgradeLegacySession,
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    if (isLoading || startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(
          LEGACY_REFRESH_TOKEN_KEY,
        );
        if (!refreshToken) return;
        if (!isAuthenticated) {
          const result = await upgradeLegacySession({refreshToken});
          if (result.status === 'complete') {
            await setSession(result.tokens);
          }
        }
        await Promise.all(
          LEGACY_KEYS.map((key) => SecureStore.deleteItemAsync(key)),
        );
      } catch (error) {
        logError(error, 'legacy-session-upgrade');
      }
    })();
  }, [isLoading, isAuthenticated, setSession, upgradeLegacySession]);
}
