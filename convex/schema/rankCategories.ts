import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const rankCategoriesTable = defineTable({
  userId: v.id('users'),
  categoryId: v.id('categories'),
  correctAnswers: v.number(),
  totalAttempts: v.number(),
  highestLevel: v.number(),
  lastAttemptAt: v.string(),
}).index('by_user_and_category', ['userId', 'categoryId']);
