import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const dailyChallengesTable = defineTable({
  date: v.string(), // "2026-04-12" format
  quizIds: v.array(v.id('quizzes')),
  categoryId: v.id('categories'),
})
  .index('by_date', ['date']);
