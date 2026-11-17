import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const quizSubmissionsTable = defineTable({
  userId: v.id('users'),
  categoryId: v.id('categories'),
  language: v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
  question: v.string(),
  options: v.array(
    v.object({
      text: v.string(),
      isAnswer: v.boolean(),
    }),
  ),
  answerExplanation: v.optional(v.string()),
  status: v.union(
    v.literal('pending'),
    v.literal('approved'),
    v.literal('rejected'),
  ),
  rejectionReason: v.optional(v.string()),
  reviewedBy: v.optional(v.id('users')),
  reviewedAt: v.optional(v.string()),
  quizId: v.optional(v.id('quizzes')),
  createdAt: v.string(),
})
  .index('by_user', ['userId'])
  .index('by_user_and_createdAt', ['userId', 'createdAt'])
  .index('by_status', ['status'])
  .index('by_status_and_createdAt', ['status', 'createdAt'])
  .index('by_createdAt', ['createdAt'])
  .index('by_user_and_status', ['userId', 'status']);
