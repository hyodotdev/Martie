import {getAuthUserId} from '@convex-dev/auth/server';
import {createUserProfile} from '../../convex/user/mutations';

jest.mock('@convex-dev/auth/server', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

type Context = {
  db: {
    get: jest.Mock;
    query: jest.Mock;
    patch: jest.Mock;
    insert: jest.Mock;
  };
};

const handler = (
  createUserProfile as unknown as {
    _handler: (ctx: Context, args: {email?: string}) => Promise<unknown>;
  }
)._handler;

const victimProfile = {
  _id: 'profile-victim',
  userId: 'user-victim',
  email: 'victim@example.com',
  displayName: 'Victim',
};

const attackerProfile = {
  _id: 'profile-attacker',
  userId: 'user-attacker',
  email: 'attacker@example.com',
  displayName: 'Attacker',
};

const createCtx = (): Context => ({
  db: {
    get: jest.fn(async () => ({
      _id: 'user-attacker',
      email: 'attacker@example.com',
    })),
    query: jest.fn(() => ({
      withIndex: (
        index: string,
        build: (q: {eq: (field: string, value: string) => unknown}) => unknown,
      ) => {
        let value = '';
        build({
          eq: (_field, v) => {
            value = v;
            return {};
          },
        });
        return {
          first: async () => {
            if (index === 'by_user') return null;
            if (value === victimProfile.email) return victimProfile;
            if (value === attackerProfile.email) return attackerProfile;
            return null;
          },
        };
      },
    })),
    patch: jest.fn(),
    insert: jest.fn(),
  },
});

beforeEach(() => {
  jest.mocked(getAuthUserId).mockResolvedValue('user-attacker' as never);
});

it('ignores a client-supplied email and never relinks another profile', async () => {
  const ctx = createCtx();

  const result = (await handler(ctx, {email: victimProfile.email})) as {
    _id: string;
  };

  expect(result._id).toBe(attackerProfile._id);
  expect(ctx.db.patch).not.toHaveBeenCalledWith(
    victimProfile._id,
    expect.anything(),
  );
});

it('rejects anonymous callers', async () => {
  jest.mocked(getAuthUserId).mockResolvedValue(null);
  await expect(handler(createCtx(), {})).rejects.toThrow('Not authenticated');
});
