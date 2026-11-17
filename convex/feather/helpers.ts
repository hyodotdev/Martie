import type {MutationCtx} from '../_generated/server';
import type {Id} from '../_generated/dataModel';

/**
 * 퀴즈 출제자에게 Feather를 지급하는 헬퍼
 * - 유저 출제 퀴즈가 아니면 skip
 * - 출제자 본인이 풀면 skip (self-award 방지)
 */
export async function awardFeather(
  ctx: MutationCtx,
  quizId: Id<'quizzes'>,
  solverId: Id<'users'>,
): Promise<void> {
  const quiz = await ctx.db.get(quizId);
  if (!quiz?.creatorUserId) return;
  if (quiz.creatorUserId === solverId) return;

  // 중복 지급 방지: 이미 이 퀴즈를 맞춘 적 있으면 skip
  const priorCorrect = await ctx.db
    .query('quizResults')
    .withIndex('by_user_and_quiz', (q) =>
      q.eq('userId', solverId).eq('quizId', quizId),
    )
    .filter((q) => q.eq(q.field('isCorrect'), true))
    .first();

  // awardFeather는 quizResult 삽입 후 호출되므로, 기존 정답이 1개 이상이면 중복
  if (priorCorrect) {
    const secondCorrect = await ctx.db
      .query('quizResults')
      .withIndex('by_user_and_quiz', (q) =>
        q.eq('userId', solverId).eq('quizId', quizId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('isCorrect'), true),
          q.neq(q.field('_id'), priorCorrect._id),
        ),
      )
      .first();

    if (secondCorrect) return;
  }

  const creatorProfile = await ctx.db
    .query('userProfiles')
    .withIndex('by_user', (q) => q.eq('userId', quiz.creatorUserId!))
    .first();

  if (!creatorProfile) return;

  await ctx.db.patch(creatorProfile._id, {
    featherCount: (creatorProfile.featherCount ?? 0) + 1,
  });
}
