import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const userCategoriesTable = defineTable({
  userId: v.id('users'),
  categoryId: v.id('categories'),
  totalAttempts: v.number(),
  correctAnswers: v.number(),
  lastAttemptAt: v.string(),
  highestLevel: v.number(),
})
  .index('by_userId', ['userId'])
  .index('by_userId_and_categoryId', ['userId', 'categoryId']);
