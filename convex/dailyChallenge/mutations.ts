import {ConvexError, v} from 'convex/values';
import {internalMutation, mutation} from '../_generated/server';
import {getAuthUserId} from '../utils/auth';
import {enqueueForReview} from '../reviewQueue/helpers';
import {awardFeather} from '../feather/helpers';
import {
  streakDayEnd,
  streakDayStart,
  streakToday,
  streakYesterday,
} from '../utils/streakDate';
import {isCorrectOption} from '../quizResult/grading';

/**
 * 스트릭 복구용 무료 프리즈 1개 부여 (PMF sprint #70).
 *
 * 30일 쿨다운으로 보호 — 자세한 조건은 queries.getStreakRecoveryState 참고.
 * 부여 후 사용자가 오늘 데일리 퀴즈를 풀면 completeDailyChallenge의 기존
 * 프리즈 소모 로직(line 228 부근)이 자동으로 처리한다.
 */
export const grantRecoveryFreeze = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Capture `now` once at the top of the handler so every derived value
    // (today/yesterday/cooldown diff) reads from a single point in time.
    // Convex pins Date.now() per execution, but multiple reads still risk
    // crossing a midnight boundary mid-handler.
    const nowMs = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
    if (!profile) throw new Error('Profile not found');

    const currentStreak = profile.currentStreak ?? 0;
    const lastStreakDate = profile.lastStreakDate;
    const streakFreezeCount = profile.streakFreezeCount ?? 0;
    const lastRecoveryAt = profile.lastStreakRecoveryAt;

    if (currentStreak < 1)
      return {success: false, reason: 'no_streak'} as const;
    if (!lastStreakDate) return {success: false, reason: 'no_history'} as const;
    if (streakFreezeCount > 0)
      return {success: false, reason: 'already_has_freeze'} as const;

    const today = new Date(nowMs).toISOString().split('T')[0];
    const yesterday = new Date(nowMs - DAY_MS).toISOString().split('T')[0];
    if (lastStreakDate === today || lastStreakDate === yesterday)
      return {success: false, reason: 'not_at_risk'} as const;

    if (lastRecoveryAt) {
      const diffDays = Math.floor(
        (nowMs - new Date(lastRecoveryAt).getTime()) / DAY_MS,
      );
      if (diffDays < 30) return {success: false, reason: 'cooldown'} as const;
    }

    await ctx.db.patch(profile._id, {
      streakFreezeCount: streakFreezeCount + 1,
      lastStreakRecoveryAt: today,
    });

    return {success: true, currentStreak} as const;
  },
});

/**
 * 오늘의 퀴즈 생성 (Cron에서 호출)
 * 카테고리를 날짜 기준 로테이션하여 5문제 선정
 */
export const generateDaily = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = streakToday();

    // 이미 오늘 데이터가 있으면 스킵 (멱등성)
    const existing = await ctx.db
      .query('dailyChallenges')
      .withIndex('by_date', (q) => q.eq('date', today))
      .first();

    if (existing) return existing._id;

    // 카테고리 로테이션: 날짜 기반
    const categories = await ctx.db.query('categories').collect();
    if (categories.length === 0) throw new Error('No categories found');

    const daysSinceEpoch = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const categoryIndex = daysSinceEpoch % categories.length;
    const category = categories[categoryIndex];

    // 해당 카테고리에서 퀴즈 가져오기
    const quizzes = await ctx.db
      .query('quizzes')
      .withIndex('by_category', (q) => q.eq('categoryId', category._id))
      .collect();

    if (quizzes.length === 0) {
      throw new Error(`No quizzes found for category: ${category.name}`);
    }

    // 랜덤 5문제 선정 (Fisher-Yates shuffle)
    const shuffled = [...quizzes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedQuizzes = shuffled.slice(0, 5);
    const quizIds = selectedQuizzes.map((q) => q._id);

    const id = await ctx.db.insert('dailyChallenges', {
      date: today,
      quizIds,
      categoryId: category._id,
    });

    return id;
  },
});

/**
 * 오늘의 퀴즈 완료 처리
 * 스트릭 업데이트 + XP 부여
 */
