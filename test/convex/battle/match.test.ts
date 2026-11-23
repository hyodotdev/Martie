import {getAuthUserId} from '@convex-dev/auth/server';
import {
  advance,
  buzz,
  createRoom,
  joinRoom,
  leave,
  requestRematch,
  setReady,
  sweepStaleRooms,
} from '../../../convex/battle/mutations';
import {getRoom, listMyBattles} from '../../../convex/battle/queries';
import {
  BATTLE_COUNTDOWN_MS,
  BATTLE_PRESENCE_STALE_MS,
  BATTLE_QUESTION_COUNT,
} from '../../../convex/battle/logic';
import {createFakeCtx, handlerOf, type FakeCtx} from './fakeDb';

jest.mock('@convex-dev/auth/server', () => ({getAuthUserId: jest.fn()}), {
  virtual: true,
});

const HOST = 'users:host';
const GUEST = 'users:guest';

type Result = {ok: boolean; [key: string]: unknown};
type CodeArgs = {code: string};

const call = {
  createRoom: handlerOf<Record<string, never>, Result & {code?: string}>(createRoom),
  joinRoom: handlerOf<CodeArgs, Result>(joinRoom),
  setReady: handlerOf<CodeArgs & {ready: boolean}, Result>(setReady),
  buzz: handlerOf<CodeArgs & {index: number; optionKey: string}, Result>(buzz),
  leave: handlerOf<CodeArgs, Result>(leave),
  requestRematch: handlerOf<CodeArgs, Result & {code?: string}>(requestRematch),
  advance: handlerOf<{battleId: string; phaseVersion: number}, void>(advance),
  sweep: handlerOf<Record<string, never>, number>(sweepStaleRooms),
  getRoom: handlerOf<CodeArgs & {language?: 'en'}, Record<string, unknown> | null>(
    getRoom,
  ),
  listMyBattles: handlerOf<
    {paginationOpts: {numItems: number; cursor: string | null}},
    {page: Record<string, unknown>[]}
  >(listMyBattles),
};

let clock = 1_000_000;
let fake: ReturnType<typeof createFakeCtx>;
let ctx: FakeCtx;

const as = (userId: string | null) => {
  (getAuthUserId as jest.Mock).mockResolvedValue(userId);
};
const battle = () => fake.table('battles')[0];
const profile = (userId: string) =>
  fake.table('userProfiles').find((p) => p.userId === userId)!;
const currentRound = () =>
  fake
    .table('battleRounds')
    .find((r) => r.battleId === battle()._id && r.index === battle().currentIndex)!;
const wrongKey = () =>
  (currentRound().optionKeys as string[]).find(
    (key) => key !== currentRound().correctOptionKey,
  )!;

async function runScheduled() {
  const {_id, phaseVersion, phaseEndsAt} = battle();
  clock = phaseEndsAt as number;
  await call.advance(ctx, {
    battleId: _id,
    phaseVersion: phaseVersion as number,
  });
}

async function openMatch(): Promise<string> {
  as(HOST);
  const created = await call.createRoom(ctx, {});
  const code = created.code!;
  as(GUEST);
  await expect(call.joinRoom(ctx, {code})).resolves.toMatchObject({
    ok: true,
    role: 'guest',
  });
  as(HOST);
  await expect(call.setReady(ctx, {code, ready: true})).resolves.toEqual({
    ok: true,
    started: false,
  });
  as(GUEST);
  await expect(call.setReady(ctx, {code, ready: true})).resolves.toEqual({
    ok: true,
    started: true,
  });
  return code;
}

