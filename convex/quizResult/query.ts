import {getAuthUserId} from '@convex-dev/auth/server';
import {query} from '../_generated/server';
import {v} from 'convex/values';
import {paginationOptsValidator} from 'convex/server';

export const getLastUserQuizResult = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    // 가장 최근 퀴즈 결과 하나만 가져옴
    return await ctx.db
      .query('quizResults')
      .filter((q) => q.eq(q.field('userId'), userId))
      .order('desc')
      .first();
  },
});

export const getPaginatedResults = query({
  args: {
    isCorrect: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
    language: v.optional(
      v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    const language = args.language || 'en';

    if (!userId) {
      return {
        page: [],
        isDone: true,
        continueCursor: null as string | null,
      };
    }

    // Get quiz results with pagination
    let resultQuery = ctx.db.query('quizResults');
    resultQuery = resultQuery.filter((q) => q.eq(q.field('userId'), userId));

    if (args.isCorrect !== undefined) {
      resultQuery = resultQuery.filter((q) =>
        q.eq(q.field('isCorrect'), args.isCorrect),
      );
    }

    const paginationResult = await resultQuery
      .order('desc')
      .paginate(args.paginationOpts);

    if (paginationResult.page.length === 0) {
      return {
        page: [],
        isDone: true,
        continueCursor: paginationResult.continueCursor,
      };
    }

    // Get all quiz IDs from the paginated items (only current page)
    const quizIds = [
      ...new Set(paginationResult.page.map((item) => item.quizId)),
    ];

    // Fetch quiz data for all quiz IDs in one batch
    const quizzes = await Promise.all(
      quizIds.map((quizId) => ctx.db.get(quizId)),
    );

    // Create lookup maps for quiz data
    const quizDataMap = new Map();
    const quizKeyMap = new Map();

    quizzes.forEach((quiz) => {
      if (quiz) {
        quizDataMap.set(quiz._id, quiz);
        quizKeyMap.set(quiz._id, quiz.key);
      }
    });

    // Get unique keys for language lookup
    const quizKeys = [...quizKeyMap.values()].filter(Boolean);

    // Only fetch quiz titles for the specific keys we need
    // Use multiple targeted queries instead of loading all language entries
    const quizTitlePromises = quizKeys.map((key) =>
      ctx.db
        .query('quizLanguages')
        .withIndex('by_key_and_language', (q) =>
          q.eq('key', key).eq('language', language),
        )
        .filter((q) => q.eq(q.field('type'), 'question'))
        .first(),
    );

    const quizTitleResults = await Promise.all(quizTitlePromises);

    // Map quiz keys to their titles
    const titleMap = new Map();
    quizTitleResults.forEach((entry) => {
      if (entry) {
        titleMap.set(entry.key, entry.value);
      }
    });

    // Calculate accuracy stats by querying each quiz's stats separately
    // This avoids loading all user's quiz results at once
    const accuracyPromises = quizIds.map(async (quizId) => {
      // For each quiz, get only the attempts for that quiz
      const quizAttempts = await ctx.db
        .query('quizResults')
        .withIndex('by_user_and_quiz', (q) =>
          q.eq('userId', userId).eq('quizId', quizId),
        )
        .collect();

      const totalAttempts = quizAttempts.length;
      const correctAttempts = quizAttempts.filter((a) => a.isCorrect).length;
      const accuracy =
        totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

      return {
        quizId,
        stats: {
          attempts: totalAttempts,
          correct: correctAttempts,
          accuracy: Math.round(accuracy * 10) / 10,
        },
      };
    });

    const accuracyResults = await Promise.all(accuracyPromises);

    // Create a map of quiz ID to accuracy stats
    const accuracyByQuiz = new Map();
    accuracyResults.forEach((result) => {
      accuracyByQuiz.set(result.quizId, result.stats);
    });

    // Enhance the items with quiz data, titles, and accuracy
    const enhancedItems = paginationResult.page.map((item) => {
      const quiz = quizDataMap.get(item.quizId);
      const quizKey = quiz ? quiz.key : null;
      const quizTitle = quizKey ? titleMap.get(quizKey) : null;

      return {
        ...item,
        quizLevel: quiz ? quiz.level : null,
        quizTitle: quizTitle || null,
        quizStats: accuracyByQuiz.get(item.quizId) || {
          attempts: 0,
          correct: 0,
          accuracy: 0,
        },
      };
    });

    return {
      page: enhancedItems,
      isDone: paginationResult.isDone,
      continueCursor: paginationResult.continueCursor,
    };
  },
});

// 통계 정보를 가져오는 쿼리도 추가
export const getResultsStats = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return;
    }

    const results = await ctx.db
      .query('quizResults')
      .filter((q) => q.eq(q.field('userId'), userId))
      .collect();

    return {
      totalQuizzes: results.length,
      correctAnswers: results.filter((r) => r.isCorrect).length,
      totalTimeSpent: results.reduce((acc, curr) => acc + curr.timeSpentMs, 0),
    };
  },
});

export const getResultsStatsByCategory = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return null;
    }

    // Get all results for the user
    const results = await ctx.db
      .query('quizResults')
      .filter((q) => q.eq(q.field('userId'), userId))
      .collect();

    if (results.length === 0) {
      return [];
    }

    // Get all quizzes that the user has attempted
    const quizIds = [...new Set(results.map((r) => r.quizId))];

    // Get quiz data for each quiz ID
    const quizzes = await Promise.all(quizIds.map((id) => ctx.db.get(id)));

    // Filter out any undefined quizzes (in case some were deleted)
    const validQuizzes = quizzes.filter((q) => q !== null);

    // Get category IDs
    const categoryIds = [
      ...new Set(validQuizzes.map((q) => q?.categoryId).filter(Boolean)),
    ];

    // Get category data for each category ID
    const categories = await Promise.all(
      categoryIds.map((id) => ctx.db.get(id!)),
    );

    // Create a map from quizId to categoryId
    const quizIdToCategoryId = new Map();
    validQuizzes.forEach((quiz) => {
      if (quiz) {
        quizIdToCategoryId.set(quiz._id, quiz.categoryId);
      }
    });

    // Group results by category
    const resultsByCategory = new Map();

    for (const result of results) {
      const categoryId = quizIdToCategoryId.get(result.quizId);
      if (!categoryId) continue;

      if (!resultsByCategory.has(categoryId)) {
        resultsByCategory.set(categoryId, {
          total: 0,
          correct: 0,
        });
      }

      const categoryStats = resultsByCategory.get(categoryId);
      categoryStats.total++;
      if (result.isCorrect) {
        categoryStats.correct++;
      }
    }

    // Format the final statistics
    return categories
      .map((category) => {
        if (!category) return null;

        const stats = resultsByCategory.get(category._id) || {
          total: 0,
          correct: 0,
        };
        const winRate =
          stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

        return {
          categoryId: category._id,
          categoryName: category.name,
          totalAttempts: stats.total,
          correctAttempts: stats.correct,
          winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal place
        };
      })
      .filter(Boolean);
  },
});
