/**
 * @name DailyQuiz
 *
 * 데일리 퀴즈 화면 - 오늘의 5문제를 풀고 결과를 저장
 */
import {styled, css} from 'kstyled';
import {Stack, useRouter, useNavigation} from 'expo-router';
import {usePreventRemove} from 'expo-router/react-navigation';
import {useState, useEffect, useCallback, useRef} from 'react';
import ProgressBar from '../src/uis/ProgressBar';
import ProgressCircle from '../src/uis/ProgressCircle';
import {View, ScrollView, BackHandler} from 'react-native';
import {IconButton, Typography, useCPK} from 'cpk-ui';
import {QUIZ_TIME_IN_SECONDS} from '../src/utils/constants';
import QuizView from '../src/uis/QuizView';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';
import type {
  QuizOptionWithDescription,
  QuizWithDescriptions,
} from '../src/types';
import {useMMKVNumber} from 'react-native-mmkv';
import {storage, Storage} from '../src/utils/storage';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import {logError} from '../src/utils/error';
import {logEvent, LOG_EVENTS, logScreenView} from '../src/utils/analytics';
import {createSafeTimer} from '../src/utils/timerUtils';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAudioPlayer} from 'expo-audio';
import {AUDIO_PIANO, AUDIO_TIMER} from '../src/sounds';
import {
  safeIsAudioPlayerPlaying,
  safePlayAudioPlayer,
  safePauseAudioPlayer,
  safeSeekAudioPlayerToStart,
  safeSetAudioPlayerLoop,
  safeSetAudioPlayerVolume,
  stopAudioPlayer,
} from '../src/utils/audioPlayer';
import {useConvexAuth, useQuery, useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import type {Id} from '../convex/_generated/dataModel';
import {getLocale, t} from '../src/STRINGS';
import {toast} from '@backpackapp-io/react-native-toast';
import {saveDailyCompletionSummary} from '../src/utils/dailyReturn';

const DAILY_QUIZ_COUNT = 5;
const HOME_ROUTE = '/(tabs)' as const;

const QUIZ_LANGUAGE_MAP: Record<string, 'en' | 'ko' | 'ja'> = {
  ko: 'ko',
  ja: 'ja',
  en: 'en',
};

type DailyResult = {
  quizId: string;
  isCorrect: boolean;
  selectedOptionIndex: number;
  timeSpentMs: number;
};

type FinishRouteParams = {
  correctCount: number;
  totalTimeMs: number;
};

function DailyQuizPage(): JSX.Element {
  const {replace} = useRouter();
  const navigation = useNavigation();
  const {theme} = useCPK();
  const {top} = useSafeAreaInsets();
  const audioTimerPlayer = useAudioPlayer(AUDIO_TIMER);
  const audioPianoPlayer = useAudioPlayer(AUDIO_PIANO);
  const [volume, setVolume] = useMMKVNumber(Storage.Volume);

  const locale = getLocale();
  const quizLanguage = QUIZ_LANGUAGE_MAP[locale] || 'en';
  const dailyChallenge = useQuery(api.dailyChallenge.queries.getToday, {
    language: quizLanguage,
  });
  const {isAuthenticated} = useConvexAuth();
  const completeDailyChallenge = useMutation(
    api.dailyChallenge.mutations.completeDailyChallenge,
  );

  const [quizIndex, setQuizIndex] = useState(0);
  const [timer, setTimer] = useState(QUIZ_TIME_IN_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [selectedOption, setSelectedOption] =
    useState<QuizOptionWithDescription | null>(null);
  const [results, setResults] = useState<DailyResult[]>([]);
  const [isContinueProcessing, setIsContinueProcessing] = useState(false);
  const [preventLeaving, setPreventLeaving] = useState(true);
  const [finishRouteParams, setFinishRouteParams] =
    useState<FinishRouteParams | null>(null);
  const timerRef = useRef<ReturnType<typeof createSafeTimer> | null>(null);
  const [isFirstTime] = useState(
    () => !storage.getBoolean(Storage.DidFinishFirstDaily),
  );
  const [startedAt] = useState(() => Date.now());
  const didCompleteRef = useRef(false);
  const isFinishingRef = useRef(false);
  const handledInvalidDailyRef = useRef(false);
  const sessionStateRef = useRef({quizIndex: 0, answeredCount: 0});
  const dailyCategoryNameRef = useRef<string | undefined>(undefined);

  const quizzes = (dailyChallenge?.quizzes ?? []) as QuizWithDescriptions[];
  const currentQuiz = quizzes[quizIndex];
  const timeSpentMs = (QUIZ_TIME_IN_SECONDS - timer) * 1000;
  const isDanger = timer <= QUIZ_TIME_IN_SECONDS / 4;
  const progress =
    quizzes.length > 0 ? Math.round((quizIndex / quizzes.length) * 100) : 0;

  const stopTimerAudio = useCallback(() => {
    safePauseAudioPlayer(audioTimerPlayer);
    safeSeekAudioPlayerToStart(audioTimerPlayer);
  }, [audioTimerPlayer]);

  const stopQuizAudio = useCallback(() => {
    stopTimerAudio();
    stopAudioPlayer(audioPianoPlayer);
  }, [audioPianoPlayer, stopTimerAudio]);

  const stopQuizSession = useCallback(() => {
    if (timerRef.current) {
      timerRef.current.stop();
    }
    stopQuizAudio();
  }, [stopQuizAudio]);

  useEffect(() => {
    // Leaving the screen blurs it, and removing it runs this cleanup.
    const blurSub = navigation.addListener('blur', stopQuizSession);

    return () => {
      blurSub();
      stopQuizSession();
    };
  }, [navigation, stopQuizSession]);

  useEffect(() => {
    logEvent(LOG_EVENTS.DAILY_QUIZ_STARTED, {isFirstTime});
    if (!__DEV__)
      logScreenView({
        screen_name: 'daily_quiz',
        screen_class: 'DailyQuiz',
      });
  }, [isFirstTime]);

  // category_selected fires once per session — when the daily payload
  // resolves and the user is committed to today's category. Mirror it via
  // `category_abandoned` in the abandonment effect below. The category
  // name is mirrored into a ref so the unmount cleanup below can read the
  // latest value without depending on it (avoiding spurious cleanup runs
  // when the query refetches).
  const dailyCategoryName = dailyChallenge?.category?.name;
  const didLogCategoryRef = useRef(false);
  useEffect(() => {
    dailyCategoryNameRef.current = dailyCategoryName;
    if (!dailyCategoryName || didLogCategoryRef.current) return;
    didLogCategoryRef.current = true;
    logEvent(LOG_EVENTS.CATEGORY_SELECTED, {
      category: dailyCategoryName,
      surface: 'daily',
      isFirstTime,
    });
  }, [dailyCategoryName, isFirstTime]);

  // Keep latest session state in ref for unmount access
  useEffect(() => {
    sessionStateRef.current = {quizIndex, answeredCount: results.length};
  }, [quizIndex, results.length]);

  usePreventRemove(preventLeaving, () => {
    if (didCompleteRef.current) return;
    stopQuizAudio();
    toast(t('daily.completeToLeave'));
  });

  useEffect(() => {
    if (preventLeaving || !finishRouteParams) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        replace({
          pathname: '/daily-result',
          params: {
            correctCount: finishRouteParams.correctCount.toString(),
            totalQuestions: DAILY_QUIZ_COUNT.toString(),
            totalTimeMs: finishRouteParams.totalTimeMs.toString(),
            returnToHome: 'true',
          },
        });
      }, 80);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [finishRouteParams, preventLeaving, replace]);

  // Block Android hardware back until the quiz is completed.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (didCompleteRef.current) return false;
      stopQuizAudio();
      toast(t('daily.completeToLeave'));
      return true;
    });
    return () => sub.remove();
  }, [stopQuizAudio]);

  // Detect abandonment: unmount without completion after at least one
  // answer. Reads category from a ref so a query refetch (which would
  // change `dailyCategoryName`) does not trigger this cleanup mid-session.
  useEffect(() => {
    return () => {
      if (
        !didCompleteRef.current &&
        sessionStateRef.current.answeredCount > 0
      ) {
        logEvent(LOG_EVENTS.DAILY_QUIZ_ABANDONED, {
          quizIndex: sessionStateRef.current.quizIndex,
          answeredCount: sessionStateRef.current.answeredCount,
          isFirstTime,
          durationMs: Date.now() - startedAt,
        });
        const category = dailyCategoryNameRef.current;
        if (category) {
          logEvent(LOG_EVENTS.CATEGORY_ABANDONED, {
            category,
            surface: 'daily',
            answeredCount: sessionStateRef.current.answeredCount,
          });
        }
      }
    };
  }, [isFirstTime, startedAt]);

  // Audio effects
  useEffect(() => {
    if (!isTimerRunning) {
      stopTimerAudio();
      return;
    }

    safeSetAudioPlayerLoop(audioPianoPlayer, true);
    if (typeof volume === 'number' && !isNaN(volume)) {
      safeSetAudioPlayerVolume(audioPianoPlayer, volume);
    }
    if (!safeIsAudioPlayerPlaying(audioPianoPlayer)) {
      safePlayAudioPlayer(audioPianoPlayer);
    }

    if (isDanger) {
      if (!safeIsAudioPlayerPlaying(audioTimerPlayer)) {
        safePlayAudioPlayer(audioTimerPlayer);
      }
      return;
    }

    safePauseAudioPlayer(audioTimerPlayer);
    safeSeekAudioPlayerToStart(audioTimerPlayer);
  }, [
    audioPianoPlayer,
    audioTimerPlayer,
    isDanger,
    isTimerRunning,
    stopTimerAudio,
    volume,
  ]);

  const handlePressAnswer = useCallback(
    (option: QuizOptionWithDescription) => {
      if (!currentQuiz?._id) return;

      setIsTimerRunning(false);
      setSelectedOption(option);

      const optionIndex = currentQuiz.options.findIndex(
        (o) => o.key === option.key,
      );
      const isCorrect = !!option.isAnswer;

      logEvent(isCorrect ? LOG_EVENTS.QUIZ_CORRECT : LOG_EVENTS.QUIZ_WRONG, {
        quizId: currentQuiz._id,
        level: currentQuiz.level,
        category: dailyCategoryName,
        timeSpentMs,
        surface: 'daily',
        questionIndex: quizIndex,
      });

      setResults((prev) => [
        ...prev,
        {
          quizId: currentQuiz._id,
          isCorrect,
          // -1 for a timeout, so the server never grades it as an answer.
          selectedOptionIndex: optionIndex,
          timeSpentMs,
        },
      ]);
    },
    [currentQuiz, timeSpentMs, dailyCategoryName, quizIndex],
  );

  // Timer setup
  useEffect(() => {
    if (timerRef.current) {
      timerRef.current.stop();
    }

    if (isTimerRunning) {
      timerRef.current = createSafeTimer(
        timer,
        (secondsRemaining) => {
          setTimer(secondsRemaining);
        },
        () => {
          setIsTimerRunning(false);
          const wrongOption: QuizOptionWithDescription = {
            key: 'wrong',
            isAnswer: false,
            description: 'timeout',
          };
          handlePressAnswer(wrongOption);
        },
      );
      timerRef.current.start();
    }

    return () => {
      if (timerRef.current) {
        timerRef.current.stop();
      }
    };
  }, [handlePressAnswer, isTimerRunning, timer]);

  const handleFinish = useCallback(async () => {
    if (didCompleteRef.current || isFinishingRef.current) return;
    isFinishingRef.current = true;
    stopQuizAudio();

    const convexResults = results.map((r) => ({
      quizId: r.quizId as Id<'quizzes'>,
      isCorrect: r.isCorrect,
      selectedOptionIndex: r.selectedOptionIndex,
      timeSpentMs: r.timeSpentMs,
    }));

    if (isAuthenticated) {
      // 로그인 유저: 서버에 저장
      try {
        const outcome = await completeDailyChallenge({results: convexResults});
        // STREAK_STATE always fires so retention cohorts can track every
        // outcome (first/continued/freeze_used/broken/same_day). Specific
        // events stay for funnel cards that filter on them directly.
        if (outcome?.streakOutcome) {
          logEvent(LOG_EVENTS.STREAK_STATE, {outcome: outcome.streakOutcome});
        }
        if (outcome?.streakOutcome === 'freeze_used') {
          logEvent(LOG_EVENTS.STREAK_FREEZE_USED);
        } else if (outcome?.streakOutcome === 'broken') {
          logEvent(LOG_EVENTS.STREAK_BROKEN);
        }
      } catch (error) {
        logError(error, 'Failed to save daily challenge results');
        isFinishingRef.current = false;
        return;
      }
    } else {
      // 비로그인 유저: 로컬에 저장 (로그인 시 서버 동기화용)
      const today = new Date().toISOString().split('T')[0];
      storage.set(
        Storage.GuestDailyResult,
        JSON.stringify({date: today, results: convexResults}),
      );
    }

    // 첫 데일리 완료 표시
    storage.set(Storage.DidFinishFirstDaily, true);
    didCompleteRef.current = true;
    setPreventLeaving(false);

    const totalTimeMs = results.reduce((sum, r) => sum + r.timeSpentMs, 0);
    const correctCount = results.filter((r) => r.isCorrect).length;
    const wrongCount = Math.max(0, DAILY_QUIZ_COUNT - correctCount);
    saveDailyCompletionSummary({
      correctCount,
      totalQuestions: DAILY_QUIZ_COUNT,
      wrongCount,
    });

    // 첫 데일리 = 사실상 온보딩 종료 (별도 온보딩 스크린이 없음 — PMF #70)
    if (isFirstTime) {
      logEvent(LOG_EVENTS.ONBOARDING_FINISHED, {
        correctCount,
        durationMs: Date.now() - startedAt,
      });
    }

    logEvent(LOG_EVENTS.DAILY_QUIZ_COMPLETED, {
      isFirstTime,
      correctCount,
      totalQuestions: DAILY_QUIZ_COUNT,
      totalTimeMs,
      sessionDurationMs: Date.now() - startedAt,
    });

    setFinishRouteParams({correctCount, totalTimeMs});
  }, [
    stopQuizAudio,
    results,
    isAuthenticated,
    completeDailyChallenge,
    isFirstTime,
    startedAt,
  ]);

  const handleContinue = useCallback(async () => {
    if (isContinueProcessing) return;
    setIsContinueProcessing(true);

    if (timerRef.current) {
      timerRef.current.stop();
    }

    const isLastQuiz = quizIndex >= quizzes.length - 1;

    try {
      if (isLastQuiz) {
        await handleFinish();
      } else {
        setTimer(QUIZ_TIME_IN_SECONDS);
        setIsTimerRunning(true);
        setSelectedOption(null);
        setQuizIndex((prev) => prev + 1);
      }
    } finally {
      setTimeout(() => {
        setIsContinueProcessing(false);
      }, 300);
    }
  }, [quizIndex, quizzes.length, isContinueProcessing, handleFinish]);

  useEffect(() => {
    if (dailyChallenge === undefined || handledInvalidDailyRef.current) return;
    if (dailyChallenge && quizzes.length > 0 && currentQuiz) return;

    handledInvalidDailyRef.current = true;
    didCompleteRef.current = true;
    logError(
      new Error('Daily quiz payload is empty'),
      'DailyQuiz.emptyPayload',
    );
    let replaceHandle: ReturnType<typeof setTimeout> | undefined;
    const preventLeavingHandle = setTimeout(() => {
      setPreventLeaving(false);
      replaceHandle = setTimeout(() => replace(HOME_ROUTE), 0);
    }, 0);

    return () => {
      clearTimeout(preventLeavingHandle);
      if (replaceHandle) clearTimeout(replaceHandle);
    };
  }, [currentQuiz, dailyChallenge, quizzes.length, replace]);

  if (dailyChallenge === undefined || !currentQuiz) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
            gestureEnabled: false,
            headerBackButtonMenuEnabled: false,
          }}
        />
        <CustomLoadingIndicator />
      </>
    );
  }

  if (finishRouteParams) {
    return (
      <TransitionContainer>
        <Stack.Screen
          options={{
            headerShown: false,
            gestureEnabled: false,
            headerBackButtonMenuEnabled: false,
          }}
        />
        <CustomLoadingIndicator />
      </TransitionContainer>
    );
  }

  return (
    <Container
      contentContainerStyle={css`
        flex-grow: 1;
      `}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
          headerBackButtonMenuEnabled: false,
        }}
      />
      <Header
        style={css`
          padding-top: ${top + 8 + 'px'};
        `}
      >
        <ProgressBar progress={progress} />
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
          `}
        >
          <IconButton
            icon={
              volume === 1
                ? 'SpeakerHigh'
                : volume === 0
                  ? 'SpeakerSimpleSlash'
                  : 'SpeakerSimpleLow'
            }
            size="small"
            color="light"
            onPress={() => {
              if (volume === 1) {
                safeSetAudioPlayerVolume(audioPianoPlayer, 0);
                setVolume(0);
              } else if (volume === 0) {
                safeSetAudioPlayerVolume(audioPianoPlayer, 0.5);
                setVolume(0.5);
              } else {
                safeSetAudioPlayerVolume(audioPianoPlayer, 1);
                setVolume(1);
              }
            }}
            styles={{
              container: css`
                padding: 6px;
              `,
            }}
          />
          <View
            style={css`
              gap: 6px;
              flex-direction: row;
              align-items: center;
            `}
          >
            <ProgressCircle
              percentage={100 - (timer / QUIZ_TIME_IN_SECONDS) * 100}
            />
            <Typography.Heading5
              style={css`
                padding-top: 2px;
                color: ${isDanger ? theme.role.danger : theme.text.basic};
              `}
            >
              {timer}
            </Typography.Heading5>
          </View>
        </View>
      </Header>
      <Content>
        <QuizView
          style={css`
            flex: 1;
            align-self: stretch;
            padding: 32px 24px 0px;
          `}
          selectedOption={selectedOption}
          onContinue={handleContinue}
          onPressAnswer={handlePressAnswer}
          quiz={currentQuiz}
          timeSpentMs={timeSpentMs}
          allowStudyInDetail={false}
          isTimeRunningOut={isDanger}
        />
      </Content>
    </Container>
  );
}

const Container = styled(ScrollView)`
  background-color: ${({theme}) => theme.bg.basic};
  flex: 1;
  align-self: stretch;
`;

const TransitionContainer = styled.View`
  background-color: ${({theme}) => theme.bg.basic};
  flex: 1;
  align-self: stretch;
`;

const Header = styled.View`
  padding: 20px 18px;
  gap: 12px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Content = styled.View`
  flex: 1;
  align-self: stretch;
`;

export default withErrorBoundary(DailyQuizPage);
