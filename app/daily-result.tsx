/**
 * @name DailyResult
 *
 * 데일리 퀴즈 결과 + 공유카드 화면
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import {t, getLocale} from '../src/STRINGS';
import {useConvexAuth, useMutation, useQuery} from 'convex/react';
import {api} from '../convex/_generated/api';
import DailyShareCard from '../src/uis/ShareCard/DailyShareCard';
import ButtonMartie from '../src/uis/ButtonMartie';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {Image} from 'expo-image';
import {IC_MARTIE_IMPRESSED, IC_MARTIE_SWEAT} from '../src/icons';
import {useAudioPlayer} from 'expo-audio';
import {AUDIO_WIN, AUDIO_LOSE} from '../src/sounds';
import {
  isStreakMilestone,
  logEvent,
  LOG_EVENTS,
  logScreenView,
} from '../src/utils/analytics';
import {categoriesMap} from '../src/utils/categoriesMap';
import {useSignInRequireModalStore} from '../src/stores/signInRequireModalStore';
import {logError} from '../src/utils/error';
import {toast} from '@backpackapp-io/react-native-toast';
import {requestAppReviewIfEligible} from '../src/utils/appReview';
import {requestFirstDailyNotificationPermission} from '../src/hooks/useNotificationPermissionFlow';
import {createNextDailyReadyNotification} from '../src/utils/notifee';

function formatAccessibilitySentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  return /[.!?。！？]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function joinAccessibilityLabel(parts: string[]): string {
  return parts.map(formatAccessibilitySentence).filter(Boolean).join(' ');
}

function DailyResultPage(): JSX.Element {
  const {theme} = useCPK();
  const params = useLocalSearchParams<{
    correctCount?: string;
    returnToHome?: string;
    totalQuestions?: string;
    totalTimeMs?: string;
  }>();
  const {replace, push, back, canGoBack} = useRouter();
  const [isReturningHome, setIsReturningHome] = useState(false);
  const {isAuthenticated} = useConvexAuth();
  const setSignInRequireModalVisible = useSignInRequireModalStore(
    (state) => state.setVisible,
  );
  const currentUser = useQuery(api.user.queries.currentUser);
  const myLeague = useQuery(api.league.queries.getMyLeague);
  const joinLeague = useMutation(api.league.mutations.joinLeague);
  const locale = getLocale();
  const quizLang =
    ({ko: 'ko', ja: 'ja'} as Record<string, 'en' | 'ko' | 'ja'>)[locale] ||
    'en';
  const dailyChallenge = useQuery(api.dailyChallenge.queries.getToday, {
    language: quizLang,
  });

  // 오늘 카테고리의 블로그 글
  const categoryName = dailyChallenge?.category?.name;
  const relatedArticle = useQuery(
    api.article.queries.getByCategory,
    categoryName ? {categoryName} : 'skip',
  );
  const localizedCategoryName = categoryName
    ? categoriesMap.find((c) => c.name === categoryName)?.localizedString ||
      categoryName
    : '';

  const correctCount = parseInt(params.correctCount ?? '0', 10);
  const totalQuestions = parseInt(params.totalQuestions ?? '5', 10);
  const totalTimeMs = parseInt(params.totalTimeMs ?? '0', 10);
  const shouldReplaceHomeOnReturn = params.returnToHome === 'true';
  const navigationArgsRef = useRef({
    back,
    canGoBack,
    replace,
    shouldReplaceHomeOnReturn,
  });
  const currentStreak = currentUser?.currentStreak ?? 0;
  const challengeNumber = dailyChallenge?.challengeNumber ?? 0;

  const isGoodScore = correctCount >= 3;
  const wrongCount = Math.max(0, totalQuestions - correctCount);
  const audioWinPlayer = useAudioPlayer(AUDIO_WIN);
  const audioLosePlayer = useAudioPlayer(AUDIO_LOSE);

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'daily_result',
        screen_class: 'DailyResult',
      });
  }, []);

  const longestStreak = currentUser?.longestStreak ?? 0;
  const didLogStreakRef = useRef(false);
  useEffect(() => {
    if (!currentUser || didLogStreakRef.current) return;
    didLogStreakRef.current = true;
    logEvent(LOG_EVENTS.STREAK_STATE, {
      currentStreak,
      longestStreak,
      correctCount,
      totalQuestions,
      category: categoryName,
    });
    if (isStreakMilestone(currentStreak)) {
      logEvent(LOG_EVENTS.STREAK_MILESTONE, {
        streak: currentStreak,
        longestStreak,
      });
    }
  }, [
    currentUser,
    currentStreak,
    longestStreak,
    correctCount,
    totalQuestions,
    categoryName,
  ]);

  const didRequestReviewRef = useRef(false);
  useEffect(() => {
    if (!currentUser || didRequestReviewRef.current) return;
    const reason =
      correctCount === totalQuestions
        ? 'perfect_daily'
        : isStreakMilestone(currentStreak)
          ? 'streak_milestone'
          : null;
    if (!reason) return;

    didRequestReviewRef.current = true;
    const handle = setTimeout(() => {
      requestAppReviewIfEligible(reason);
    }, 1200);

    return () => clearTimeout(handle);
  }, [correctCount, currentStreak, currentUser, totalQuestions]);

  useEffect(() => {
    if (isGoodScore) {
      audioWinPlayer.play();
    } else {
      audioLosePlayer.play();
    }
  }, [isGoodScore, audioWinPlayer, audioLosePlayer]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void requestFirstDailyNotificationPermission().then((granted) => {
        if (granted) {
          void createNextDailyReadyNotification({wrongCount});
        }
      });
    }, 3500);

    return () => clearTimeout(handle);
  }, [wrongCount]);

  useEffect(() => {
    navigationArgsRef.current = {
      back,
      canGoBack,
      replace,
      shouldReplaceHomeOnReturn,
    };
  }, [back, canGoBack, replace, shouldReplaceHomeOnReturn]);

  useEffect(() => {
    if (!isReturningHome) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        const {back, canGoBack, replace, shouldReplaceHomeOnReturn} =
          navigationArgsRef.current;

        if (!shouldReplaceHomeOnReturn && canGoBack()) {
          back();
          return;
        }

        replace('/(tabs)');
      }, 120);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [isReturningHome]);

  const handleReturnHome = useCallback(() => {
    setIsReturningHome(true);
  }, []);

  const results = Array.from({length: totalQuestions}, (_, i) => ({
    isCorrect: i < correctCount,
  }));

  // If we have actual userResults from the daily challenge, use those
  const actualResults = dailyChallenge?.userResults?.length
    ? dailyChallenge.userResults.map((r: {isCorrect: boolean}) => ({
        isCorrect: r.isCorrect,
      }))
    : results;

  if (isReturningHome) {
    return (
      <TransitionContainer>
        <Stack.Screen
          options={{
            title: '',
            headerShown: false,
            headerShadowVisible: false,
          }}
        />
        <TransitionText>{t('common.loading')}</TransitionText>
      </TransitionContainer>
    );
  }

  const handleSaveProgress = () => {
    logEvent(LOG_EVENTS.LOGIN_PROMPT_SHOWN, {
      source: 'daily_result_save_progress',
    });
    setSignInRequireModalVisible(true);
  };

  const handleJoinLeague = async () => {
    if (!isAuthenticated) {
      handleSaveProgress();
      return;
    }

    try {
      if (myLeague === null) {
        await joinLeague();
        toast.success(t('league.joinLeague'));
      }
      push('/league');
    } catch (error) {
      logError(error, 'daily-result-join-league');
      toast.error(t('error.tryAgain'));
    }
  };

  return (
    <Container
      showsVerticalScrollIndicator={false}
      contentContainerStyle={css`
        flex-grow: 1;
        padding: 16px 0 40px;
        gap: 22px;
        align-items: center;
      `}
    >
      <Stack.Screen options={{title: '', headerShadowVisible: false}} />

      <HeroBlock>
        <Image
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          source={isGoodScore ? IC_MARTIE_IMPRESSED : IC_MARTIE_SWEAT}
          style={css`
            width: 96px;
            height: 96px;
          `}
        />
        <Typography.Heading2
          style={css`
            text-align: center;
            font-weight: 800;
            color: ${theme.text.basic};
          `}
        >
          {correctCount} / {totalQuestions}
        </Typography.Heading2>
        {currentStreak > 0 && (
          <StreakPill>
            <StreakIcon>🔥</StreakIcon>
            <StreakText>{t('daily.streak', {count: currentStreak})}</StreakText>
          </StreakPill>
        )}
      </HeroBlock>

      <DailyShareCard
        challengeNumber={challengeNumber}
        results={actualResults}
        totalTimeMs={totalTimeMs}
        currentStreak={currentStreak}
      />

      <ActionCard>
        <ActionTextGroup>
          <Typography.Body2
            style={css`
              font-weight: 800;
              color: ${theme.text.basic};
            `}
          >
            {t('daily.tomorrowPlanTitle')}
          </Typography.Body2>
          <Typography.Body3
            style={css`
              color: ${theme.text.placeholder};
              line-height: 20px;
            `}
          >
            {t(
              wrongCount > 0
                ? 'daily.tomorrowPlanBodyWithReview'
                : 'daily.tomorrowPlanBody',
              {count: wrongCount},
            )}
          </Typography.Body3>
        </ActionTextGroup>
      </ActionCard>

      {!isAuthenticated ? (
        <ActionCard>
          <ActionTextGroup>
            <Typography.Body2
              style={css`
                font-weight: 800;
                color: ${theme.text.basic};
              `}
            >
              {t('daily.saveProgressTitle')}
            </Typography.Body2>
            <Typography.Body3
              style={css`
                color: ${theme.text.placeholder};
                line-height: 20px;
              `}
            >
              {t('daily.saveProgressBody')}
            </Typography.Body3>
          </ActionTextGroup>
          <ButtonMartie
            accessibilityLabel={joinAccessibilityLabel([
              t('daily.saveProgressButton'),
              t('daily.saveProgressTitle'),
              t('daily.saveProgressBody'),
            ])}
            hapticFeedback={ImpactFeedbackStyle.Soft}
            onPress={handleSaveProgress}
            text={t('daily.saveProgressButton')}
            borderRadius={12}
            styles={{
              container: css`
                height: 46px;
                border-width: 0;
              `,
              text: css`
                font-size: 15px;
                font-weight: 800;
              `,
            }}
          />
        </ActionCard>
      ) : myLeague === null ? (
        <ActionCard>
          <ActionTextGroup>
            <Typography.Body2
              style={css`
                font-weight: 800;
                color: ${theme.text.basic};
              `}
            >
              {t('daily.joinLeagueTitle')}
            </Typography.Body2>
            <Typography.Body3
              style={css`
                color: ${theme.text.placeholder};
                line-height: 20px;
              `}
            >
              {t('daily.joinLeagueBody')}
            </Typography.Body3>
          </ActionTextGroup>
          <ButtonMartie
            accessibilityLabel={joinAccessibilityLabel([
              t('daily.joinLeagueButton'),
              t('daily.joinLeagueTitle'),
              t('daily.joinLeagueBody'),
            ])}
            hapticFeedback={ImpactFeedbackStyle.Soft}
            onPress={handleJoinLeague}
            text={t('daily.joinLeagueButton')}
            borderRadius={12}
            styles={{
              container: css`
                height: 46px;
                border-width: 0;
              `,
              text: css`
                font-size: 15px;
                font-weight: 800;
              `,
            }}
          />
        </ActionCard>
      ) : null}

      {/* 오늘의 카테고리 블로그 연결 */}
      {relatedArticle && (
        <Pressable
          accessible
          accessibilityLabel={t('daily.learnMoreAbout', {
            category: localizedCategoryName,
          })}
          accessibilityRole="button"
          onPress={() => {
            logEvent('daily_to_article', {
              article_key: relatedArticle.key,
              category: categoryName,
            });
            push({
              pathname: '/article-detail',
              params: {key: relatedArticle.key},
            } as any);
          }}
        >
          <ArticleLinkCard>
            <Typography.Body3
              style={css`
                color: ${theme.text.placeholder};
                font-weight: 700;
              `}
            >
              📚 {t('daily.learnMoreAbout', {category: localizedCategoryName})}
            </Typography.Body3>
            <ArrowText>→</ArrowText>
          </ArticleLinkCard>
        </Pressable>
      )}

      <ButtonMartie
        hapticFeedback={ImpactFeedbackStyle.Soft}
        onPress={handleReturnHome}
        text={t('common.return')}
        borderRadius={12}
        styles={{
          container: css`
            height: 48px;
            width: 200px;
            border-width: 0;
            margin-top: 8px;
          `,
          text: css`
            font-size: 16px;
            font-weight: bold;
          `,
        }}
      />
    </Container>
  );
}

