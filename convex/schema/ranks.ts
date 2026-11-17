import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const ranksTable = defineTable({
  userId: v.id('users'),
  correctCount: v.number(),
  totalAttempts: v.number(),
  accuracy: v.number(),
  lastUpdated: v.number(),
})
  .index('by_userId', ['userId'])
  .index('by_correctCount', ['correctCount'])
  .index('by_accuracy', ['accuracy']);