beforeEach(async () => {
  clock = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  fake = createFakeCtx();
  ctx = fake.ctx;
  for (const userId of [HOST, GUEST]) {
    await ctx.db.insert('userProfiles', {
      userId,
      email: `${userId}@example.com`,
      displayName: userId === HOST ? 'Host' : 'Guest',
      level: 1,
      totalPoints: 0,
      bulbCount: 3,
    });
  }
  const categoryId = await ctx.db.insert('categories', {name: 'SCIENCE'});
  for (let i = 0; i < 12; i++) {
    await ctx.db.insert('quizzes', {
      categoryId,
      level: 1,
      key: `q${i}`,
      answerKey: `q${i}_answer`,
      indexes: [],
      options: [
        {key: `q${i}_a`, isAnswer: true},
        {key: `q${i}_b`},
        {key: `q${i}_c`},
      ],
    });
  }
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('battle match', () => {
  it('plays a full buzzer match and pays the winner both stakes', async () => {
    const code = await openMatch();
    expect(battle()).toMatchObject({status: 'playing', phase: 'countdown'});
    expect(battle().quizIds).toHaveLength(BATTLE_QUESTION_COUNT);
    expect(profile(HOST).bulbCount).toBe(2);
    expect(profile(GUEST).bulbCount).toBe(2);
    expect(fake.scheduled[0].runAt).toBe(clock + BATTLE_COUNTDOWN_MS);

    // No question is visible during the countdown.
    as(GUEST);
    expect(await call.getRoom(ctx, {code})).toMatchObject({round: null});

    await runScheduled();
    expect(battle()).toMatchObject({phase: 'question', currentIndex: 0});
    const asked = await call.getRoom(ctx, {code});
    expect(asked).toMatchObject({
      round: {index: 0, correctOptionKey: null, first: null},
    });

    // Host misses, guest takes the second chance.
    clock += 2000;
    as(HOST);
    await expect(
      call.buzz(ctx, {code, index: 0, optionKey: wrongKey()}),
    ).resolves.toEqual({ok: true, correct: false});
    expect(battle().phase).toBe('second_chance');
    await expect(
      call.buzz(ctx, {code, index: 0, optionKey: wrongKey()}),
    ).resolves.toEqual({ok: false, reason: 'not_your_turn'});

    clock += 1500;
    as(GUEST);
    await expect(
      call.buzz(ctx, {
        code,
        index: 0,
        optionKey: currentRound().correctOptionKey as string,
      }),
    ).resolves.toEqual({ok: true, correct: true});
    expect(battle()).toMatchObject({
      phase: 'reveal',
      guestScore: 1,
      guestCorrectMs: 1500,
    });
    expect(await call.getRoom(ctx, {code})).toMatchObject({
      round: {winner: 'guest', correctOptionKey: currentRound().correctOptionKey},
    });

    // Host answers every remaining question first and right.
    for (let index = 1; index < BATTLE_QUESTION_COUNT; index++) {
      await runScheduled();
      expect(battle()).toMatchObject({phase: 'question', currentIndex: index});
      clock += 1000;
      as(HOST);
      await call.buzz(ctx, {
        code,
        index,
        optionKey: currentRound().correctOptionKey as string,
      });
    }
    await runScheduled();

    expect(battle()).toMatchObject({
      status: 'finished',
      outcome: 'host',
      endReason: 'completed',
      hostScore: 9,
      guestScore: 1,
    });
    expect(profile(HOST).bulbCount).toBe(4);
    expect(profile(GUEST).bulbCount).toBe(2);
    expect(
      fake.table('battlePlayers').map((p) => [p.userId, p.result, p.myScore]),
    ).toEqual([
      [HOST, 'win', 9],
      [GUEST, 'loss', 1],
    ]);

    as(HOST);
    const history = await call.listMyBattles(ctx, {
      paginationOpts: {numItems: 10, cursor: null},
    });
    expect(history.page).toEqual([
      expect.objectContaining({
        code,
        result: 'win',
        myScore: 9,
        opponentScore: 1,
        opponentName: 'Guest',
      }),
    ]);
  });

  it('reveals with no point when nobody answers, and ignores stale timers', async () => {
    await openMatch();
    await runScheduled();
    const staleVersion = battle().phaseVersion as number;
    await runScheduled();
    expect(battle()).toMatchObject({phase: 'reveal', hostScore: 0, guestScore: 0});

    await call.advance(ctx, {battleId: battle()._id, phaseVersion: staleVersion});
    expect(battle()).toMatchObject({phase: 'reveal', currentIndex: 0});
  });

  it('a draw refunds both stakes', async () => {
    await openMatch();
    await runScheduled();
    for (let index = 0; index < BATTLE_QUESTION_COUNT; index++) {
      await runScheduled(); // question times out
      await runScheduled(); // reveal ends
    }
    expect(battle()).toMatchObject({status: 'finished', outcome: 'draw'});
    expect(profile(HOST).bulbCount).toBe(3);
    expect(profile(GUEST).bulbCount).toBe(3);
  });

  it('leaving a running match forfeits it to the other player', async () => {
    const code = await openMatch();
    await runScheduled();
    as(GUEST);
    await call.leave(ctx, {code});
    expect(battle()).toMatchObject({
      status: 'finished',
      outcome: 'host',
      endReason: 'forfeit',
      forfeitedBy: 'guest',
    });
    expect(profile(HOST).bulbCount).toBe(4);
  });

  it('does not start or charge when the opponent has no bulb', async () => {
    as(HOST);
    const {code} = await call.createRoom(ctx, {});
    as(GUEST);
    await call.joinRoom(ctx, {code: code!});
    await call.setReady(ctx, {code: code!, ready: true});
    await ctx.db.patch(profile(HOST)._id, {bulbCount: 0});
    as(GUEST);
    await call.setReady(ctx, {code: code!, ready: false});
    await call.setReady(ctx, {code: code!, ready: true});
    as(HOST);
    await expect(call.setReady(ctx, {code: code!, ready: true})).resolves.toEqual({
      ok: false,
      reason: 'insufficient_bulbs',
    });
    expect(battle()).toMatchObject({status: 'waiting', hostReady: false});
    expect(profile(GUEST).bulbCount).toBe(3);
  });
});

describe('battle lobby', () => {
  it('needs sign-in and a bulb to open a room', async () => {
    as(null);
    await expect(call.createRoom(ctx, {})).resolves.toEqual({
      ok: false,
      reason: 'not_authenticated',
    });
    as(HOST);
    await ctx.db.patch(profile(HOST)._id, {bulbCount: 0});
    await expect(call.createRoom(ctx, {})).resolves.toEqual({
      ok: false,
      reason: 'insufficient_bulbs',
    });
  });

  it('a guest leaving frees the seat; the host leaving closes the room', async () => {
    as(HOST);
    const {code} = await call.createRoom(ctx, {});
    as(GUEST);
    await call.joinRoom(ctx, {code: code!});
    as('users:third');
    await ctx.db.insert('userProfiles', {
      userId: 'users:third',
      email: 'third@example.com',
      displayName: 'Third',
      level: 1,
      totalPoints: 0,
      bulbCount: 1,
    });
    await expect(call.joinRoom(ctx, {code: code!})).resolves.toEqual({
      ok: false,
      reason: 'full',
    });

    as(GUEST);
    await call.leave(ctx, {code: code!});
    expect(battle().guestUserId).toBeUndefined();

    as(HOST);
    await call.leave(ctx, {code: code!});
    expect(battle()).toMatchObject({status: 'closed', endReason: 'host_left'});
  });

  it('a new room replaces the host’s open one', async () => {
    as(HOST);
    await call.createRoom(ctx, {});
    await call.createRoom(ctx, {});
    expect(fake.table('battles').map((b) => b.status)).toEqual([
      'closed',
      'waiting',
    ]);
  });

  it('closes rooms whose host stopped sending heartbeats', async () => {
    as(HOST);
    const {code} = await call.createRoom(ctx, {});
    clock += BATTLE_PRESENCE_STALE_MS + 1;
    as(GUEST);
    await expect(call.joinRoom(ctx, {code: code!})).resolves.toEqual({
      ok: false,
      reason: 'host_offline',
    });
    await expect(call.sweep(ctx, {})).resolves.toBe(1);
    expect(battle().status).toBe('closed');
  });

  it('a rematch opens one shared room for both players', async () => {
    const code = await openMatch();
    as(GUEST);
    await call.leave(ctx, {code});

    as(GUEST);
    const first = await call.requestRematch(ctx, {code});
    as(HOST);
    const second = await call.requestRematch(ctx, {code});
    expect(first).toMatchObject({ok: true});
    expect(second.code).toBe(first.code);
    expect(battle().rematchCode).toBe(first.code);
  });
});