const TransitionContainer = styled(View)`
  flex: 1;
  align-self: stretch;
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => theme.bg.basic};
`;

const TransitionText = styled.Text`
  color: ${({theme}) => theme.text.placeholder};
  font-size: 15px;
  font-weight: 700;
`;

const Container = styled(ScrollView)`
  background-color: ${({theme}) => theme.bg.basic};
  flex: 1;
`;

const HeroBlock = styled.View`
  align-items: center;
  gap: 10px;
  padding-top: 8px;
`;

const StreakPill = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background-color: ${({theme}) => theme.bg.paper};
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const StreakIcon = styled.Text`
  font-size: 16px;
`;

const StreakText = styled.Text`
  color: ${({theme}) => theme.text.placeholder};
  font-size: 15px;
  font-weight: 700;
`;

const ActionCard = styled.View`
  width: auto;
  align-self: stretch;
  margin: 0 16px;
  padding: 16px;
  gap: 14px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const ActionTextGroup = styled.View`
  gap: 5px;
`;

const ArticleLinkCard = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  margin: 0 16px;
  background-color: ${({theme}) => theme.bg.paper};
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme}) => theme.role.border};
`;

const ArrowText = styled.Text`
  font-size: 18px;
  color: ${({theme}) => theme.text.placeholder};
`;

export default withErrorBoundary(DailyResultPage);
