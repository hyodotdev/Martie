import {defineTable} from 'convex/server';
import {v} from 'convex/values';

// LevelPlay server-to-server reward callbacks, one row per delivered event so
// retries never grant twice.
export const adRewardEventsTable = defineTable({
  eventId: v.string(),
  userId: v.id('users'),
  bulbsGranted: v.number(),
  createdAt: v.number(),
})
  .index('by_eventId', ['eventId'])
  .index('by_user_and_created', ['userId', 'createdAt']);
