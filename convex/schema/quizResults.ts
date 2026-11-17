import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const quizResultsTable = defineTable({
  userId: v.id('users'),
  quizId: v.id('quizzes'),
  categoryName: v.string(),
  isCorrect: v.boolean(),
  selectedOptionIndex: v.number(),
  timeSpentMs: v.number(),
  level: v.number(),
  createdAt: v.string(),
  isDaily: v.optional(v.boolean()),
})
  .index('by_user_and_correct', ['userId', 'isCorrect'])
  .index('by_user_and_date', ['userId', 'createdAt'])
  .index('by_user_and_quiz', ['userId', 'quizId'])
  .index('by_quiz', ['quizId']);