export const completeDailyChallenge = mutation({
  args: {
    results: v.array(
      v.object({
        quizId: v.id('quizzes'),
        isCorrect: v.boolean(),
        selectedOptionIndex: v.number(),
        timeSpentMs: v.number(),
      }),
    ),
  },
  handler: async (ctx, {results: submittedResults}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const today = streakToday();

    // 오늘의 챌린지 확인
    const dailyChallenge = await ctx.db
      .query('dailyChallenges')
      .withIndex('by_date', (q) => q.eq('date', today))
      .first();

    if (!dailyChallenge) throw new Error('No daily challenge found for today');

    // 이미 오늘 데일리 퀴즈를 풀었는지 확인
    const existingDailyResults = await ctx.db
      .query('quizResults')
      .withIndex('by_user_and_date', (q) =>
        q
          .eq('userId', userId)
          .gte('createdAt', streakDayStart(today))
          .lt('createdAt', streakDayEnd(today)),
      )
      .filter((q) => q.eq(q.field('isDaily'), true))
      .collect();

    if (existingDailyResults.length > 0) {
      return {
        correctCount: existingDailyResults.filter((r) => r.isCorrect).length,
        totalQuestions: existingDailyResults.length,
        totalTimeSpentMs: existingDailyResults.reduce(
          (sum, r) => sum + r.timeSpentMs,
          0,
        ),
        xpEarned: 0,
        alreadyCompleted: true as const,
      };
    }

    // Only today's questions, each once.
    const allowed = new Set(dailyChallenge.quizIds);
    const seen = new Set<string>();
    if (
      submittedResults.length === 0 ||
      submittedResults.length > dailyChallenge.quizIds.length ||
      submittedResults.some((r) => {
        const duplicate = seen.has(r.quizId);
        seen.add(r.quizId);
        return duplicate || !allowed.has(r.quizId);
      })
    ) {
      throw new ConvexError("Results do not match today's quiz");
    }

    // Grade on the server. A client "wrong" (e.g. a timeout) stays wrong.
    const gradedResults = [];
    for (const submitted of submittedResults) {
      const quiz = await ctx.db.get(submitted.quizId);
      gradedResults.push({
        ...submitted,
        isCorrect:
          !!quiz &&
          submitted.isCorrect &&
          isCorrectOption(quiz.options, submitted.selectedOptionIndex),
        timeSpentMs: Math.max(0, Math.min(submitted.timeSpentMs, 600_000)),
      });
    }
    const results = gradedResults;

    let correctCount = 0;
    const totalTimeSpentMs = results.reduce((sum, r) => sum + r.timeSpentMs, 0);

    // 각 문제 결과 저장
    for (const result of results) {
      const quiz = await ctx.db.get(result.quizId);
      if (!quiz) continue;

      const category = await ctx.db.get(quiz.categoryId);
      if (!category) continue;

      if (result.isCorrect) {
        correctCount++;
        await awardFeather(ctx, result.quizId, userId);
      }

      await ctx.db.insert('quizResults', {
        userId,
        quizId: result.quizId,
        categoryName: category.name,
        isCorrect: result.isCorrect,
        selectedOptionIndex: result.selectedOptionIndex,
        timeSpentMs: result.timeSpentMs,
        level: quiz.level,
        createdAt: new Date().toISOString(),
        isDaily: true,
      });

      // rankCategories 업데이트
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
            existingRankCategory.correctAnswers + (result.isCorrect ? 1 : 0),
          highestLevel: Math.max(existingRankCategory.highestLevel, quiz.level),
          lastAttemptAt: new Date().toISOString(),
        });
      } else {
        await ctx.db.insert('rankCategories', {
          userId,
          categoryId: category._id,
          totalAttempts: 1,
          correctAnswers: result.isCorrect ? 1 : 0,
          highestLevel: quiz.level,
          lastAttemptAt: new Date().toISOString(),
        });
      }
    }

    // 오답을 복습 대기열에 추가
    for (const result of results) {
      if (!result.isCorrect) {
        await enqueueForReview(ctx, userId, result.quizId);
      }
    }

    // ranks 테이블 업데이트 (인덱스 사용)
    const existingRank = await ctx.db
      .query('ranks')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    // 기존 rank에서 증분 업데이트 (전체 collect 대신)
    const totalCorrect = (existingRank?.correctCount ?? 0) + correctCount;
    const totalAttempts = (existingRank?.totalAttempts ?? 0) + results.length;
    const accuracy =
      totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    if (existingRank) {
      await ctx.db.patch(existingRank._id, {
        correctCount: totalCorrect,
        totalAttempts,
        accuracy,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert('ranks', {
        userId,
        correctCount: totalCorrect,
        totalAttempts,
        accuracy,
        lastUpdated: Date.now(),
      });
    }

    // 스트릭 업데이트
    const userProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    let streakOutcome:
      'continued' | 'first' | 'broken' | 'freeze_used' | 'same_day' | undefined;

    if (userProfile) {
      const yesterday = streakYesterday();

      const lastStreakDate = userProfile.lastStreakDate;
      const currentStreak = userProfile.currentStreak ?? 0;
      const longestStreak = userProfile.longestStreak ?? 0;
      const streakFreezeCount = userProfile.streakFreezeCount ?? 0;

      let newStreak: number;

      if (lastStreakDate === today) {
        // 이미 오늘 완료 → 변동 없음
        newStreak = currentStreak;
        streakOutcome = 'same_day';
      } else if (lastStreakDate === yesterday) {
        // 어제 했으면 → +1
        newStreak = currentStreak + 1;
        streakOutcome = 'continued';
      } else if (lastStreakDate && lastStreakDate < yesterday) {
        // 어제 안 했으면
        if (streakFreezeCount > 0) {
          // 프리즈 소모하고 스트릭 유지
          newStreak = currentStreak + 1;
          streakOutcome = 'freeze_used';
          await ctx.db.patch(userProfile._id, {
            streakFreezeCount: streakFreezeCount - 1,
          });
        } else {
          // 리셋
          newStreak = 1;
          streakOutcome = 'broken';
        }
      } else {
        // 첫 스트릭
        newStreak = 1;
        streakOutcome = 'first';
      }

      await ctx.db.patch(userProfile._id, {
        currentStreak: newStreak,
        longestStreak: Math.max(longestStreak, newStreak),
        lastStreakDate: today,
      });
    }

    // 리그 XP 업데이트 (weekStart 검증)
    const xpEarned = correctCount * 10 + (correctCount === 5 ? 20 : 0);

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
      const currentWeekStart = monday.toISOString().split('T')[0];

      if (league.weekStart !== currentWeekStart) {
        await ctx.db.patch(league._id, {
          weeklyXp: xpEarned,
          weekStart: currentWeekStart,
        });
      } else {
        await ctx.db.patch(league._id, {
          weeklyXp: league.weeklyXp + xpEarned,
        });
      }
    }

    return {
      correctCount,
      totalQuestions: results.length,
      totalTimeSpentMs,
      xpEarned,
      streakOutcome,
    };
  },
});
