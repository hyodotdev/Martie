import {paginationOptsValidator} from 'convex/server';
import {v} from 'convex/values';
import {query} from '../_generated/server';
import {getAuthUserId} from '../utils/auth';
import {assertAdmin} from './helpers';
import {isAdminEmail} from '../utils/emailList';

const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected'] as const;

const submissionStatusValidator = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected'),
);

/**
 * 현재 유저가 관리자인지 여부 (관리자 메뉴 노출용, 권한 검사는 assertAdmin)
 */
export const amIAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return isAdminEmail(user?.email);
  },
});

/**
 * 내 퀴즈 제출 목록
 */
export const getMySubmissions = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const submissions = await ctx.db
      .query('quizSubmissions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    return submissions.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  },
});

/**
 * 내 퀴즈 제출 목록 (페이지네이션)
 */
export const getMySubmissionsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, {paginationOpts}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        page: [],
        isDone: true,
        continueCursor: null as string | null,
      };
    }

    const paginated = await ctx.db
      .query('quizSubmissions')
      .withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId))
      .order('desc')
      .paginate(paginationOpts);

    const page = await Promise.all(
      paginated.page.map(async (sub) => {
        const results = sub.quizId
          ? await ctx.db
              .query('quizResults')
              .withIndex('by_quiz', (q) => q.eq('quizId', sub.quizId!))
              .filter((q) => q.neq(q.field('userId'), userId))
              .collect()
          : [];

        return {
          ...sub,
          solveCount: results.length,
          feathersEarned: results.filter((r) => r.isCorrect).length,
        };
      }),
    );

    return {
      ...paginated,
      page,
    };
  },
});

/**
 * 내가 출제한 승인된 퀴즈들의 통계 (풀이수, Feather)
 */
export const getMyCreatedQuizStats = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const myQuizzes = await ctx.db
      .query('quizzes')
      .withIndex('by_creator', (q) => q.eq('creatorUserId', userId))
      .collect();

    if (myQuizzes.length === 0) return [];

    const stats = await Promise.all(
      myQuizzes.map(async (quiz) => {
        // 이 퀴즈에 대한 모든 결과 (다른 유저)
        const allResults = await ctx.db
          .query('quizResults')
          .withIndex('by_quiz', (q) => q.eq('quizId', quiz._id))
          .filter((q) => q.neq(q.field('userId'), userId))
          .collect();

        const solveCount = allResults.length;
        const correctCount = allResults.filter((r) => r.isCorrect).length;

        // 퀴즈 질문 텍스트 가져오기
        const langData = await ctx.db
          .query('quizLanguages')
          .withIndex('by_key', (q) => q.eq('key', quiz.key))
          .first();

        return {
          quizId: quiz._id,
          quizKey: quiz.key,
          questionText: langData?.value || quiz.key,
          solveCount,
          feathersEarned: correctCount, // 정답 1개당 1 Feather
          categoryId: quiz.categoryId,
        };
      }),
    );

    return stats;
  },
});

/**
 * 관리자용: 대기 중인 제출 목록
 */
export const getPendingSubmissions = query({
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const submissions = await ctx.db
      .query('quizSubmissions')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect();

    // 제출자 정보 enrichment
    const enriched = await Promise.all(
      submissions.map(async (sub) => {
        const profile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', sub.userId))
          .first();

        const category = await ctx.db.get(sub.categoryId);

        return {
          ...sub,
          submitterName: profile?.displayName || 'Unknown',
          categoryName: category?.name || '',
        };
      }),
    );

    return enriched.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  },
});

/**
 * 관리자용: 모든 제출 목록 + 승인된 퀴즈 풀이 통계
 */
