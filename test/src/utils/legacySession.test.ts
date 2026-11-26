import {
  authStorageNamespace,
  upgradeLegacySession,
  type KeyValueStorage,
  type UpgradeResult,
} from '../../../src/utils/legacySession';

const CONVEX_URL = 'https://example-123.convex.cloud';
const LEGACY_SUFFIX = 'httpsexample123convexcloud';
const CURRENT_SUFFIX = 'httpsexample123convexcloudauth2';
const TOKENS = {
  accessToken: 'access',
  refreshToken: 'refresh',
  refreshTokenExpiresAt: 1,
  userId: 'user',
};

function makeStorage(initial: Record<string, string>) {
  const items = new Map(Object.entries(initial));
  const storage: KeyValueStorage = {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
    removeItem: async (key) => {
      items.delete(key);
    },
  };
  return {items, storage};
}

const run = (
  storage: KeyValueStorage,
  result: UpgradeResult | Error = {status: 'complete', tokens: TOKENS},
) => {
  const upgrade = jest.fn((_refreshToken: string) =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  );
  return {
    upgrade,
    done: upgradeLegacySession({convexUrl: CONVEX_URL, storage, upgrade}),
  };
};

describe('upgradeLegacySession', () => {
  it('stores the traded session where Convex Auth 2 reads it', async () => {
    const {items, storage} = makeStorage({
      [`__convexAuthRefreshToken_${LEGACY_SUFFIX}`]: 'token|session',
      [`__convexAuthJWT_${LEGACY_SUFFIX}`]: 'old-jwt',
    });

    const {upgrade, done} = run(storage);
    await done;

    expect(upgrade).toHaveBeenCalledWith('token|session');
    expect(authStorageNamespace(CONVEX_URL)).toBe(`${CONVEX_URL}/auth2`);
    expect(Object.fromEntries(items)).toEqual({
      [`__convexAuthJWT_${CURRENT_SUFFIX}`]: 'access',
      [`__convexAuthRefreshToken_${CURRENT_SUFFIX}`]: 'refresh',
    });
  });

  it('drops a session the server no longer accepts', async () => {
    const {items, storage} = makeStorage({
      [`__convexAuthRefreshToken_${LEGACY_SUFFIX}`]: 'token|session',
    });

    await run(storage, {status: 'error', error: 'INVALID_SESSION'}).done;

    expect(items.size).toBe(0);
  });

  it('keeps the old session to retry after a network failure', async () => {
    const {items, storage} = makeStorage({
      [`__convexAuthRefreshToken_${LEGACY_SUFFIX}`]: 'token|session',
    });

    await expect(run(storage, new Error('offline')).done).rejects.toThrow(
      'offline',
    );
    expect(items.get(`__convexAuthRefreshToken_${LEGACY_SUFFIX}`)).toBe(
      'token|session',
    );
  });

  it('only clears the old keys when already signed in to Convex Auth 2', async () => {
    const {items, storage} = makeStorage({
      [`__convexAuthRefreshToken_${LEGACY_SUFFIX}`]: 'token|session',
      [`__convexAuthRefreshToken_${CURRENT_SUFFIX}`]: 'current',
    });

    const {upgrade, done} = run(storage);
    await done;

    expect(upgrade).not.toHaveBeenCalled();
    expect(Object.fromEntries(items)).toEqual({
      [`__convexAuthRefreshToken_${CURRENT_SUFFIX}`]: 'current',
    });
  });

  it('does nothing without an old session', async () => {
    const {storage} = makeStorage({});
    const {upgrade, done} = run(storage);
    await done;
    expect(upgrade).not.toHaveBeenCalled();
  });
});
