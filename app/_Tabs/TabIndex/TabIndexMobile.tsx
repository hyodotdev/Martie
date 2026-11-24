/**
 * @name TabIndexMobile
 *
 * 모바일 화면용 홈 탭 컴포넌트
 * Phase 1: 데일리 퀴즈 + 스트릭 + 리그 + 기존 퀴즈
 */
import React, {useEffect, useCallback, useRef} from 'react';
import {Typography, useCPK} from 'cpk-ui';
import {useRouter} from 'expo-router';
import {useMMKVString} from 'react-native-mmkv';
import {Storage} from '../../../src/utils/storage';
import {getGuestDailyResultsToday} from '../../../src/utils/guestDaily';
import {getDailyReturnPrompt} from '../../../src/utils/dailyReturn';
import {useSignInRequireModalStore} from '../../../src/stores/signInRequireModalStore';
import {useFirstQuizModalTrigger} from '../../../src/hooks/useFirstQuizModalTrigger';
import {styled, css} from 'kstyled';
import {Image} from 'expo-image';
import {IC_MARTIE_BASIC, IC_MARTIE_SLEEP} from '../../../src/icons';
import {Pressable, ScrollView, View} from 'react-native';
import BubbleWithTypeWriter from '../../../src/uis/Bubble/BubbleWithTypeWriter';
import Bubble from '../../../src/uis/Bubble/Bubble';
import {BUBBLE_MESSAGE_CYCLE_INTERVAL} from '../../../src/utils/constants';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {toast} from '@backpackapp-io/react-native-toast';
import {QUIZ_LIMIT} from '../../../src/utils/constants';

import {useConvexAuth, useQuery, useMutation} from 'convex/react';
import {api} from '../../../convex/_generated/api';
import {useQuizzes} from '../../../src/hooks/useQuizzes';
import ButtonMartie from '../../../src/uis/ButtonMartie';
import {useUserStore} from '../../../src/stores/userStore';
import {useBulbManager} from '../../../src/hooks/useBulbManager';
import {useStandardQuizStart} from '../../../src/hooks/useStandardQuizStart';
import {t, getLocale} from '../../../src/STRINGS';
import {logEvent, LOG_EVENTS} from '../../../src/utils/analytics';
import {logError} from '../../../src/utils/error';
import {
  canStartStandardQuiz,
  shouldShowQuizReadyState,
} from '../../../src/utils/quizAccess';
import DailyStreakBanner from '../../../src/uis/DailyChallenge/DailyStreakBanner';
import DailyChallengeCard, {
  DailyChallengeCardSkeleton,
} from '../../../src/uis/DailyChallenge/DailyChallengeCard';
import LeagueProgressCard from '../../../src/uis/League/LeagueProgressCard';
import BattleEntryCard from '../../../src/uis/Battle/BattleEntryCard';
import {categoriesMap} from '../../../src/utils/categoriesMap';
import {
  createStreakReminderNotification,
  cancelStreakReminderNotification,
} from '../../../src/utils/notifee';

const QUIZ_LANGUAGE_MAP: Record<string, 'en' | 'ko' | 'ja'> = {
  ko: 'ko',
  ja: 'ja',
  en: 'en',
};

