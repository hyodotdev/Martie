import {getAuthUserId as getLegacyAuthUserId} from '@convex-dev/auth-v1/server';
import {getAuthUserId} from '../../convex/utils/auth';

jest.mock(
  '@convex-dev/auth-v1/server',
  () => ({getAuthUserId: jest.fn(() => Promise.resolve('legacy-user'))}),
  {virtual: true},
);

jest.mock('../../convex/_generated/api', () => ({
  components: {auth: {public: {getSession: 'auth.public.getSession'}}},
}));

type Ctx = Parameters<typeof getAuthUserId>[0];

function makeCtx(
  identity: {issuer: string; subject: string} | null,
  session: {userId: string} | null = null,
) {
  return {
    auth: {getUserIdentity: jest.fn(() => Promise.resolve(identity))},
    runQuery: jest.fn(() => Promise.resolve(session)),
  };
}

describe('getAuthUserId', () => {
  it('reads the session of a Convex Auth 2 token', async () => {
    const ctx = makeCtx(
      {
        issuer: 'https://example.convex.cloud/components/auth',
        subject: 'session-1',
      },
      {userId: 'user-2'},
    );

    await expect(getAuthUserId(ctx as unknown as Ctx)).resolves.toBe('user-2');
    expect(ctx.runQuery).toHaveBeenCalledWith('auth.public.getSession', {
      sessionId: 'session-1',
    });
    expect(getLegacyAuthUserId).not.toHaveBeenCalled();
  });

  it('is signed out once a Convex Auth 2 session is gone', async () => {
    const ctx = makeCtx({
      issuer: 'https://example.convex.cloud/components/auth',
      subject: 'revoked',
    });

    await expect(getAuthUserId(ctx as unknown as Ctx)).resolves.toBeNull();
  });

  it('keeps accepting Convex Auth 0.0.x tokens from older apps', async () => {
    const ctx = makeCtx({
      issuer: 'https://example.convex.site',
      subject: 'user|session',
    });

    await expect(getAuthUserId(ctx as unknown as Ctx)).resolves.toBe(
      'legacy-user',
    );
    expect(ctx.runQuery).not.toHaveBeenCalled();
  });

  it('is null without a token', async () => {
    await expect(
      getAuthUserId(makeCtx(null) as unknown as Ctx),
    ).resolves.toBeNull();
  });
});
