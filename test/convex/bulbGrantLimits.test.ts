import {getAuthUserId} from '../../convex/utils/auth';
import {
  claimDailyCheckIn,
  claimRechargeBulbs,
  grantTestBulbs,
  MAX_RECHARGES_PER_DAY,
  syncBulbCount,
  updateBulbCount,
} from '../../convex/user/mutations';

jest.mock('../../convex/utils/auth', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

type Profile = {
  _id: string;
  userId: string;
  email: string;
  bulbCount?: number;
  isPremium?: boolean;
  premiumExpiration?: number;
  lastCheckInDate?: string;
  rechargeDate?: string;
  rechargeCount?: number;
  guestBulbsSyncedAt?: string;
};

type Context = {db: {query: jest.Mock; patch: jest.Mock; get: jest.Mock}};
type Handler<Args, Result> = {
  _handler: (ctx: Context, args: Args) => Promise<Result>;
};

const update = (
  updateBulbCount as unknown as Handler<
    {count: number; operation: 'set' | 'add' | 'subtract'},
    number
  >
)._handler;
const sync = (
  syncBulbCount as unknown as Handler<{localBulbCount: number}, number>
)._handler;
const checkIn = (
  claimDailyCheckIn as unknown as Handler<
    Record<string, never>,
    {granted: number; bulbCount: number}
  >
)._handler;
const recharge = (
  claimRechargeBulbs as unknown as Handler<
    {reason: 'completed' | 'unavailable' | 'consent_unavailable' | 'web'},
    {granted: number; pending: boolean; bulbCount: number}
  >
)._handler;
const testGrant = (
  grantTestBulbs as unknown as Handler<{count: number}, number>
)._handler;

let profile: Profile;
const env = {...process.env};

const createCtx = (): Context => ({
  db: {
    get: jest.fn(),
    query: jest.fn(() => ({
      withIndex: () => ({first: async () => profile}),
    })),
    patch: jest.fn(async (_id: string, value: Partial<Profile>) => {
      profile = {...profile, ...value};
    }),
  },
});

beforeEach(() => {
  profile = {
    _id: 'profile-a',
    userId: 'user-a',
    email: 'a@example.com',
    bulbCount: 5,
  };
  process.env = {...env};
  delete process.env.LEVELPLAY_S2S_PRIVATE_KEY;
  delete process.env.LEVELPLAY_S2S_MODE;
  delete process.env.ALLOW_TEST_BULB_GRANTS;
  jest.mocked(getAuthUserId).mockResolvedValue('user-a' as never);
});

afterAll(() => {
  process.env = env;
});

describe('updateBulbCount', () => {
  it('rejects client-side grants', async () => {
    await expect(
      update(createCtx(), {count: 30, operation: 'add'}),
    ).rejects.toThrow('granted by the server');
    expect(profile.bulbCount).toBe(5);
  });

  it('only lets set lower the balance and subtract spend it', async () => {
    await expect(
      update(createCtx(), {count: 9999, operation: 'set'}),
    ).resolves.toBe(5);
    await expect(
      update(createCtx(), {count: 2, operation: 'subtract'}),
    ).resolves.toBe(3);
    await expect(
      update(createCtx(), {count: NaN, operation: 'subtract'}),
    ).resolves.toBe(3);
  });
});

describe('claimDailyCheckIn', () => {
  it('grants once per day', async () => {
    const ctx = createCtx();
    await expect(checkIn(ctx, {})).resolves.toEqual({
      granted: 3,
      bulbCount: 8,
    });
    await expect(checkIn(ctx, {})).resolves.toEqual({
      granted: 0,
      bulbCount: 8,
    });
  });

  it('skips active premium players', async () => {
    profile.isPremium = true;
    profile.premiumExpiration = Date.now() + 60_000;
    await expect(checkIn(createCtx(), {})).resolves.toEqual({
      granted: 0,
      bulbCount: 5,
    });
  });
});

describe('claimRechargeBulbs', () => {
  it('limits free recharges per day', async () => {
    const ctx = createCtx();
    for (let i = 0; i < MAX_RECHARGES_PER_DAY; i++) {
      await expect(recharge(ctx, {reason: 'unavailable'})).resolves.toEqual(
        expect.objectContaining({granted: 2, pending: false}),
      );
    }
    await expect(recharge(ctx, {reason: 'web'})).resolves.toEqual(
      expect.objectContaining({granted: 0, pending: false}),
    );
    expect(profile.bulbCount).toBe(5 + 2 * MAX_RECHARGES_PER_DAY);
  });

  it('keeps crediting completed ads while callbacks run in shadow mode', async () => {
    process.env.LEVELPLAY_S2S_PRIVATE_KEY = 'secret';
    await expect(recharge(createCtx(), {reason: 'completed'})).resolves.toEqual(
      expect.objectContaining({granted: 2, pending: false}),
    );
  });

  it('leaves completed ads to the LevelPlay callback in grant mode', async () => {
    process.env.LEVELPLAY_S2S_PRIVATE_KEY = 'secret';
    process.env.LEVELPLAY_S2S_MODE = 'grant';
    await expect(recharge(createCtx(), {reason: 'completed'})).resolves.toEqual(
      {granted: 0, pending: true, bulbCount: 5},
    );
    await expect(
      recharge(createCtx(), {reason: 'unavailable'}),
    ).resolves.toEqual(expect.objectContaining({granted: 2}));
  });
});

describe('grantTestBulbs', () => {
  it('is disabled unless the deployment opts in', async () => {
    await expect(testGrant(createCtx(), {count: 10})).rejects.toThrow(
      'disabled',
    );
    process.env.ALLOW_TEST_BULB_GRANTS = '1';
    process.env.ENVIRONMENT = 'production';
    await expect(testGrant(createCtx(), {count: 10})).rejects.toThrow(
      'disabled',
    );
    delete process.env.ENVIRONMENT;
    await expect(testGrant(createCtx(), {count: 10})).resolves.toBe(15);
  });
});

describe('syncBulbCount', () => {
  it('merges guest bulbs once and caps them', async () => {
    const ctx = createCtx();
    await expect(sync(ctx, {localBulbCount: 9999})).resolves.toBe(300);
    await expect(sync(ctx, {localBulbCount: 9999})).resolves.toBe(300);
    expect(profile.guestBulbsSyncedAt).toBeDefined();
  });
});