export default function TabIndexMobile(): JSX.Element {
  useFirstQuizModalTrigger();
  const {theme} = useCPK();
  const {
    bulbCount,
    updateBulbCount,
    claimDailyCheckIn,
    isLoading: isBulbLoading,
  } = useBulbManager();
  const [lastCheckIn, setLastCheckIn] = useMMKVString(Storage.LastCheckInDate);
  const [guestDailyRaw] = useMMKVString(Storage.GuestDailyResult);
  const [dailyReturnRaw] = useMMKVString(Storage.LastDailyCompletionSummary);
  const {navigate, push} = useRouter();
  const setSignInRequireModalVisible = useSignInRequireModalStore(
    (state) => state.setVisible,
  );
  const {quizzes, isLoading} = useQuizzes(QUIZ_LIMIT);
  const currentUser = useQuery(api.user.queries.currentUser);
  const {isPremium} = useUserStore();
  const {isAuthenticated, isLoading: isAuthLoading} = useConvexAuth();

  // Phase 1 queries
  const locale = getLocale();
  const quizLanguage = QUIZ_LANGUAGE_MAP[locale] || 'en';
  const dailyChallenge = useQuery(api.dailyChallenge.queries.getToday, {
    language: quizLanguage,
  });
  const isOpeningDailyQuizRef = useRef(false);
  const didLogReturnPromptRef = useRef<string | null>(null);
  const myLeague = useQuery(api.league.queries.getMyLeague);
  const joinLeague = useMutation(api.league.mutations.joinLeague);

  // 스트릭 리마인더 알림 등록/취소
  useEffect(() => {
    if (dailyChallenge?.isCompleted) {
      cancelStreakReminderNotification();
    } else {
      createStreakReminderNotification();
    }
  }, [dailyChallenge?.isCompleted]);

  // 데일리 체크인 (기존 로직 유지)
  useEffect(() => {
    if (isBulbLoading) return;
    const today = new Date().toDateString();
    if (lastCheckIn !== today && !isPremium) {
      setLastCheckIn(today);
      claimDailyCheckIn()
        .then(({granted}) => {
          if (granted > 0) {
            toast.success(t('common.dailyCheckInReward', {count: granted}));
          }
        })
        .catch((error: unknown) => logError(error, 'daily_check_in'));
    }
  }, [
    lastCheckIn,
    setLastCheckIn,
    isPremium,
    claimDailyCheckIn,
    isBulbLoading,
  ]);

  const {startStandardQuiz, isStartingStandardQuiz} = useStandardQuizStart({
    bulbCount,
    quizCount: quizzes?.length,
    updateBulbCount,
    navigate,
  });

  const guestDailyResults = !isAuthenticated
    ? getGuestDailyResultsToday(guestDailyRaw)
    : [];
  const isDailyCompleted =
    dailyChallenge?.isCompleted || guestDailyResults.length > 0;
  const dailyUserResults = guestDailyResults.length
    ? guestDailyResults
    : (dailyChallenge?.userResults ?? []);
  const dailyReturnPrompt =
    dailyChallenge && !isDailyCompleted
      ? getDailyReturnPrompt(dailyReturnRaw)
      : null;

  useEffect(() => {
    if (!dailyReturnPrompt) return;
    const key = `${dailyReturnPrompt.date}:${dailyReturnPrompt.daysSinceCompleted}`;
    if (didLogReturnPromptRef.current === key) return;
    didLogReturnPromptRef.current = key;
    logEvent(LOG_EVENTS.DAILY_RETURN_CTA_SHOWN, {
      completedDate: dailyReturnPrompt.date,
      daysSinceCompleted: dailyReturnPrompt.daysSinceCompleted,
      correctCount: dailyReturnPrompt.correctCount,
      totalQuestions: dailyReturnPrompt.totalQuestions,
      wrongCount: dailyReturnPrompt.wrongCount,
      surface: 'home',
    });
  }, [dailyReturnPrompt]);

  const handleDailyQuiz = useCallback(() => {
    if (!dailyChallenge || isDailyCompleted) return;
    if (isOpeningDailyQuizRef.current) return;
    isOpeningDailyQuizRef.current = true;
    push('/daily-quiz');
    setTimeout(() => {
      isOpeningDailyQuizRef.current = false;
    }, 500);
  }, [dailyChallenge, isDailyCompleted, push]);

  const handleShareDaily = useCallback(() => {
    navigate('/daily-result');
  }, [navigate]);

  const handleDailyReturnPress = useCallback(() => {
    if (!dailyReturnPrompt || !dailyChallenge || isDailyCompleted) return;
    logEvent(LOG_EVENTS.DAILY_RETURN_CTA_PRESSED, {
      completedDate: dailyReturnPrompt.date,
      daysSinceCompleted: dailyReturnPrompt.daysSinceCompleted,
      wrongCount: dailyReturnPrompt.wrongCount,
      surface: 'home',
    });
    push('/daily-quiz');
  }, [dailyChallenge, dailyReturnPrompt, isDailyCompleted, push]);

  const handleBattlePress = useCallback(() => {
    push('/battles');
  }, [push]);

  const handleLeaguePress = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error(t('league.loginRequired'));
      logEvent(LOG_EVENTS.LOGIN_PROMPT_SHOWN, {source: 'league'});
      setSignInRequireModalVisible(true);
      return;
    }
    if (!myLeague) {
      try {
        await joinLeague();
        toast.success(t('league.joinLeague'));
      } catch (error) {
        logError(error, 'join-league');
        toast.error(t('error.tryAgain'));
      }
      return;
    }
    navigate('/league');
  }, [
    isAuthenticated,
    myLeague,
    joinLeague,
    navigate,
    setSignInRequireModalVisible,
  ]);

  const handlePressLevel = () => {
    currentUser && navigate('/quiz-level');
  };

  const handleCreateQuiz = () => {
    if (!isAuthenticated) {
      logEvent(LOG_EVENTS.LOGIN_PROMPT_SHOWN, {source: 'home_quiz_creator'});
      setSignInRequireModalVisible(true);
      return;
    }
    navigate('/submit-quiz');
  };

  // 카테고리 이름 번역
  const dailyCategoryName = dailyChallenge?.category
    ? categoriesMap.find((c) => c.name === dailyChallenge.category?.name)
        ?.localizedString || dailyChallenge.category.name
    : null;

  const currentStreak = currentUser?.currentStreak ?? 0;
  const isStreakLoading = isAuthLoading || currentUser === undefined;
  const isLeagueLoading = isAuthLoading || myLeague === undefined;
  const isDailyLoading = dailyChallenge === undefined;
  const isQuizActionLoading =
    isBulbLoading || isLoading || isStartingStandardQuiz;
  const canStartQuiz = canStartStandardQuiz({
    bulbCount,
    isPremium,
    isQuizActionLoading,
  });
  const hasBulbForDisplay = shouldShowQuizReadyState({
    bulbCount,
    isBulbLoading,
    isPremium,
  });
  const cleverIndexAccessibilityLabel = [
    t('common.cleverIndex'),
    `Lv.${currentUser?.level ?? '?'}`,
  ].join(', ');

  return (
    <ScrollView
      style={css`
        flex: 1;
      `}
      contentContainerStyle={css`
        flex-grow: 1;
        padding-top: 12px;
        padding-bottom: 40px;
        gap: 16px;
      `}
    >
      {/* 스트릭 + 벌브 칩 */}
      <DailyStreakBanner
        currentStreak={currentStreak}
        bulbCount={bulbCount}
        isBulbLoading={isBulbLoading}
        isStreakLoading={isStreakLoading}
      />

      {/* Martie 캐릭터 + 말풍선 */}
      <View
        style={css`
          flex-direction: row;
          align-items: center;
          padding: 8px 20px 12px 20px;
          gap: 12px;
        `}
      >
        <Image
          source={hasBulbForDisplay ? IC_MARTIE_BASIC : IC_MARTIE_SLEEP}
          style={css`
            width: 64px;
            height: 64px;
          `}
        />
        <View
          style={css`
            flex: 1;
          `}
        >
          {hasBulbForDisplay ? (
            <BubbleWithTypeWriter
              text={t('home.welcome')}
              randomWelcome={true}
              cycleInterval={BUBBLE_MESSAGE_CYCLE_INTERVAL}
              typewriterSpeed={100}
              tailDirection="left"
            />
          ) : (
            <Bubble text={t('home.noBulbText')} tailDirection="left" />
          )}
        </View>
      </View>

      {dailyReturnPrompt ? (
        <DailyReturnCard>
          <View
            style={css`
              flex: 1;
              gap: 4px;
            `}
          >
            <Typography.Body2
              style={css`
                font-weight: 800;
              `}
            >
              {t('home.returnLoopTitle', {
                correct: dailyReturnPrompt.correctCount,
                total: dailyReturnPrompt.totalQuestions,
              })}
            </Typography.Body2>
            <Typography.Body3
              style={css`
                opacity: 0.62;
                line-height: 20px;
              `}
            >
              {t('home.returnLoopBody', {
                count: dailyReturnPrompt.wrongCount,
              })}
            </Typography.Body3>
          </View>
          <ButtonMartie
            hapticFeedback={ImpactFeedbackStyle.Light}
            onPress={handleDailyReturnPress}
            text={t('home.returnLoopButton')}
            borderRadius={12}
            styles={{
              container: css`
                height: 42px;
                border-width: 0;
                padding: 0 14px;
              `,
              text: css`
                font-size: 13px;
                font-weight: 800;
              `,
            }}
          />
        </DailyReturnCard>
      ) : null}

      {/* 오늘의 퀴즈 카드 (히어로) */}
      {isDailyLoading ? (
        <DailyChallengeCardSkeleton />
      ) : dailyChallenge ? (
        <DailyChallengeCard
          categoryName={dailyCategoryName}
          isCompleted={isDailyCompleted}
          userResults={dailyUserResults}
          challengeNumber={dailyChallenge.challengeNumber}
          onPress={handleDailyQuiz}
          onShare={handleShareDaily}
        />
      ) : null}

      {/* 리그 + Clever Index 가로 배치 */}
      <View
        style={css`
          flex-direction: row;
          gap: 10px;
          margin: 0 16px;
        `}
      >
        {/* 리그 미니카드 */}
        <View
          style={css`
            flex: 1;
          `}
        >
          <LeagueProgressCard
            tier={myLeague?.tier ?? null}
            weeklyXp={myLeague?.weeklyXp ?? 0}
            myRank={myLeague?.myRank ?? 0}
            totalMembers={myLeague?.totalMembers ?? 0}
            onPress={handleLeaguePress}
            isLoading={isLeagueLoading}
          />
        </View>
      </View>

      {/* 1:1 퀴즈 대결 */}
      <BattleEntryCard onPress={handleBattlePress} />

      {/* 퀴즈 시작 */}
      <Pressable
        accessibilityLabel={cleverIndexAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{disabled: !currentUser}}
        disabled={!currentUser}
        onPress={handlePressLevel}
      >
        <CleverIndexCard>
          <View
            style={css`
              gap: 2px;
            `}
          >
            <Typography.Body3
              style={css`
                opacity: 0.6;
              `}
            >
              {t('common.cleverIndex')}
            </Typography.Body3>
            <Typography.Heading4
              style={css`
                font-weight: 800;
              `}
            >
              Lv.{currentUser?.level || '?'}
            </Typography.Heading4>
          </View>
          <ButtonMartie
            hapticFeedback={ImpactFeedbackStyle.Soft}
            onPress={startStandardQuiz}
            text={
              hasBulbForDisplay
                ? t('home.takeAQuiz')
                : t('common.notEnoughBulb')
            }
            borderRadius={14}
            loading={isStartingStandardQuiz}
            disabled={!canStartQuiz}
            styles={{
              container: css`
                height: 48px;
                border-width: 0;
                padding: 0 28px;
              `,
              text: css`
                font-size: 15px;
                font-weight: 800;
              `,
            }}
          />
        </CleverIndexCard>
      </Pressable>

      <CreatorCard>
        <View
          style={css`
            flex: 1;
            gap: 4px;
          `}
        >
          <Typography.Body2
            style={css`
              font-weight: 800;
            `}
          >
            {t('home.creatorCtaTitle')}
          </Typography.Body2>
          <Typography.Body3
            style={css`
              opacity: 0.6;
              line-height: 20px;
            `}
          >
            {t('home.creatorCtaBody')}
          </Typography.Body3>
        </View>
        <ButtonMartie
          hapticFeedback={ImpactFeedbackStyle.Light}
          onPress={handleCreateQuiz}
          text={t('home.creatorCtaButton')}
          borderRadius={12}
          color="light"
          style={css`
            flex-shrink: 0;
          `}
          styles={{
            container: css`
              min-width: 88px;
              height: 42px;
              border-width: 1px;
              border-color: ${theme.role.border};
              background-color: ${theme.bg.basic};
              padding: 0 16px;
            `,
            text: css`
              color: ${theme.text.basic};
              font-size: 13px;
              font-weight: 800;
            `,
          }}
        />
      </CreatorCard>
    </ScrollView>
  );
}

const CleverIndexCard = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin: 0 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const CreatorCard = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin: 0 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const DailyReturnCard = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin: 0 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.primary};
`;
