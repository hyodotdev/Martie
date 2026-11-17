// LevelPlay (ironSource) rewarded-ad server-to-server callback settings.

// The app sends the signed-in Convex user id as a LevelPlay rewarded server
// param, which arrives as `custom_<name>`.
export const REWARD_USER_PARAM = 'userId';

export const levelPlayPrivateKeys = (): string[] =>
  (process.env.LEVELPLAY_S2S_PRIVATE_KEY ?? '')
    .split(',')
    .map((key: string) => key.trim())
    .filter(Boolean);

/**
 * Callbacks credit bulbs only when `LEVELPLAY_S2S_MODE=grant`. Otherwise
 * (shadow mode) they are verified, logged and acknowledged without a grant,
 * and the app keeps crediting completed ads itself.
 */
export const isLevelPlayGrantMode = (): boolean =>
  process.env.LEVELPLAY_S2S_MODE === 'grant' &&
  levelPlayPrivateKeys().length > 0;
