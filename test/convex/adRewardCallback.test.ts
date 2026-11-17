import {createHash} from 'node:crypto';
import {
  grantFromCallback,
  levelPlayRewardCallback,
} from '../../convex/adReward';
import {md5Hex} from '../../convex/utils/md5';

type Row = Record<string, unknown>;
type Context = {
  db: {
    query: jest.Mock;
    insert: jest.Mock;
    patch: jest.Mock;
    normalizeId: jest.Mock;
  };
};

const grant = (
  grantFromCallback as unknown as {
    _handler: (
      ctx: Context,
      args: {eventId: string; appUserId: string; dryRun?: boolean},
    ) => Promise<string>;
  }
)._handler;

describe('md5Hex', () => {
  it.each(['', 'abc', 'The quick brown fox', 'x'.repeat(200), '한글 ✓'])(
    'matches node crypto for %j',
    (input) => {
      expect(md5Hex(input)).toBe(createHash('md5').update(input).digest('hex'));
    },
  );
});

describe('grantFromCallback', () => {
  let events: Row[];
  let profile: Row;
  const ctx = (): Context => ({
    db: {
      normalizeId: jest.fn((_table: string, id: string) =>
        id.startsWith('user') ? id : null,
      ),
      query: jest.fn((table: string) => ({
        withIndex: (
          index: string,
          build: (q: {
            eq: (field: string, value: unknown) => unknown;
            gte: (field: string, value: unknown) => unknown;
          }) => unknown,
        ) => {
          const filters: [string, string, unknown][] = [];
          const q = {
            eq: (field: string, value: unknown) => {
              filters.push(['eq', field, value]);
              return q;
            },
            gte: (field: string, value: unknown) => {
              filters.push(['gte', field, value]);
              return q;
            },
          };
          build(q);
          const rows = (table === 'adRewardEvents' ? events : [profile]).filter(
            (row) =>
              filters.every(([op, field, value]) =>
                op === 'eq'
                  ? row[field] === value
                  : (row[field] as number) >= (value as number),
              ),
          );
          return {
            first: async () => rows[0] ?? null,
            take: async (n: number) => rows.slice(0, n),
            index,
          };
        },
      })),
      insert: jest.fn(async (_table: string, row: Row) => {
        events.push(row);
      }),
      patch: jest.fn(async (_id: string, value: Row) => {
        profile = {...profile, ...value};
      }),
    },
  });

  beforeEach(() => {
    events = [];
    profile = {_id: 'profile-a', userId: 'user-a', bulbCount: 1};
  });

  it('grants once per event id', async () => {
    const c = ctx();
    await expect(grant(c, {eventId: 'e1', appUserId: 'user-a'})).resolves.toBe(
      'granted',
    );
    await expect(grant(c, {eventId: 'e1', appUserId: 'user-a'})).resolves.toBe(
      'duplicate',
    );
    expect(profile.bulbCount).toBe(3);
  });

  it('reports without writing in a dry run', async () => {
    const c = ctx();
    await expect(
      grant(c, {eventId: 'e1', appUserId: 'user-a', dryRun: true}),
    ).resolves.toBe('granted');
    expect(events).toHaveLength(0);
    expect(profile.bulbCount).toBe(1);
  });

  it('ignores unknown users', async () => {
    await expect(
      grant(ctx(), {eventId: 'e2', appUserId: 'not-a-user'}),
    ).resolves.toBe('unknown_user');
    expect(events).toHaveLength(0);
  });

  it('caps callback rewards per day', async () => {
    const c = ctx();
    for (let i = 0; i < 30; i++) {
      await grant(c, {eventId: `e${i}`, appUserId: 'user-a'});
    }
    await expect(
      grant(c, {eventId: 'over', appUserId: 'user-a'}),
    ).resolves.toBe('limited');
    expect(profile.bulbCount).toBe(1 + 30 * 2);
  });
});

describe('levelPlayRewardCallback', () => {
  const callback = (
    levelPlayRewardCallback as unknown as {
      _handler: (
        ctx: {runMutation: jest.Mock},
        request: Request,
      ) => Promise<Response>;
    }
  )._handler;
  const env = {...process.env};
  const timestamp = '202611171200';
  const url = (key: string, eventId = 'evt-1', extra = '') => {
    const signature = createHash('md5')
      .update(timestamp + eventId + 'sdk-user' + '2' + key)
      .digest('hex');
    return new Request(
      `https://example.invalid/levelplay/reward?appUserId=sdk-user&rewards=2&eventId=${eventId}&timestamp=${timestamp}&signature=${signature}${extra}`,
    );
  };
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  afterEach(() => {
    process.env = {...env};
  });

  it('grants the account sent as a custom param in grant mode', async () => {
    process.env.LEVELPLAY_S2S_PRIVATE_KEY = 'ios-key, android-key';
    process.env.LEVELPLAY_S2S_MODE = 'grant';
    const runMutation = jest.fn().mockResolvedValue('granted');
    const response = await callback(
      {runMutation},
      url('android-key', 'evt-1', '&custom_userId=user-a&dynamicUserId=x'),
    );
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('evt-1:OK');
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      eventId: 'evt-1',
      appUserId: 'user-a',
      dryRun: false,
    });
    expect(log).toHaveBeenLastCalledWith(
      expect.stringContaining('granted event=evt-1 user=custom'),
    );
  });

  it('verifies and acknowledges without granting in shadow mode', async () => {
    process.env.LEVELPLAY_S2S_PRIVATE_KEY = 'ios-key';
    const runMutation = jest.fn().mockResolvedValue('unknown_user');
    const response = await callback({runMutation}, url('ios-key'));
    await expect(response.text()).resolves.toBe('evt-1:OK');
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      eventId: 'evt-1',
      appUserId: 'sdk-user',
      dryRun: true,
    });
    expect(log).toHaveBeenLastCalledWith(
      expect.stringContaining('shadow_unknown_user event=evt-1 user=sdk'),
    );
  });

  it('reads POST body parameters', async () => {
    process.env.LEVELPLAY_S2S_PRIVATE_KEY = 'ios-key';
    const signed = url('ios-key', 'evt-post');
    const body = new URL(signed.url).searchParams.toString();
    const runMutation = jest.fn().mockResolvedValue('granted');
    const response = await callback(
      {runMutation},
      new Request('https://example.invalid/levelplay/reward', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body,
      }),
    );
    await expect(response.text()).resolves.toBe('evt-post:OK');
    expect(runMutation).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown signatures and missing configuration', async () => {
    const runMutation = jest.fn();
    process.env.LEVELPLAY_S2S_PRIVATE_KEY = 'ios-key';
    expect((await callback({runMutation}, url('other-key'))).status).toBe(403);
    expect(log).toHaveBeenLastCalledWith(
      expect.stringContaining('invalid_signature'),
    );
    delete process.env.LEVELPLAY_S2S_PRIVATE_KEY;
    expect((await callback({runMutation}, url('ios-key'))).status).toBe(503);
    expect(runMutation).not.toHaveBeenCalled();
  });
});
