import {ConvexError, v} from 'convex/values';
import {
  displayedOptions,
  isCorrectOption,
  MAX_QUIZ_RESULTS_PER_DAY,
} from './grading';
import {mutation} from '../_generated/server';
import {getAuthUserId} from '../utils/auth';
import {enqueueForReview} from '../reviewQueue/helpers';
import {awardFeather} from '../feather/helpers';

export const saveQuizResult = mutation({
  args: {
    quizId: v.id('quizzes'), // Doc ID 타입으로 수정
    isCorrect: v.boolean(),
    selectedOptionIndex: v.number(),
    timeSpentMs: v.optional(v.number()),
    isDaily: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {quizId, selectedOptionIndex, timeSpentMs, isDaily} = args;
    const userId = await getAuthUserId(ctx);

    if (!userId) return;

    const quiz = await ctx.db.get(quizId);
    if (!quiz) throw new Error('Quiz not found');

    // Grade on the server. A client "wrong" (e.g. a timeout) stays wrong.
    const isCorrect =
      args.isCorrect &&
      isCorrectOption(
        displayedOptions(quiz._id, quiz.options),
        selectedOptionIndex,
      );

    const recentToday = await ctx.db
      .query('quizResults')
      .withIndex('by_user_and_date', (q) =>
        q
          .eq('userId', userId)
          .gte('createdAt', new Date().toISOString().slice(0, 10)),
      )
      .take(MAX_QUIZ_RESULTS_PER_DAY);
    if (recentToday.length >= MAX_QUIZ_RESULTS_PER_DAY) {
      throw new ConvexError('Daily quiz limit reached. Come back tomorrow!');
    }

    const category = await ctx.db.get(quiz.categoryId);
    if (!category) throw new Error('Category not found');

    // Save quiz result
    const resultId = await ctx.db.insert('quizResults', {
      userId,
      quizId: quiz._id,
      categoryName: category.name,
      isCorrect,
      selectedOptionIndex,
      timeSpentMs: Math.max(0, Math.min(timeSpentMs || 0, 600_000)),
      level: quiz.level,
      createdAt: new Date().toISOString(),
      ...(isDaily ? {isDaily: true} : {}),
    });

    // 오답이면 복습 대기열에 추가
    if (!isCorrect) {
      await enqueueForReview(ctx, userId, quiz._id);
    }

    // Update rankCategories
    const existingRankCategory = await ctx.db
      .query('rankCategories')
      .withIndex('by_user_and_category', (q) =>
        q.eq('userId', userId).eq('categoryId', category._id),
      )
      .first();

    if (existingRankCategory) {
      await ctx.db.patch(existingRankCategory._id, {
        totalAttempts: existingRankCategory.totalAttempts + 1,
        correctAnswers:
          existingRankCategory.correctAnswers + (isCorrect ? 1 : 0),
        highestLevel: Math.max(existingRankCategory.highestLevel, quiz.level),
        lastAttemptAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert('rankCategories', {
        userId,
        categoryId: category._id,
        totalAttempts: 1,
        correctAnswers: isCorrect ? 1 : 0,
        highestLevel: quiz.level,
        lastAttemptAt: new Date().toISOString(),
      });
    }

    // Get user profile
    const user = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (!user) {
      return resultId;
    }

    // ranks 테이블 증분 업데이트 (전체 collect 대신)
    const existingRank = await ctx.db
      .query('ranks')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    const newCorrectCount =
      (existingRank?.correctCount ?? 0) + (isCorrect ? 1 : 0);
    const newTotalAttempts = (existingRank?.totalAttempts ?? 0) + 1;
    const accuracy = (newCorrectCount / newTotalAttempts) * 100;

    if (existingRank) {
      await ctx.db.patch(existingRank._id, {
        correctCount: newCorrectCount,
        totalAttempts: newTotalAttempts,
        accuracy,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert('ranks', {
        correctCount: newCorrectCount,
        totalAttempts: newTotalAttempts,
        accuracy,
        lastUpdated: Date.now(),
        userId,
      });
    }

    // Feather 지급 (유저 출제 퀴즈 정답 시)
    if (isCorrect) {
      await awardFeather(ctx, quiz._id, userId);
    }

    // 리그 XP 업데이트 (일반 퀴즈: 정답당 5 XP)
    if (isCorrect) {
      const league = await ctx.db
        .query('leagues')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .first();

      if (league) {
        const now = new Date();
        const day = now.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() + diff);
        const weekStart = monday.toISOString().split('T')[0];

        if (league.weekStart !== weekStart) {
          await ctx.db.patch(league._id, {weeklyXp: 5, weekStart});
        } else {
          await ctx.db.patch(league._id, {
            weeklyXp: league.weeklyXp + 5,
          });
        }
      }
    }

    return resultId;
  },
});
