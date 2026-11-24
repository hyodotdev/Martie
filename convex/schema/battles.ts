import {defineTable} from 'convex/server';
import {v} from 'convex/values';

const battleRole = v.union(v.literal('host'), v.literal('guest'));

// One 1:1 buzzer battle room. Scores live here so the room subscription
// carries everything both players need.
export const battlesTable = defineTable({
  code: v.string(),
  status: v.union(
    v.literal('waiting'),
    v.literal('playing'),
    v.literal('finished'),
    v.literal('closed'),
  ),
  hostUserId: v.id('users'),
  guestUserId: v.optional(v.id('users')),
  hostReady: v.boolean(),
  guestReady: v.boolean(),
  hostSeenAt: v.number(),
  guestSeenAt: v.optional(v.number()),
  createdAt: v.number(),
  // Picked when the match starts so nothing leaks while the room is open.
  quizIds: v.array(v.id('quizzes')),
  currentIndex: v.number(),
  phase: v.optional(
    v.union(
      v.literal('countdown'),
      v.literal('question'),
      v.literal('second_chance'),
      v.literal('judging'),
      v.literal('reveal'),
    ),
  ),
  phaseStartedAt: v.optional(v.number()),
  phaseEndsAt: v.optional(v.number()),
  // Bumped on every phase change; scheduled timeouts carry the version they
  // were scheduled for and do nothing once it moved on.
  phaseVersion: v.number(),
  hostScore: v.number(),
  guestScore: v.number(),
  hostCorrectMs: v.number(),
  guestCorrectMs: v.number(),
  startedAt: v.optional(v.number()),
  finishedAt: v.optional(v.number()),
  outcome: v.optional(
    v.union(v.literal('host'), v.literal('guest'), v.literal('draw')),
  ),
  endReason: v.optional(
    v.union(
      v.literal('completed'),
      v.literal('forfeit'),
      v.literal('host_left'),
    ),
  ),
  forfeitedBy: v.optional(battleRole),
  rematchCode: v.optional(v.string()),
  // Guests the host removed; they cannot take the seat again.
  kickedUserIds: v.optional(v.array(v.id('users'))),
})
  .index('by_code', ['code'])
  .index('by_host_and_created', ['hostUserId', 'createdAt'])
  .index('by_status_and_host_seen', ['status', 'hostSeenAt']);

export const battleRoundsTable = defineTable({
  battleId: v.id('battles'),
  index: v.number(),
  quizId: v.id('quizzes'),
  // Display order shared by both players, like a quiz-show board.
  optionKeys: v.array(v.string()),
  correctOptionKey: v.string(),
  first: v.optional(
    v.object({
      role: battleRole,
      optionKey: v.string(),
      correct: v.boolean(),
      elapsedMs: v.number(),
    }),
  ),
  second: v.optional(
    v.object({
      role: battleRole,
      optionKey: v.string(),
      correct: v.boolean(),
      elapsedMs: v.number(),
    }),
  ),
  winner: v.optional(battleRole),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
}).index('by_battle_and_index', ['battleId', 'index']);

// One row per player per started match, for the paginated history list.
export const battlePlayersTable = defineTable({
  battleId: v.id('battles'),
  userId: v.id('users'),
  opponentUserId: v.id('users'),
  role: battleRole,
  createdAt: v.number(),
  result: v.optional(
    v.union(v.literal('win'), v.literal('loss'), v.literal('draw')),
  ),
  myScore: v.optional(v.number()),
  opponentScore: v.optional(v.number()),
})
  .index('by_user_and_created', ['userId', 'createdAt'])
  .index('by_battle', ['battleId']);

const recordFields = {
  wins: v.number(),
  losses: v.number(),
  draws: v.number(),
};

// Lifetime 1:1 record per player, kept beside the history so it never needs
// the whole history to be read.
export const battleStatsTable = defineTable({
  userId: v.id('users'),
  ...recordFields,
  streak: v.number(),
  bestStreak: v.number(),
  updatedAt: v.number(),
}).index('by_user', ['userId']);

// Head-to-head record from `userId`'s side against one opponent.
export const battleRivalsTable = defineTable({
  userId: v.id('users'),
  opponentUserId: v.id('users'),
  ...recordFields,
  lastPlayedAt: v.number(),
}).index('by_user_and_opponent', ['userId', 'opponentUserId']);
