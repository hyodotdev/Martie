import {v} from 'convex/values';
import {httpAction, internalMutation} from './_generated/server';
import {internal} from './_generated/api';
import {md5Hex} from './utils/md5';
import {
  BATTLE_AD_PURPOSE,
  isLevelPlayGrantMode,
  levelPlayPrivateKeys,
  REWARD_PURPOSE_PARAM,
  REWARD_USER_PARAM,
} from './utils/levelPlay';

const AD_REWARD_BULBS = 2;
const MAX_BULB_COUNT = 9999;
// Upper bound per user and UTC day even for signed callbacks.
const MAX_CALLBACK_REWARDS_PER_DAY = 30;
const MAX_CALLBACK_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/**
 * LevelPlay (ironSource) server-to-server rewarded callback.
 *
 * Configure in the LevelPlay dashboard: rewarded video → server-to-server
 * callback → `https://<CONVEX_SITE_URL>/levelplay/reward`, and store the
 * private key of each app (comma-separated) as `LEVELPLAY_S2S_PRIVATE_KEY` in
 * the Convex environment. The app sends the signed-in Convex user id as the
 * `custom_userId` server param (and as the dynamic user id); `[USER_ID]` is
 * only the SDK's own id because the SDK starts before sign-in. Callbacks only
 * credit bulbs with `LEVELPLAY_S2S_MODE=grant`; until then they run in shadow
 * mode (verified and logged, no grant).
 *
 * signature = md5(timestamp + eventId + appUserId + rewards + privateKey)
 * Response `<eventId>:OK` acknowledges delivery; anything else is retried.
 */
export const levelPlayRewardCallback = httpAction(async (ctx, request) => {
  // One private key per LevelPlay app (iOS, Android), comma-separated.
  const keys = levelPlayPrivateKeys();
  if (keys.length === 0) {
    return new Response('Not configured', {status: 503});
  }

  // GET carries the values in the query string; POST may send them in the
  // body (form or JSON). Query values win when both are present.
  const params = new URL(request.url).searchParams;
  if (request.method === 'POST') {
    const body = await request.text();
    let bodyParams = new URLSearchParams(body);
    try {
      const json: unknown = JSON.parse(body);
      if (json && typeof json === 'object') {
        bodyParams = new URLSearchParams(
          Object.entries(json).map(([key, value]) => [key, String(value)]),
        );
      }
    } catch {
      // Not JSON: keep the form-encoded parse.
    }
    for (const [key, value] of bodyParams) {
      if (!params.has(key)) params.set(key, value);
    }
  }
  const signedUserId = params.get('appUserId') ?? params.get('userId') ?? '';
  const eventId = params.get('eventId') ?? '';
  const rewards = params.get('rewards') ?? '';
  const timestamp = params.get('timestamp') ?? '';
  const signature = (params.get('signature') ?? '').toLowerCase();
  const customUserId = params.get(`custom_${REWARD_USER_PARAM}`);
  const dynamicUserId = params.get('dynamicUserId');
  const appUserId = customUserId || dynamicUserId || signedUserId;
  const userSource = customUserId
    ? 'custom'
    : dynamicUserId
      ? 'dynamic'
      : 'sdk';
  const log = (outcome: string) =>
    console.log(
      `[levelplay] ${outcome} event=${eventId} user=${userSource} params=${[
        ...new Set(params.keys()),
      ]
        .sort()
        .join(',')}`,
    );

  if (!signedUserId || !eventId || !timestamp || !signature) {
    log('missing_parameters');
    return new Response('Missing parameters', {status: 400});
  }
  const payload = timestamp + eventId + signedUserId + rewards;
  if (
    !keys.some((key: string) => safeEqual(signature, md5Hex(payload + key)))
  ) {
    log('invalid_signature');
    return new Response('Invalid signature', {status: 403});
  }
  const issuedAt = Date.parse(
    /^\d{12,}$/.test(timestamp)
      ? `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:00Z`
      : timestamp,
  );
  if (
    Number.isFinite(issuedAt) &&
    Date.now() - issuedAt > MAX_CALLBACK_AGE_MS
  ) {
    log('expired');
    return new Response('Expired event', {status: 410});
  }

  if (params.get(`custom_${REWARD_PURPOSE_PARAM}`) === BATTLE_AD_PURPOSE) {
    log('battle_invite');
    return new Response(`${eventId}:OK`, {status: 200});
  }

  const grant = isLevelPlayGrantMode();
  const result = await ctx.runMutation(internal.adReward.grantFromCallback, {
    eventId,
    appUserId,
    dryRun: !grant,
  });
  // Unknown users and daily limits are acknowledged too: retrying can never
  // change the outcome.
  log(grant ? result : `shadow_${result}`);
  return new Response(`${eventId}:OK`, {status: 200});
});

export const grantFromCallback = internalMutation({
  args: {
    eventId: v.string(),
    appUserId: v.string(),
    // Reports the outcome without recording the event or granting bulbs.
    dryRun: v.optional(v.boolean()),
  },
  returns: v.union(
    v.literal('granted'),
    v.literal('duplicate'),
    v.literal('limited'),
    v.literal('unknown_user'),
  ),
  handler: async (ctx, {eventId, appUserId, dryRun}) => {
    const existing = await ctx.db
      .query('adRewardEvents')
      .withIndex('by_eventId', (q) => q.eq('eventId', eventId))
      .first();
    if (existing) return 'duplicate';

    const userId = ctx.db.normalizeId('users', appUserId);
    if (!userId) return 'unknown_user';
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
    if (!profile || profile.deletedAt) return 'unknown_user';

    const dayStart = Date.parse(new Date().toISOString().slice(0, 10));
    const today = await ctx.db
      .query('adRewardEvents')
      .withIndex('by_user_and_created', (q) =>
        q.eq('userId', userId).gte('createdAt', dayStart),
      )
      .take(MAX_CALLBACK_REWARDS_PER_DAY);
    const bulbCount = profile.bulbCount ?? 0;
    const bulbsGranted =
      today.length >= MAX_CALLBACK_REWARDS_PER_DAY
        ? 0
        : Math.max(0, Math.min(AD_REWARD_BULBS, MAX_BULB_COUNT - bulbCount));
    if (dryRun) return bulbsGranted > 0 ? 'granted' : 'limited';

    await ctx.db.insert('adRewardEvents', {
      eventId,
      userId,
      bulbsGranted,
      createdAt: Date.now(),
    });
    if (bulbsGranted > 0) {
      await ctx.db.patch(profile._id, {
        bulbCount: bulbCount + bulbsGranted,
        updatedAt: new Date().toISOString(),
      });
    }
    return bulbsGranted > 0 ? 'granted' : 'limited';
  },
});
