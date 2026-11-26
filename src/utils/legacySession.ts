import type {TokenBundle} from '@convex-dev/auth/react';

// Convex Auth keeps a session under these keys, suffixed by its storage
// namespace without punctuation. Convex Auth 0.0.x (apps before 2.8.0) used
// the bare deployment URL as the namespace; Convex Auth 2 uses its own, so
// the two never read each other's tokens.
const JWT_KEY = '__convexAuthJWT';
const REFRESH_TOKEN_KEY = '__convexAuthRefreshToken';
const LEGACY_ONLY_KEYS = [
  '__convexAuthOAuthVerifier',
  '__convexAuthServerStateFetchTime',
];

export const authStorageNamespace = (convexUrl: string): string =>
  `${convexUrl}/auth2`;

const namespacedKey = (key: string, namespace: string): string =>
  `${key}_${namespace.replace(/[^a-zA-Z0-9]/g, '')}`;

export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type UpgradeResult =
  {status: 'complete'; tokens: TokenBundle} | {status: 'error'; error: string};

/**
 * Before Convex Auth 2 loads, trade the session that Convex Auth 0.0.x kept
 * for a Convex Auth 2 one and store it where Convex Auth 2 reads it, so the
 * first launch of 2.8.0 starts signed in. A failed trade (offline) keeps the
 * old keys, so the next launch retries.
 */
export async function upgradeLegacySession({
  convexUrl,
  storage,
  upgrade,
}: {
  convexUrl: string;
  storage: KeyValueStorage;
  upgrade: (refreshToken: string) => Promise<UpgradeResult>;
}): Promise<void> {
  const legacyKey = (key: string) => namespacedKey(key, convexUrl);
  const currentKey = (key: string) =>
    namespacedKey(key, authStorageNamespace(convexUrl));

  const refreshToken = await storage.getItem(legacyKey(REFRESH_TOKEN_KEY));
  if (!refreshToken) return;

  if (!(await storage.getItem(currentKey(REFRESH_TOKEN_KEY)))) {
    const result = await upgrade(refreshToken);
    if (result.status === 'complete') {
      await storage.setItem(currentKey(JWT_KEY), result.tokens.accessToken);
      await storage.setItem(
        currentKey(REFRESH_TOKEN_KEY),
        result.tokens.refreshToken,
      );
    }
  }
  await Promise.all(
    [JWT_KEY, REFRESH_TOKEN_KEY, ...LEGACY_ONLY_KEYS].map((key) =>
      storage.removeItem(legacyKey(key)),
    ),
  );
}
