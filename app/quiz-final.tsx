import {styled, css} from 'kstyled';
import {useRouter, useLocalSearchParams} from 'expo-router';
import {Stack} from 'expo-router';
import {Button, Typography, useCPK} from 'cpk-ui';
import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {ScrollView, type ScrollViewInstance} from 'react-native';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {captureRef} from 'react-native-view-shot';
import {shareAsync} from 'expo-sharing';
import {Image} from 'expo-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAudioPlayer} from 'expo-audio';
import {toast} from '@backpackapp-io/react-native-toast';
import {useConvexAuth, useMutation} from 'convex/react';

import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {
  IC_BULB,
  IC_MARTIE_BASIC,
  IC_MARTIE_IMPRESSED,
  IC_MARTIE_SWEAT,
} from '../src/icons';
import {t} from '../src/STRINGS';
import {QUIZ_PASSED_SCORE} from '../src/utils/constants';
import {useAnswerStore} from '../src/stores/answersStore';
import {LOG_EVENTS, logEvent, logScreenView} from '../src/utils/analytics';
import {logError} from '../src/utils/error';
import {AUDIO_LOSE, AUDIO_WIN} from '../src/sounds';
import {useUserStore} from '../src/stores/userStore';
import useQuizStore from '../src/stores/quizStore';
import {useBulbManager} from '../src/hooks/useBulbManager';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';

type SearchParams = {
  point?: string;
  hasPassed?: string;
  lastQuizId?: string;
  lastQuizKey?: string;
  quizCount?: string;
};

type RouteTarget = '/(tabs)' | '/quiz';

const HOME_ROUTE: RouteTarget = '/(tabs)';

