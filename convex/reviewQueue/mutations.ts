import {v} from 'convex/values';
import {mutation} from '../_generated/server';
import {getAuthUserId} from '../utils/auth';

// 간격반복 스케줄 (일 단위)
const REVIEW_INTERVALS = [1, 3, 7];

/**
 * 오답을 복습 대기열에 추가
 * saveQuizResult에서 오답일 때 호출
 */
export const addToQueue = mutation({
  args: {
    quizId: v.id('quizzes'),
  },
  handler: async (ctx, {quizId}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    // 이미 대기열에 있으면 스킵
    const existing = await ctx.db
      .query('reviewQueue')
      .withIndex('by_user_and_quiz', (q) =>
        q.eq('userId', userId).eq('quizId', quizId),
      )
      .first();

    if (existing) return existing._id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + REVIEW_INTERVALS[0]);

    return await ctx.db.insert('reviewQueue', {
      userId,
      quizId,
      reviewStage: 0,
      nextReviewAt: tomorrow.toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
  },
});

/**
 * 복습 결과 처리
 * 정답: 다음 스테이지로 이동
 * 오답: 스테이지 0으로 리셋
 */
export const submitReview = mutation({
  args: {
    reviewId: v.id('reviewQueue'),
    isCorrect: v.boolean(),
  },
  handler: async (ctx, {reviewId, isCorrect}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const review = await ctx.db.get(reviewId);
    if (!review || review.userId !== userId) return;

    if (isCorrect) {
      const nextStage = review.reviewStage + 1;

      if (nextStage >= REVIEW_INTERVALS.length) {
        // 마스터 완료 — 대기열에서 제거
        await ctx.db.delete(reviewId);
        return {mastered: true};
      }

      // 다음 스테이지
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + REVIEW_INTERVALS[nextStage]);

      await ctx.db.patch(reviewId, {
        reviewStage: nextStage,
        nextReviewAt: nextDate.toISOString().split('T')[0],
      });

      return {mastered: false, nextStage};
    } else {
      // 오답 → 리셋
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + REVIEW_INTERVALS[0]);

      await ctx.db.patch(reviewId, {
        reviewStage: 0,
        nextReviewAt: tomorrow.toISOString().split('T')[0],
      });

      return {mastered: false, nextStage: 0};
    }
  },
});
