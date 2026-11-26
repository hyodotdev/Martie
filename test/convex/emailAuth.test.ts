// Convex Auth 2 binds Martie's sign-in methods to its core. The core is
// replaced here so each method is its plain definition, with `ctx.convexAuth`
// and the component calls faked.

type MethodDefinition<Args, Result> = {
  handler: (ctx: MethodCtx, args: Args) => Promise<Result>;
};

type MethodCtx = {
  runQuery: jest.Mock;
  runMutation: jest.Mock;
  convexAuth: {
    completeSignIn: jest.Mock;
    completeSignUp: jest.Mock;
    signUpWithoutSession: jest.Mock;
  };
};

jest.mock(
  '@convex-dev/auth/server',
  () => ({
    setupConvexAuth: () => ({
      refreshSession: 'refreshSession',
      signOut: 'signOut',
      isAuthenticated: 'isAuthenticated',
      bindMethod: () => ({
        authMutation: (definition: unknown) => definition,
      }),
    }),
  }),
  {virtual: true},
);

jest.mock('../../convex/_generated/api', () => ({
  components: {
    auth: {name: 'auth'},
    authEmail: {
      name: 'authEmail',
      challenge: {
        custom: {
          start: 'custom.start',
          peek: 'custom.peek',
          complete: 'custom.complete',
          _internal_dangerous_completeForNewUser: 'custom.completeForNewUser',
        },
      },
    },
  },
  internal: {
    emailAuth: {
      createLinkUser: 'createLinkUser',
      createReviewUser: 'createReviewUser',
      createLegacyUser: 'createLegacyUser',
      userByEmail: 'userByEmail',
      deliverSignInLink: 'deliverSignInLink',
      sendSignInLinkEmail: 'sendSignInLinkEmail',
      consumeLegacySession: 'consumeLegacySession',
      takeReviewCodeAttempt: 'takeReviewCodeAttempt',
      resetReviewCodeAttempts: 'resetReviewCodeAttempts',
    },
  },
}));

const TOKENS = {
  accessToken: 'access',
  refreshToken: 'refresh',
  refreshTokenExpiresAt: 1,
  userId: 'user',
};

function makeCtx(): MethodCtx {
  return {
    runQuery: jest.fn(),
    runMutation: jest.fn(),
    convexAuth: {
      completeSignIn: jest.fn(() => Promise.resolve(TOKENS)),
      completeSignUp: jest.fn(() => Promise.resolve(TOKENS)),
      signUpWithoutSession: jest.fn(() =>
        Promise.resolve({userId: 'new-user'}),
      ),
    },
  };
}

const originalEnv = process.env;

function loadEmailAuth(env: Record<string, string> = {}) {
  process.env = {...originalEnv, ...env};
  let loaded: typeof import('../../convex/emailAuth') | undefined;
  // The module reads its env when it loads, so each env needs a fresh load.
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('../../convex/emailAuth');
  });
  if (!loaded) throw new Error('convex/emailAuth did not load');
  return loaded;
}

afterEach(() => {
  process.env = originalEnv;
});

const claim = {emailCode: 'code', browserSecret: 'secret'};