function QuizFinal(): JSX.Element {
  const params = useLocalSearchParams<SearchParams>();
  const {
    point = '0',
    hasPassed = 'false',
    lastQuizId,
    lastQuizKey,
    quizCount = '0',
  } = params;
  const {replace} = useRouter();
  const hasPassedBoolean = hasPassed === 'true';
  const pointNumber = typeof point === 'string' ? parseInt(point, 10) : point;
  const safePointNumber = Number.isFinite(pointNumber) ? pointNumber : 0;
  const quizCountNumber =
    typeof quizCount === 'string' ? parseInt(quizCount, 10) : 0;
  const audioWinPlayer = useAudioPlayer(AUDIO_WIN);
  const audioLosePlayer = useAudioPlayer(AUDIO_LOSE);
  const {theme} = useCPK();
  const {top} = useSafeAreaInsets();
  const resultViewRef = useRef<ScrollViewInstance>(null);
  const {bulbCount, updateBulbCount} = useBulbManager();
  const {clearAnswers} = useAnswerStore();
  const {isAuthenticated} = useConvexAuth();
  const {setLastQuizKeyCursor} = useQuizStore();
  const updateLastUserCursor = useMutation(
    api.user.mutations.updateLastUserCursor,
  );
  const updateLevel = useMutation(api.user.mutations.updateUserLevel);
  const completionSyncStartedRef = useRef(false);
  const navigationStartedRef = useRef(false);
  const replaceRef = useRef(replace);
  const [pendingRoute, setPendingRoute] = useState<RouteTarget | null>(null);

  useEffect(() => {
    replaceRef.current = replace;
  }, [replace]);

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'quiz_final',
        screen_class: 'QuizFinal',
      });
  }, []);

  useEffect(() => {
    if (!hasPassedBoolean || completionSyncStartedRef.current) return;

    completionSyncStartedRef.current = true;

    const syncPracticeCompletion = async () => {
      try {
        if (isAuthenticated && lastQuizId) {
          await updateLastUserCursor({
            quidId: lastQuizId as Id<'quizzes'>,
          });
        }

        if (lastQuizKey) {
          setLastQuizKeyCursor(lastQuizKey);
        }

        if (isAuthenticated) {
          // The server derives points from the results it graded.
          await updateLevel({});
        }

        logEvent(LOG_EVENTS.PRACTICE_QUIZ_COMPLETION_SYNCED, {
          point: safePointNumber,
          quizCount: quizCountNumber,
          isAuthenticated,
          hasLastQuizId: Boolean(lastQuizId),
          hasLastQuizKey: Boolean(lastQuizKey),
        });
      } catch (error) {
        logError(error, 'QuizFinal.syncPracticeCompletion');
      }
    };

    void syncPracticeCompletion();
  }, [
    hasPassedBoolean,
    isAuthenticated,
    lastQuizId,
    lastQuizKey,
    quizCountNumber,
    safePointNumber,
    setLastQuizKeyCursor,
    updateLastUserCursor,
    updateLevel,
  ]);

  useEffect(() => {
    if (hasPassedBoolean) {
      audioWinPlayer.play();
      return;
    }

    audioLosePlayer.play();
  }, [audioLosePlayer, audioWinPlayer, hasPassedBoolean]);

  useEffect(() => {
    return () => {
      clearAnswers();
    };
  }, [clearAnswers]);

  useEffect(() => {
    if (!pendingRoute) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        replaceRef.current(pendingRoute);
      }, 80);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [pendingRoute]);

  const capture = async (): Promise<void> => {
    if (!resultViewRef.current) {
      return;
    }

    try {
      const uri = await captureRef(resultViewRef, {
        format: 'png',
        quality: 0.8,
      });

      if (uri) {
        await shareAsync(uri, {
          dialogTitle: t('common.martieScore'),
          mimeType: 'image/png',
        });

        logEvent(LOG_EVENTS.CAPTURE_QUIZ_RESULT);
      } else {
        throw new Error('Failed to capture view');
      }
    } catch (error) {
      logError(error);
    }
  };

  const getScoreAttributes = useCallback(
    (point: number) => {
      if (point >= QUIZ_PASSED_SCORE) {
        return {
          color: theme.role.success,
          text: t('quiz.scoreExcellent'),
          imgSource: IC_MARTIE_IMPRESSED,
        };
      } else if (point >= 30) {
        return {
          color: theme.role.warning,
          text: t('quiz.scoreGood'),
          imgSource: IC_MARTIE_BASIC,
        };
      } else {
        return {
          color: theme.role.danger,
          text: t('quiz.scoreBad'),
          imgSource: IC_MARTIE_SWEAT,
        };
      }
    },
    [theme.role.danger, theme.role.success, theme.role.warning],
  );

  const beginNavigationAction = useCallback(() => {
    if (navigationStartedRef.current) return false;

    navigationStartedRef.current = true;
    return true;
  }, []);

  const navigateAfterTransition = useCallback(
    (route: RouteTarget) => {
      clearAnswers();

      logEvent(LOG_EVENTS.PRACTICE_QUIZ_FINAL_ACTION, {
        action: route === '/quiz' ? 'play_next_or_replay' : 'done',
        point: safePointNumber,
        hasPassed: hasPassedBoolean,
      });
      setPendingRoute(route);
    },
    [clearAnswers, hasPassedBoolean, safePointNumber],
  );

  const handleDone = useCallback(async () => {
    if (!beginNavigationAction()) return;

    navigateAfterTransition(HOME_ROUTE);
  }, [beginNavigationAction, navigateAfterTransition]);

  const handleReplay = useCallback(() => {
    if (!beginNavigationAction()) return;

    navigateAfterTransition('/quiz');
  }, [beginNavigationAction, navigateAfterTransition]);

  const handlePlayNextLevel = useCallback(async () => {
    if (!beginNavigationAction()) return;

    if (!bulbCount) {
      toast.error(t('common.notEnoughBulb'), {
        duration: 3000,
      });

      navigateAfterTransition(HOME_ROUTE);
      return;
    }

    // Check if user is premium before decrementing bulb count
    const {isPremium} = useUserStore.getState();
    if (!isPremium) {
      updateBulbCount(1, 'subtract');
    }

    navigateAfterTransition('/quiz');
  }, [
    beginNavigationAction,
    bulbCount,
    navigateAfterTransition,
    updateBulbCount,
  ]);

  const {text, color, imgSource} = useMemo(
    () => getScoreAttributes(safePointNumber),
    [getScoreAttributes, safePointNumber],
  );

  if (pendingRoute) {
    return (
      <Container>
        <Stack.Screen options={{headerShown: false}} />
        <CustomLoadingIndicator />
      </Container>
    );
  }

  return (
    <Container>
      <Stack.Screen options={{headerShown: false}} />
      <Header
        style={css`
          padding-top: ${top + 8 + 'px'};
        `}
      >
        <BulbInfo>
          <BulbImage source={IC_BULB} />
          <Typography.Heading5>{bulbCount}</Typography.Heading5>
        </BulbInfo>

        <Button
          hapticFeedback={ImpactFeedbackStyle.Soft}
          borderRadius={12}
          text={t('common.screenCapture')}
          onPress={capture}
          styles={{
            container: css`
              min-height: 38px;
              padding: 0 14px;
              background-color: ${theme.bg.bubble};
              border-color: ${theme.role.border};
              border-width: 1px;
            `,
            text: css`
              color: ${theme.text.basic};
              font-size: 14px;
              font-weight: bold;
            `,
          }}
        />
      </Header>
      <Content>
        <ScrollView
          ref={resultViewRef}
          style={css`
            align-self: stretch;
            background-color: ${theme.bg.basic};
          `}
          contentContainerStyle={css`
            align-items: center;
          `}
        >
          <Typography.Heading1
            style={css`
              text-align: center;
              margin-top: 66px;
            `}
          >
            {t('common.numPoints', {
              points: safePointNumber,
            })}
          </Typography.Heading1>
          <Typography.Heading5
            style={css`
              margin-top: 16px;
              margin-bottom: 56px;
              color: ${color};
            `}
          >
            {text}
          </Typography.Heading5>
          <Image
            source={imgSource}
            style={css`
              width: 150px;
              height: 150px;
            `}
          />
        </ScrollView>
        <ButtonContainer>
          <Typography.Body3
            style={css`
              font-weight: bold;
              font-size: 13px;
              margin-bottom: 12px;
              text-align: center;
            `}
          >
            {t('quiz.quizPassPlaceholder')}
          </Typography.Body3>
          {hasPassedBoolean ? (
            <StyledButton
              styles={buttonStyles}
              onPress={handlePlayNextLevel}
              text={t('common.playNextLevel')}
              borderRadius={12}
            />
          ) : (
            <StyledButton
              styles={buttonStyles}
              onPress={handleReplay}
              text={t('common.replay')}
              borderRadius={12}
            />
          )}
          <StyledButton
            onPress={handleDone}
            text={t('common.done')}
            color="light"
            borderRadius={12}
            styles={{
              ...buttonStyles,
              ...{
                text: css`
                  font-weight: normal;
                `,
              },
            }}
          />
        </ButtonContainer>
      </Content>
    </Container>
  );
}

export default QuizFinal;

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const Header = styled.View`
  padding: 20px 18px;
  flex-direction: row-reverse;
  justify-content: space-between;
  align-items: center;
`;

const Content = styled.View`
  flex: 1;
  align-self: stretch;
`;

const BulbInfo = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const BulbImage = styled(Image)`
  width: 28px;
  height: 28px;
`;

const ButtonContainer = styled.View`
  gap: 12px;
  align-self: stretch;
  padding: 24px;
  justify-content: center;
  align-items: center;
`;

const StyledButton = styled(Button)`
  height: 56px;
  align-self: stretch;
`;

const buttonStyles: ComponentProps<typeof Button>['styles'] = {
  container: css`
    height: 56px;
  `,
  text: css`
    font-size: 16px;
    font-weight: bold;
  `,
};
