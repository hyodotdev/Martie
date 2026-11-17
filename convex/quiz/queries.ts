import {getAuthUserId} from '@convex-dev/auth/server';
import {internalQuery, query} from '../_generated/server';
import {v} from 'convex/values';
import {paginationOptsValidator} from 'convex/server';
import type {Id} from '../_generated/dataModel';
import {getQuizLanguageMap} from '../quizLanguage/helpers';

// src/constants.ts에 있는 QUIZ_LIMIT와 동일한 값 이어야 함
const CLIENT_QUIZ_LIMIT = 10;

export const listByCategory = internalQuery({
  args: {
    categoryId: v.id('categories'),
    level: v.number(),
  },
  handler: async (ctx, {categoryId, level}) => {
    return await ctx.db
      .query('quizzes')
      .withIndex('by_category_and_level', (q) =>
        q.eq('categoryId', categoryId).eq('level', level),
      )
      .collect();
  },
});

// 카테고리별 평균 정답률 계산 (변경 없음)
export const getCategoryStats = query({
  args: {
    categoryName: v.string(),
  },
  handler: async (ctx, {categoryName}) => {
    const results = await ctx.db
      .query('quizResults')
      .filter((q) => q.eq(q.field('categoryName'), categoryName))
      .collect();

    if (results.length === 0) {
      return {
        averageScore: 0,
        totalAttempts: 0,
        correctAnswers: 0,
      };
    }

    const correctAnswers = results.filter((r) => r.isCorrect).length;

    return {
      averageScore: (correctAnswers / results.length) * 100,
      totalAttempts: results.length,
      correctAnswers,
    };
  },
});

// 최근 N일간의 퀴즈 풀이 통계 (변경 없음)
export const getRecentActivityStats = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, {days}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString();

    const recentResults = await ctx.db
      .query('quizResults')
      .filter((q) =>
        q.and(
          q.eq(q.field('userId'), userId),
          q.gte(q.field('createdAt'), startDateStr),
        ),
      )
      .collect();

    const dailyStats = recentResults.reduce(
      (acc, result) => {
        const day = result.createdAt.split('T')[0];
        if (!acc[day]) {
          acc[day] = {total: 0, correct: 0};
        }
        acc[day].total++;
        if (result.isCorrect) acc[day].correct++;
        return acc;
      },
      {} as Record<string, {total: number; correct: number}>,
    );

    return {
      totalAttempts: recentResults.length,
      correctAnswers: recentResults.filter((r) => r.isCorrect).length,
      dailyStats,
    };
  },
});

export const getByKey = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, {key}) => {
    return await ctx.db
      .query('quizzes')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
  },
});

