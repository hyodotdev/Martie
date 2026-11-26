import {getAuthUserId} from '../utils/auth';
import {query} from '../_generated/server';
import {v} from 'convex/values';
import type {Id} from '../_generated/dataModel';
import {getQuizLanguageMap} from '../quizLanguage/helpers';
import {
  streakDayEnd,
  streakDayStart,
  streakToday,
  streakYesterday,
} from '../utils/streakDate';

/**
 * 오늘의 퀴즈 조회
 */
export const getToday = query({
  args: {
    language: v.optional(
      v.union(v.literal('en'), v.literal('ko'), v.literal('ja')),
    ),
  },
  handler: async (ctx, {language = 'en'}) => {
    const today = streakToday();

    const dailyChallenge = await ctx.db
      .query('dailyChallenges')
      .withIndex('by_date', (q) => q.eq('date', today))
      .first();

    if (!dailyChallenge) return null;

    // 카테고리 정보
    const category = await ctx.db.get(dailyChallenge.categoryId);

    // 퀴즈 데이터 가져오기
    const quizzes = await Promise.all(
      dailyChallenge.quizIds.map((id) => ctx.db.get(id)),
    );

    const validQuizzes = quizzes.filter(Boolean);

    // 언어 데이터
    const quizKeys = validQuizzes.flatMap((quiz) => [
      quiz!.key,
      quiz!.answerKey,
      ...quiz!.options.map((opt) => opt.key),
    ]);

    const selectedLanguage = language as 'en' | 'ko' | 'ja';
    const langMap = await getQuizLanguageMap(
      ctx,
      quizKeys,
      selectedLanguage,
    );

    // 출제자 정보 일괄 조회
    const creatorUserIds = [
      ...new Set(
        validQuizzes
          .map((q) => q!.creatorUserId)
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

    const enrichedQuizzes = validQuizzes.map((quiz) => {
      const shuffledOptions = [...quiz!.options].sort(
        () => Math.random() - 0.5,
      );
      const creator = quiz!.creatorUserId
        ? creatorMap.get(quiz!.creatorUserId)
        : undefined;
      return {
        ...quiz!,
        description: langMap.get(quiz!.key) || quiz!.key || '',
        answerDescription: langMap.get(quiz!.answerKey) || '',
        options: shuffledOptions.map((opt) => ({
          ...opt,
          description: langMap.get(opt.key) || opt.key || '',
        })),
        creatorName: creator?.name,
        creatorAvatarUrl: creator?.avatarUrl ?? undefined,
      };
    });

    // 유저의 오늘 데일리 완료 여부 확인
    let isCompleted = false;
    let userResults: {quizId: string; isCorrect: boolean}[] = [];

    const userId = await getAuthUserId(ctx).catch(() => null);
    if (userId) {
      const todayResults = await ctx.db
        .query('quizResults')
        .withIndex('by_user_and_date', (q) =>
          q
            .eq('userId', userId)
            .gte('createdAt', streakDayStart(today))
            .lt('createdAt', streakDayEnd(today)),
        )
        .filter((q) => q.eq(q.field('isDaily'), true))
        .collect();

      if (todayResults.length > 0) {
        isCompleted = true;
        userResults = todayResults.map((r) => ({
          quizId: r.quizId as string,
          isCorrect: r.isCorrect,
        }));
      }
    }

    // 퀴즈 번호 (앱 출시 후 경과일)
    // 2026-04-12를 Day 1으로 계산
    const launchDate = new Date('2026-04-12');
    const todayDate = new Date(today);
    const challengeNumber =
      Math.floor(
        (todayDate.getTime() - launchDate.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1;

    return {
      date: today,
      challengeNumber,
      category: category
        ? {_id: category._id, name: category.name}
        : null,
      quizzes: enrichedQuizzes,
      isCompleted,
      userResults,
    };
  },
});

/**
 * 스트릭 복구 모달 상태 조회 (PMF sprint #70).
 *
 * 어제 퀴즈를 빠뜨려 스트릭이 끊어질 위기인 사용자에게
 * 30일에 한 번 무료 프리즈를 제안할지 결정한다.
 *
 * 표시 조건:
 *  - 인증된 사용자
 *  - currentStreak >= 1 (지킬 스트릭이 있어야 함)
 *  - lastStreakDate가 어제보다 더 이전 (오늘 또는 어제면 위기 아님)
 *  - 보유 streakFreeze === 0 (프리즈가 있으면 자동으로 소모되므로 모달 불필요)
 *  - 오늘 데일리 퀴즈를 아직 안 풀었음
 *  - 30일 이내에 무료 복구를 받지 않았음
 */
export const getStreakRecoveryState = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {eligible: false as const};

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
    if (!profile) return {eligible: false as const};

    const currentStreak = profile.currentStreak ?? 0;
    const lastStreakDate = profile.lastStreakDate;
    const streakFreezeCount = profile.streakFreezeCount ?? 0;
    const lastRecoveryAt = profile.lastStreakRecoveryAt;

    if (currentStreak < 1) return {eligible: false as const};
    if (!lastStreakDate) return {eligible: false as const};
    if (streakFreezeCount > 0) return {eligible: false as const};

    const today = streakToday();
    const yesterday = streakYesterday();

    // 오늘이거나 어제까지 풀었으면 위기 아님
    if (lastStreakDate === today || lastStreakDate === yesterday)
      return {eligible: false as const};

    // 30일 쿨다운
    if (lastRecoveryAt) {
      const lastDate = new Date(lastRecoveryAt);
      const diffDays = Math.floor(
        (Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (diffDays < 30) return {eligible: false as const};
    }

    // 오늘 이미 데일리 풀었으면 모달 불필요 — 인덱스 범위로 좁혀서 스캔량 제한
    const todayResult = await ctx.db
      .query('quizResults')
      .withIndex('by_user_and_date', (q) =>
        q
          .eq('userId', userId)
          .gte('createdAt', streakDayStart(today))
          .lt('createdAt', streakDayEnd(today)),
      )
      .filter((q) => q.eq(q.field('isDaily'), true))
      .first();
    if (todayResult) return {eligible: false as const};

    return {eligible: true as const, currentStreak};
  },
});

/**
 * 오늘의 퀴즈 완료 여부만 빠르게 확인
 */
export const isDailyCompleted = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const today = streakToday();

    const dailyResult = await ctx.db
      .query('quizResults')
      .withIndex('by_user_and_date', (q) =>
        q
          .eq('userId', userId)
          .gte('createdAt', streakDayStart(today))
          .lt('createdAt', streakDayEnd(today)),
      )
      .filter((q) => q.eq(q.field('isDaily'), true))
      .first();

    return !!dailyResult;
  },
});
