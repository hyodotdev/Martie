import {getAuthUserId} from '@convex-dev/auth/server';
import {query} from '../_generated/server';
import {v} from 'convex/values';
import {getQuizLanguageMap} from '../quizLanguage/helpers';

const REVIEW_SESSION_LIMIT = 20;

/**
 * 오늘 복습해야 할 문제 목록
 */
export const getPendingReviews = query({
  args: {
    language: v.optional(
      v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
    ),
  },
  handler: async (ctx, {language = 'en'}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const today = new Date().toISOString().split('T')[0];

    // nextReviewAt <= 오늘 인 항목
    const reviews = await ctx.db
      .query('reviewQueue')
      .withIndex('by_user_and_next', (q) =>
        q.eq('userId', userId).lte('nextReviewAt', today),
      )
      .take(REVIEW_SESSION_LIMIT);

    if (reviews.length === 0) return [];

    // 퀴즈 데이터 + 언어 데이터 가져오기
    const enriched = await Promise.all(
      reviews.map(async (review) => {
        const quiz = await ctx.db.get(review.quizId);
        if (!quiz) return null;

        // 퀴즈 텍스트
        const quizKeys = [
          quiz.key,
          quiz.answerKey,
          ...quiz.options.map((o) => o.key),
        ];

        const langMap = await getQuizLanguageMap(ctx, quizKeys, language);

        const shuffledOptions = [...quiz.options].sort(
          () => Math.random() - 0.5,
        );

        return {
          reviewId: review._id,
          reviewStage: review.reviewStage,
          quiz: {
            ...quiz,
            description: langMap.get(quiz.key) || quiz.key || '',
            answerDescription: langMap.get(quiz.answerKey) || '',
            options: shuffledOptions.map((opt) => ({
              ...opt,
              description: langMap.get(opt.key) || opt.key || '',
            })),
          },
        };
      }),
    );

    return enriched.filter(Boolean);
  },
});

/**
 * 복습 대기 개수 (발견 탭 배지용)
 */
export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const today = new Date().toISOString().split('T')[0];

    const reviews = await ctx.db
      .query('reviewQueue')
      .withIndex('by_user_and_next', (q) =>
        q.eq('userId', userId).lte('nextReviewAt', today),
      )
      .collect();

    return reviews.length;
  },
});