export const getQuizzesPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    language: v.optional(
      v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
    ),
    lastKey: v.optional(v.string()), // Add lastKey parameter to handle custom pagination
  },
  handler: async (ctx, {paginationOpts, language = 'en', lastKey}) => {
    try {
      // 기본 쿼리 설정
      let query = ctx.db.query('quizzes').withIndex('by_key').order('asc');

      // 사용자 인증 및 카테고리 필터링
      const userId = await getAuthUserId(ctx).catch(() => null);
      let categoryIds: Id<'categories'>[] | null = null;

      // Determine which pagination key to use (lastQuizCursor from profile or provided lastKey)
      let paginationKey = lastKey;

      if (userId) {
        // Get user profile to check for lastQuizCursor
        const userProfile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .first();

        if (userProfile?.lastQuizCursor) {
          // Use the cursor from the user profile instead of the provided lastKey
          paginationKey = userProfile.lastQuizCursor;
          console.log(
            `Using lastQuizCursor from user(${userId}):`,
            paginationKey,
          );
        }

        const userCategories = await ctx.db
          .query('userCategories')
          .filter((q) => q.eq(q.field('userId'), userId))
          .collect();

        if (userCategories.length > 0) {
          categoryIds = userCategories.map((uc) => uc.categoryId);
          query = query.filter((q) =>
            q.or(...categoryIds!.map((id) => q.eq(q.field('categoryId'), id))),
          );
        }
      }

      // Apply the pagination key if available
      if (paginationKey !== undefined) {
        console.log('Using pagination key:', paginationKey);
        query = query.filter((q) => q.gt(q.field('key'), paginationKey!));
      }

      // Convex의 paginate 메서드를 사용해 페이지네이션 처리
      let paginatedResult = await query.paginate({
        ...paginationOpts,
        numItems: paginationOpts.numItems
          ? paginationOpts.numItems
          : CLIENT_QUIZ_LIMIT,
      });

      if (
        paginationKey !== undefined &&
        paginatedResult.isDone &&
        paginatedResult.page.length === 0
      ) {
        let fallbackQuery = ctx.db.query('quizzes').withIndex('by_key').order('asc');

        if (categoryIds?.length) {
          fallbackQuery = fallbackQuery.filter((q) =>
            q.or(...categoryIds!.map((id) => q.eq(q.field('categoryId'), id))),
          );
        }

        paginatedResult = await fallbackQuery.paginate({
          ...paginationOpts,
          numItems: paginationOpts.numItems
            ? paginationOpts.numItems
            : CLIENT_QUIZ_LIMIT,
        });
      }

      // 언어 데이터 처리를 위한 퀴즈 키 수집
      const quizKeys = paginatedResult.page
        .flatMap((quiz) => [
          quiz.key,
          quiz.answerKey,
          ...quiz.options.map((opt) => opt.key),
        ])
        .filter(Boolean);

      const selectedLanguage = language as 'en' | 'ko' | 'ja';
      const langMap = await getQuizLanguageMap(
        ctx,
        quizKeys,
        selectedLanguage,
      );

      // 출제자 정보 일괄 조회
      const creatorUserIds = [
        ...new Set(
          paginatedResult.page
            .map((q) => q.creatorUserId)
            .filter((id): id is Id<'users'> => !!id),
        ),
      ];

      const creatorProfiles = await Promise.all(
        creatorUserIds.map((uid) =>
          ctx.db
            .query('userProfiles')
            .withIndex('by_user', (q) => q.eq('userId', uid))
            .first(),
        ),
      );

      const creatorMap = new Map<
        string,
        {name: string; avatarUrl: string | null}
      >();
      for (const profile of creatorProfiles) {
        if (profile) {
          let avatarUrl: string | null = null;
          if (profile.avatarUrlId) {
            try {
              avatarUrl = await ctx.storage.getUrl(profile.avatarUrlId);
            } catch {}
          }
          creatorMap.set(profile.userId, {
            name: profile.displayName,
            avatarUrl,
          });
        }
      }

      // 퀴즈 데이터 보강
      const enrichedItems = paginatedResult.page.map((quiz) => {
        const shuffledOptions = [...quiz.options].sort(
          () => Math.random() - 0.5,
        );
        const creator = quiz.creatorUserId
          ? creatorMap.get(quiz.creatorUserId)
          : undefined;
        return {
          ...quiz,
          description: langMap.get(quiz.key) || quiz.key || '',
          answerDescription: langMap.get(quiz.answerKey) || '',
          options: shuffledOptions.map((opt) => ({
            ...opt,
            description: langMap.get(opt.key) || opt.key || '',
          })),
          creatorName: creator?.name,
          creatorAvatarUrl: creator?.avatarUrl ?? undefined,
        };
      });

      // Store the last key for custom pagination if available
      const lastItem = paginatedResult.page[paginatedResult.page.length - 1];
      const lastItemKey = lastItem?.key;

      // 페이지네이션 결과 반환
      return {
        page: enrichedItems,
        continueCursor: paginatedResult.continueCursor, // 문자열로 보장됨
        isDone: paginatedResult.isDone,
        lastKey: lastItemKey, // Return the last key for manual pagination
      };
    } catch (error) {
      console.error('Error in getQuizzesPaginated:', error);
      return {
        page: [],
        continueCursor: null,
        isDone: true,
        lastKey: null,
      };
    }
  },
});

export const getByKeys = query({
  args: {
    keys: v.array(v.string()),
  },
  handler: async (ctx, {keys}) => {
    return await ctx.db
      .query('quizzes')
      .filter((q) =>
        q.and(q.or(...keys.map((key) => q.eq(q.field('key'), key)))),
      )
      .collect();
  },
});

// New function to fetch quizzes by type and category
export const getQuizzesByCategory = query({
  args: {
    categoryId: v.id('categories'),
  },
  handler: async (ctx, {categoryId}) => {
    return await ctx.db
      .query('quizzes')
      .withIndex('by_category', (q) => q.eq('categoryId', categoryId))
      .collect();
  },
});

// New function to fetch all quizzes by type
export const getQuizzes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('quizzes').collect();
  },
});

/**
 * 모든 퀴즈 키를 가져오는 쿼리
 */
export const getAllQuizKeys = query({
  args: {},
  handler: async (ctx) => {
    const quizzes = await ctx.db.query('quizzes').collect();
    return quizzes.map((quiz) => ({
      _id: quiz._id,
      key: quiz.key,
    }));
  },
});