describe('signInWithLink', () => {
  const signInWithLink = () =>
    loadEmailAuth().signInWithLink as unknown as MethodDefinition<
      typeof claim,
      unknown
    >;

  it('signs in the user that owns the verified address', async () => {
    const ctx = makeCtx();
    ctx.runQuery.mockResolvedValueOnce({
      success: true,
      email: 'a@example.com',
      emailOwnerId: 'owner',
    });
    ctx.runMutation.mockResolvedValueOnce({
      success: true,
      email: 'a@example.com',
      emailOwnerId: 'owner',
    });

    await expect(signInWithLink().handler(ctx, claim)).resolves.toEqual({
      status: 'complete',
      tokens: TOKENS,
    });
    expect(ctx.runMutation).toHaveBeenCalledWith('custom.complete', {
      ...claim,
      purpose: 'martie/emailLink/signIn',
      currentUserId: null,
    });
    expect(ctx.convexAuth.completeSignIn).toHaveBeenCalledWith(
      expect.objectContaining({userId: 'owner'}),
    );
    expect(ctx.convexAuth.signUpWithoutSession).not.toHaveBeenCalled();
  });

  it('gives an unclaimed address to the user that signed in with codes', async () => {
    const ctx = makeCtx();
    ctx.runQuery
      .mockResolvedValueOnce({
        success: true,
        email: 'a@example.com',
        emailOwnerId: null,
      })
      .mockResolvedValueOnce('legacy-user');
    ctx.runMutation.mockResolvedValueOnce({
      success: true,
      email: 'a@example.com',
    });

    await signInWithLink().handler(ctx, claim);

    expect(ctx.runQuery).toHaveBeenLastCalledWith('userByEmail', {
      email: 'a@example.com',
    });
    expect(ctx.runMutation).toHaveBeenCalledWith('custom.completeForNewUser', {
      ...claim,
      purpose: 'martie/emailLink/signIn',
      userId: 'legacy-user',
    });
    expect(ctx.convexAuth.signUpWithoutSession).not.toHaveBeenCalled();
    expect(ctx.convexAuth.completeSignIn).toHaveBeenCalledWith(
      expect.objectContaining({userId: 'legacy-user'}),
    );
  });

  it('creates a user only for an address nobody has', async () => {
    const ctx = makeCtx();
    ctx.runQuery
      .mockResolvedValueOnce({
        success: true,
        email: 'new@example.com',
        emailOwnerId: null,
      })
      .mockResolvedValueOnce(null);
    ctx.runMutation.mockResolvedValueOnce({
      success: true,
      email: 'new@example.com',
    });

    await signInWithLink().handler(ctx, claim);

    expect(ctx.convexAuth.signUpWithoutSession).toHaveBeenCalledWith({
      profile: {email: 'new@example.com'},
    });
    expect(ctx.convexAuth.completeSignIn).toHaveBeenCalledWith(
      expect.objectContaining({userId: 'new-user'}),
    );
  });

  it('reports a dead link without signing anyone in', async () => {
    const ctx = makeCtx();
    ctx.runQuery.mockResolvedValueOnce({
      success: false,
      userError: {error: 'INVALID_CHALLENGE'},
    });

    await expect(signInWithLink().handler(ctx, claim)).resolves.toEqual({
      status: 'error',
      error: 'INVALID_CHALLENGE',
    });
    expect(ctx.runMutation).not.toHaveBeenCalled();
    expect(ctx.convexAuth.completeSignIn).not.toHaveBeenCalled();
  });
});

describe('signInWithReviewCode', () => {
  const env = {
    ENVIRONMENT: 'production',
    APP_REVIEW_FIXED_OTP_EMAILS: 'review@example.com',
    APP_REVIEW_FIXED_OTP_CODE: '12345678',
  };
  const signInWithReviewCode = () =>
    loadEmailAuth(env).signInWithReviewCode as unknown as MethodDefinition<
      {email: string; code: string},
      unknown
    >;

  it('rejects a wrong code and addresses outside the allow list', async () => {
    const ctx = makeCtx();
    const method = signInWithReviewCode();

    for (const args of [
      {email: 'review@example.com', code: '00000000'},
      {email: 'someone@example.com', code: '12345678'},
    ]) {
      await expect(method.handler(ctx, args)).resolves.toEqual({
        status: 'error',
        error: 'INCORRECT_CODE',
      });
    }
    expect(ctx.convexAuth.completeSignIn).not.toHaveBeenCalled();
    expect(ctx.convexAuth.completeSignUp).not.toHaveBeenCalled();
  });

  it('stops checking codes once the address has no attempts left', async () => {
    const ctx = makeCtx();
    ctx.runMutation.mockResolvedValueOnce(false);

    await expect(
      signInWithReviewCode().handler(ctx, {
        email: 'review@example.com',
        code: '12345678',
      }),
    ).resolves.toEqual({status: 'error', error: 'INCORRECT_CODE'});
    expect(ctx.runMutation).toHaveBeenCalledWith('takeReviewCodeAttempt', {
      email: 'review@example.com',
    });
    expect(ctx.convexAuth.completeSignIn).not.toHaveBeenCalled();
  });

  it('signs the review account in with the fixed code', async () => {
    const ctx = makeCtx();
    ctx.runMutation.mockResolvedValue(true);
    ctx.runQuery.mockResolvedValueOnce('review-user');

    await expect(
      signInWithReviewCode().handler(ctx, {
        email: ' Review@Example.com ',
        code: '12345678',
      }),
    ).resolves.toEqual({status: 'complete', tokens: TOKENS});
    expect(ctx.convexAuth.completeSignIn).toHaveBeenCalledWith(
      expect.objectContaining({userId: 'review-user'}),
    );
  });
});

