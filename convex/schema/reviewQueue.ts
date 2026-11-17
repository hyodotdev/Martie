import {defineTable} from 'convex/server';
import {v} from 'convex/values';

export const reviewQueueTable = defineTable({
  userId: v.id('users'),
  quizId: v.id('quizzes'),
  reviewStage: v.number(), // 0: 1일, 1: 3일, 2: 7일, 3: 마스터 완료
  nextReviewAt: v.string(), // ISO date "2026-04-13"
  createdAt: v.string(),
})
  .index('by_userId', ['userId'])
  .index('by_user_and_quiz', ['userId', 'quizId'])
  .index('by_user_and_next', ['userId', 'nextReviewAt']);
