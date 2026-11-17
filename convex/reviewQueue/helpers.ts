import type {MutationCtx} from '../_generated/server';
import type {Id} from '../_generated/dataModel';

const REVIEW_INTERVALS = [1, 3, 7];

/**
 * 오답을 복습 대기열에 추가하는 공유 헬퍼
 * saveQuizResult와 completeDailyChallenge 양쪽에서 사용
 */
export async function enqueueForReview(
  ctx: MutationCtx,
  userId: Id<'users'>,
  quizId: Id<'quizzes'>,
): Promise<void> {
  const existing = await ctx.db
    .query('reviewQueue')
    .withIndex('by_user_and_quiz', (q) =>
      q.eq('userId', userId).eq('quizId', quizId),
    )
    .first();

  if (existing) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + REVIEW_INTERVALS[0]);

  await ctx.db.insert('reviewQueue', {
    userId,
    quizId,
    reviewStage: 0,
    nextReviewAt: tomorrow.toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  });
}