describe('deliverSignInLink', () => {
  const deliver = () =>
    loadEmailAuth().deliverSignInLink as unknown as {
      _handler: (
        ctx: {scheduler: {runAfter: jest.Mock}},
        args: {from: string; to: string[]; text: string},
      ) => Promise<null>;
    };

  it('sends the localized email for the link in the challenge text', async () => {
    const runAfter = jest.fn();
    const link = 'https://hyo.dev/martie/sign-in-link?lang=ja&code=abc_123';

    await deliver()._handler(
      {scheduler: {runAfter}},
      {
        from: 'Martie <martie@hyo.dev>',
        to: ['a@example.com'],
        text: `\n\n${link}\n\nThe link stops working after 10 minutes.`,
      },
    );

    expect(runAfter).toHaveBeenCalledWith(0, 'sendSignInLinkEmail', {
      from: 'Martie <martie@hyo.dev>',
      to: ['a@example.com'],
      link,
      locale: 'ja',
    });
  });
});

describe('consumeLegacySession', () => {
  type Row = {_id: string; [key: string]: unknown};

  function makeDb(rows: Row[]) {
    const byId = new Map(rows.map((row) => [row._id, row]));
    return {
      byId,
      normalizeId: (_table: string, id: string) => (id ? id : null),
      get: jest.fn((id: string) => Promise.resolve(byId.get(id) ?? null)),
      delete: jest.fn((id: string) => {
        byId.delete(id);
        return Promise.resolve();
      }),
      query: () => ({
        withIndex: (
          _index: string,
          select: (q: {eq: (field: string, value: string) => unknown}) => void,
        ) => {
          let sessionId = '';
          select({
            eq: (_field, value) => {
              sessionId = value;
              return undefined;
            },
          });
          return {
            collect: () =>
              Promise.resolve(
                [...byId.values()].filter(
                  (row) => row.sessionId === sessionId,
                ),
              ),
          };
        },
      }),
    };
  }

  const consume = () =>
    loadEmailAuth().consumeLegacySession as unknown as {
      _handler: (
        ctx: {db: ReturnType<typeof makeDb>},
        args: {refreshToken: string},
      ) => Promise<string | null>;
    };

  const future = Date.now() + 60_000;
  const session = {_id: 'session', userId: 'user', expirationTime: future};
  const token = {_id: 'token', sessionId: 'session', expirationTime: future};

  it('trades the newest token of a live session once', async () => {
    const db = makeDb([session, token]);

    await expect(
      consume()._handler({db}, {refreshToken: 'token|session'}),
    ).resolves.toBe('user');
    expect(db.byId.size).toBe(0);
  });

  it('refuses a token that a later refresh replaced', async () => {
    const child = {...token, _id: 'child', parentRefreshTokenId: 'token'};
    const db = makeDb([session, token, child]);

    await expect(
      consume()._handler({db}, {refreshToken: 'token|session'}),
    ).resolves.toBeNull();
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('refuses expired, mismatched and malformed tokens', async () => {
    const expired = {...token, expirationTime: Date.now() - 1};
    const db = makeDb([session, expired]);

    for (const refreshToken of ['token|session', 'token|other', 'garbage']) {
      await expect(
        consume()._handler({db}, {refreshToken}),
      ).resolves.toBeNull();
    }
    expect(db.delete).not.toHaveBeenCalled();
  });
});

describe('takeReviewCodeAttempt', () => {
  type Limit = {_id: string; lastAttemptTime: number; attemptsLeft: number};

  function makeDb(initial: Limit | null) {
    let limit = initial;
    return {
      get limit() {
        return limit;
      },
      query: () => ({
        withIndex: () => ({unique: () => Promise.resolve(limit)}),
      }),
      insert: jest.fn((_table: string, doc: Omit<Limit, '_id'>) => {
        limit = {_id: 'limit', ...doc};
        return Promise.resolve('limit');
      }),
      patch: jest.fn((_id: string, fields: Partial<Limit>) => {
        if (limit) limit = {...limit, ...fields};
        return Promise.resolve();
      }),
    };
  }

  const take = () =>
    loadEmailAuth().takeReviewCodeAttempt as unknown as {
      _handler: (
        ctx: {db: ReturnType<typeof makeDb>},
        args: {email: string},
      ) => Promise<boolean>;
    };

  it('allows ten attempts an hour, then refuses', async () => {
    const db = makeDb(null);
    const results: boolean[] = [];
    for (let i = 0; i < 11; i++) {
      results.push(await take()._handler({db}, {email: 'a@example.com'}));
    }
    expect(results.filter(Boolean)).toHaveLength(10);
    expect(results[10]).toBe(false);
  });

  it('gives the attempts back after an hour', async () => {
    const db = makeDb({
      _id: 'limit',
      lastAttemptTime: Date.now() - 61 * 60 * 1000,
      attemptsLeft: 0,
    });

    await expect(
      take()._handler({db}, {email: 'a@example.com'}),
    ).resolves.toBe(true);
    expect(db.limit?.attemptsLeft).toBe(9);
  });
});
