import {getAuthUserId} from '@convex-dev/auth/server';
import {
  advance,
  buzz,
  createRoom,
  joinRoom,
  kickGuest,
  launch,
  leave,
  requestRematch,
  setReady,
  sweepStaleRooms,
} from '../../../convex/battle/mutations';
import {
  getMyBattleStats,
  getRoom,
  listMyBattles,
} from '../../../convex/battle/queries';
import {
  BATTLE_BUZZ_GRACE_MS,
  BATTLE_JUDGE_MS,
  BATTLE_COUNTDOWN_MS,
  BATTLE_LAUNCH_MS,
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
  kickGuest: handlerOf<CodeArgs, Result>(kickGuest),
  requestRematch: handlerOf<CodeArgs, Result & {code?: string}>(requestRematch),
  advance: handlerOf<{battleId: string; phaseVersion: number}, void>(advance),
  launch: handlerOf<{battleId: string; launchAt: number}, void>(launch),
  sweep: handlerOf<Record<string, never>, number>(sweepStaleRooms),
  getRoom: handlerOf<CodeArgs & {language?: 'en'}, Record<string, unknown> | null>(
    getRoom,
  ),
  getMyBattleStats: handlerOf<Record<string, never>, Record<string, number> | null>(
    getMyBattleStats,
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
// The match being played is the newest room (a rematch opens a new one).
const battle = () => fake.table('battles').at(-1)!;
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

// The lobby countdown reaching zero.
async function runLaunch() {
  const {_id, launchAt} = battle();
  clock = launchAt as number;
  await call.launch(ctx, {battleId: _id, launchAt: launchAt as number});
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
    launching: false,
  });
  as(GUEST);
  await expect(call.setReady(ctx, {code, ready: true})).resolves.toEqual({
    ok: true,
    launching: true,
  });
  await runLaunch();
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
    expect(fake.scheduled.at(-1)!.runAt).toBe(clock + BATTLE_COUNTDOWN_MS);

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
    // Both see who buzzed, but not the verdict, during the judging pause.
    expect(battle().phase).toBe('judging');
    as(GUEST);
    expect(await call.getRoom(ctx, {code})).toMatchObject({
      hostScore: 0,
      round: {first: {role: 'host', correct: null}, winner: null},
    });
    await expect(
      call.buzz(ctx, {code, index: 0, optionKey: wrongKey()}),
    ).resolves.toEqual({ok: false, reason: 'not_in_round'});
    await runScheduled();
    expect(battle().phase).toBe('second_chance');
    expect(await call.getRoom(ctx, {code})).toMatchObject({
      round: {first: {role: 'host', correct: false}},
    });
    as(HOST);
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
    expect(battle()).toMatchObject({phase: 'judging', guestScore: 0});
    await runScheduled();
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
      await runScheduled(); // judging ends
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

  it('keeps the question open for answers sent inside the grace window', async () => {
    const code = await openMatch();
    await runScheduled();
    const {phaseEndsAt} = battle();
    expect(fake.scheduled.at(-1)?.runAt).toBe(
      (phaseEndsAt as number) + BATTLE_BUZZ_GRACE_MS,
    );

    clock = (phaseEndsAt as number) + BATTLE_BUZZ_GRACE_MS - 100;
    as(HOST);
    await expect(
      call.buzz(ctx, {code, index: 0, optionKey: wrongKey()}),
    ).resolves.toEqual({ok: true, correct: false});
    expect(battle()).toMatchObject({phase: 'judging'});
    expect(fake.scheduled.at(-1)?.runAt).toBe(clock + BATTLE_JUDGE_MS);

    await runScheduled();
    expect(battle().phase).toBe('second_chance');
    expect(fake.scheduled.at(-1)?.runAt).toBe(
      (battle().phaseEndsAt as number) + BATTLE_BUZZ_GRACE_MS,
    );
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
    as(GUEST);
    expect(await call.getMyBattleStats(ctx, {})).toEqual({
      wins: 0,
      losses: 0,
      draws: 1,
      streak: 0,
      bestStreak: 0,
    });
  });

  it('keeps lifetime and head-to-head records across matches', async () => {
    const winAll = async (code: string, winner: string) => {
      await runScheduled();
      for (let index = 0; index < BATTLE_QUESTION_COUNT; index++) {
        as(winner);
        await call.buzz(ctx, {
          code,
          index,
          optionKey: currentRound().correctOptionKey as string,
        });
        await runScheduled(); // judging ends
        await runScheduled(); // reveal ends
      }
    };

    const first = await openMatch();
    await winAll(first, HOST);
    as(HOST);
    const second = (await call.requestRematch(ctx, {code: first})).code!;
    as(GUEST);
    await call.joinRoom(ctx, {code: second});
    for (const user of [HOST, GUEST]) {
      as(user);
      await call.setReady(ctx, {code: second, ready: true});
    }
    await runLaunch();
    await winAll(second, HOST);

    as(HOST);
    expect(await call.getMyBattleStats(ctx, {})).toEqual({
      wins: 2,
      losses: 0,
      draws: 0,
      streak: 2,
      bestStreak: 2,
    });
    as(GUEST);
    expect(await call.getRoom(ctx, {code: second})).toMatchObject({
      headToHead: {wins: 0, losses: 2, draws: 0},
      host: {record: {wins: 2, losses: 0, draws: 0}},
      guest: {record: {wins: 0, losses: 2, draws: 0}},
    });
    expect(fake.table('battleRivals')).toHaveLength(2);
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
    // A forfeit counts as a loss in the record.
    expect(await call.getMyBattleStats(ctx, {})).toMatchObject({losses: 1});
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

  it('counts down once both are ready and starts nothing if one backs out', async () => {
    as(HOST);
    const {code} = await call.createRoom(ctx, {});
    as(GUEST);
    await call.joinRoom(ctx, {code: code!});
    await call.setReady(ctx, {code: code!, ready: true});
    as(HOST);
    await call.setReady(ctx, {code: code!, ready: true});
    expect(battle()).toMatchObject({
      status: 'waiting',
      launchAt: clock + BATTLE_LAUNCH_MS,
    });
    await expect(call.getRoom(ctx, {code: code!})).resolves.toMatchObject({
      launchAt: clock + BATTLE_LAUNCH_MS,
    });
    const {launchAt} = battle();

    as(GUEST);
    await call.setReady(ctx, {code: code!, ready: false});
    expect(battle().launchAt).toBeUndefined();
    clock = launchAt as number;
    await call.launch(ctx, {battleId: battle()._id, launchAt: launchAt as number});
    expect(battle().status).toBe('waiting');
    expect(profile(HOST).bulbCount).toBe(3);

    // Readying again restarts the countdown from the top.
    await call.setReady(ctx, {code: code!, ready: true});
    expect(battle().launchAt).toBe(clock + BATTLE_LAUNCH_MS);
    await runLaunch();
    expect(battle()).toMatchObject({status: 'playing', phase: 'countdown'});
  });

  it('drops the countdown when a bulb is spent before it ends', async () => {
    as(HOST);
    const {code} = await call.createRoom(ctx, {});
    as(GUEST);
    await call.joinRoom(ctx, {code: code!});
    await call.setReady(ctx, {code: code!, ready: true});
    as(HOST);
    await call.setReady(ctx, {code: code!, ready: true});
    await ctx.db.patch(profile(GUEST)._id, {bulbCount: 0});
    await runLaunch();
    expect(battle()).toMatchObject({
      status: 'waiting',
      hostReady: true,
      guestReady: false,
    });
    expect(battle().launchAt).toBeUndefined();
    expect(profile(HOST).bulbCount).toBe(3);
  });

  it('only the host can kick the guest, who then cannot come back', async () => {
    as(HOST);
    const {code} = await call.createRoom(ctx, {});
    as(GUEST);
    await call.joinRoom(ctx, {code: code!});
    await call.setReady(ctx, {code: code!, ready: true});

    await expect(call.kickGuest(ctx, {code: code!})).resolves.toEqual({ok: false});

    as(HOST);
    await expect(call.kickGuest(ctx, {code: code!})).resolves.toEqual({ok: true});
    expect(battle()).toMatchObject({status: 'waiting', guestReady: false});
    expect(battle().guestUserId).toBeUndefined();

    as(GUEST);
    await expect(call.getRoom(ctx, {code: code!})).resolves.toMatchObject({
      myRole: null,
      kicked: true,
    });
    await expect(call.joinRoom(ctx, {code: code!})).resolves.toEqual({
      ok: false,
      reason: 'kicked',
    });

    as(HOST);
    await expect(call.kickGuest(ctx, {code: code!})).resolves.toEqual({ok: false});
    await expect(call.getRoom(ctx, {code: code!})).resolves.toMatchObject({
      myRole: 'host',
      kicked: false,
    });
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
    expect(fake.table('battles')[0].rematchCode).toBe(first.code);
  });
});