export const getAdminSubmissions = query({
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const submissions = await ctx.db.query('quizSubmissions').collect();

    const enriched = await Promise.all(
      submissions.map(async (sub) => {
        const [user, profile, category] = await Promise.all([
          ctx.db.get(sub.userId),
          ctx.db
            .query('userProfiles')
            .withIndex('by_user', (q) => q.eq('userId', sub.userId))
            .first(),
          ctx.db.get(sub.categoryId),
        ]);

        const results = sub.quizId
          ? await ctx.db
              .query('quizResults')
              .withIndex('by_quiz', (q) => q.eq('quizId', sub.quizId!))
              .collect()
          : [];

        return {
          ...sub,
          submitterEmail: user?.email || profile?.email || '',
          submitterName: profile?.displayName || user?.name || 'Unknown',
          categoryName: category?.name || '',
          solveCount: results.length,
          solvedUserCount: new Set(results.map((r) => r.userId)).size,
          correctCount: results.filter((r) => r.isCorrect).length,
        };
      }),
    );

    const statusOrder = {
      pending: 0,
      approved: 1,
      rejected: 2,
    } as const;

    return enriched.sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return b.createdAt > a.createdAt ? 1 : -1;
    });
  },
});

/**
 * 관리자용: 제출 목록 통계
 */
export const getAdminSubmissionStats = query({
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const counts = await Promise.all(
      SUBMISSION_STATUSES.map(async (status) => {
        const items = await ctx.db
          .query('quizSubmissions')
          .withIndex('by_status', (q) => q.eq('status', status))
          .collect();
        return [status, items.length] as const;
      }),
    );

    const stats = Object.fromEntries(counts) as Record<
      (typeof SUBMISSION_STATUSES)[number],
      number
    >;

    return {
      ...stats,
      total: SUBMISSION_STATUSES.reduce(
        (sum, status) => sum + stats[status],
        0,
      ),
    };
  },
});

/**
 * 관리자용: 제출 목록 페이지네이션 + 승인된 퀴즈 풀이 통계
 */
export const getAdminSubmissionsPaginated = query({
  args: {
    status: v.optional(submissionStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, {status, paginationOpts}) => {
    await assertAdmin(ctx);

    const baseQuery = status
      ? ctx.db
          .query('quizSubmissions')
          .withIndex('by_status_and_createdAt', (q) => q.eq('status', status))
      : ctx.db.query('quizSubmissions').withIndex('by_createdAt');

    const paginated = await baseQuery.order('desc').paginate(paginationOpts);

    const page = await Promise.all(
      paginated.page.map(async (sub) => {
        const [user, profile, category] = await Promise.all([
          ctx.db.get(sub.userId),
          ctx.db
            .query('userProfiles')
            .withIndex('by_user', (q) => q.eq('userId', sub.userId))
            .first(),
          ctx.db.get(sub.categoryId),
        ]);

        const results = sub.quizId
          ? await ctx.db
              .query('quizResults')
              .withIndex('by_quiz', (q) => q.eq('quizId', sub.quizId!))
              .collect()
          : [];

        return {
          ...sub,
          submitterEmail: user?.email || profile?.email || '',
          submitterName: profile?.displayName || user?.name || 'Unknown',
          categoryName: category?.name || '',
          solveCount: results.length,
          solvedUserCount: new Set(results.map((r) => r.userId)).size,
          correctCount: results.filter((r) => r.isCorrect).length,
        };
      }),
    );

    return {
      ...paginated,
      page,
    };
  },
});

/**
 * 관리자용: 제출 상세 + 승인된 퀴즈 풀이 통계
 */
export const getAdminSubmissionDetail = query({
  args: {
    submissionId: v.id('quizSubmissions'),
  },
  handler: async (ctx, {submissionId}) => {
    await assertAdmin(ctx);

    const submission = await ctx.db.get(submissionId);
    if (!submission) return null;

    const [user, profile, category, reviewer] = await Promise.all([
      ctx.db.get(submission.userId),
      ctx.db
        .query('userProfiles')
        .withIndex('by_user', (q) => q.eq('userId', submission.userId))
        .first(),
      ctx.db.get(submission.categoryId),
      submission.reviewedBy ? ctx.db.get(submission.reviewedBy) : null,
    ]);

    const results = submission.quizId
      ? await ctx.db
          .query('quizResults')
          .withIndex('by_quiz', (q) => q.eq('quizId', submission.quizId!))
          .collect()
      : [];

    return {
      ...submission,
      submitterEmail: user?.email || profile?.email || '',
      submitterName: profile?.displayName || user?.name || 'Unknown',
      categoryName: category?.name || '',
      reviewerEmail: reviewer?.email || '',
      solveCount: results.length,
      solvedUserCount: new Set(results.map((r) => r.userId)).size,
      correctCount: results.filter((r) => r.isCorrect).length,
    };
  },
});
