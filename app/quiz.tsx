import {styled, css} from 'kstyled';
import {Stack, useNavigation, useRouter} from 'expo-router';
import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import ProgressBar from '../src/uis/ProgressBar';
import ProgressCircle from '../src/uis/ProgressCircle';
import {View, ScrollView} from 'react-native';
import {IconButton, Typography, useCPK} from 'cpk-ui';
import {
  QUIZ_LIMIT,
  QUIZ_PASSED_SCORE,
  QUIZ_TIME_IN_SECONDS,
} from '../src/utils/constants';
import QuizView from '../src/uis/QuizView';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';
import {QuizOptionWithDescription, QuizWithDescriptions} from '../src/types';
import {useAnswerStore} from '../src/stores/answersStore';
import {useMMKVNumber} from 'react-native-mmkv';
import {Storage} from '../src/utils/storage';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import {shuffle} from '../src/utils/array';
import {logError} from '../src/utils/error';
import {logEvent, LOG_EVENTS, logScreenView} from '../src/utils/analytics';
import {createSafeTimer} from '../src/utils/timerUtils';
import {useQuizzes} from '../src/hooks/useQuizzes';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAudioPlayer} from 'expo-audio';
import {AUDIO_PIANO, AUDIO_TIMER} from '../src/sounds';
import {
  safeIsAudioPlayerPlaying,
  safePauseAudioPlayer,
  safePlayAudioPlayer,
  safeSeekAudioPlayerToStart,
  safeSetAudioPlayerLoop,
  safeSetAudioPlayerVolume,
  stopAudioPlayer,
} from '../src/utils/audioPlayer';

type QuizPageProps = {
  quizzes: QuizWithDescriptions[];
  currentQuiz: QuizWithDescriptions;
  lastQuiz: QuizWithDescriptions;
  progress: number;
  point: number;
  hasPassed: boolean;
  quizIndex: number;
  setQuizIndex: (index: number) => void;
};

type PracticeFinishRouteParams = {
  point: number;
  hasPassed: boolean;
  lastQuizId?: string;
  lastQuizKey?: string;
  quizCount: number;
};

const HOME_ROUTE = '/(tabs)' as const;

function QuizPage({
  quizzes,
  currentQuiz,
  lastQuiz,
  progress,
  point,
  hasPassed,
  quizIndex,
  setQuizIndex,
}: Omit<QuizPageProps, 'onPlayNextLevel'>): JSX.Element {
  const audioTimerPlayer = useAudioPlayer(AUDIO_TIMER);
  const audioPianoPlayer = useAudioPlayer(AUDIO_PIANO);
  const [volume, setVolume] = useMMKVNumber(Storage.Volume);
  const {replace} = useRouter();
  const navigation = useNavigation();
  const {theme} = useCPK();
  const {top} = useSafeAreaInsets();
  const [timer, setTimer] = useState(QUIZ_TIME_IN_SECONDS);
  const {addAnswer} = useAnswerStore();
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [selectedOption, setSelectedOption] =
    useState<QuizOptionWithDescription | null>(null);
  const timeSpentMs = (QUIZ_TIME_IN_SECONDS - timer) * 1000;
  const [isContinueProcessing, setIsContinueProcessing] = useState(false);
  const timerRef = useRef<ReturnType<typeof createSafeTimer> | null>(null);
  const isDanger = timer <= QUIZ_TIME_IN_SECONDS / 4;
  const [finishRouteParams, setFinishRouteParams] =
    useState<PracticeFinishRouteParams | null>(null);

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
    const blurSub = navigation.addListener('blur', stopQuizSession);
    const beforeRemoveSub = navigation.addListener(
      'beforeRemove',
      stopQuizSession,
    );

    return () => {
      blurSub();
      beforeRemoveSub();
      stopQuizSession();
    };
  }, [navigation, stopQuizSession]);
  const handleFinish = useCallback(() => {
    stopQuizAudio();
    setIsTimerRunning(false);
    setSelectedOption(null);

    logEvent(LOG_EVENTS.PRACTICE_QUIZ_COMPLETED, {
      point,
      hasPassed,
      quizCount: quizzes.length,
      lastQuizId: lastQuiz._id,
    });
    setFinishRouteParams({
      point,
      hasPassed,
      lastQuizId: lastQuiz._id,
      lastQuizKey: lastQuiz.key,
      quizCount: quizzes.length,
    });
  }, [
    stopQuizAudio,
    point,
    hasPassed,
    quizzes.length,
    lastQuiz._id,
    lastQuiz.key,
  ]);

  useEffect(() => {
    if (!finishRouteParams) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        replace({
          pathname: '/quiz-final',
          params: {
            point: finishRouteParams.point.toString(),
            hasPassed: finishRouteParams.hasPassed.toString(),
            lastQuizId: finishRouteParams.lastQuizId,
            lastQuizKey: finishRouteParams.lastQuizKey,
            quizCount: finishRouteParams.quizCount.toString(),
          },
        });
      }, 80);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [finishRouteParams, replace]);

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
      if (safeIsAudioPlayerPlaying(audioTimerPlayer)) {
        return;
      }

      safePlayAudioPlayer(audioTimerPlayer);
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
      if (!currentQuiz?._id) return; // Add safety check

      setIsTimerRunning(false);
      setSelectedOption(option);

      const isCorrect = !!option.isAnswer;

      // Add answer to store
      addAnswer({
        quizId: currentQuiz._id,
        isCorrect,
      });

      logEvent(isCorrect ? LOG_EVENTS.QUIZ_CORRECT : LOG_EVENTS.QUIZ_WRONG, {
        quizId: currentQuiz._id,
        level: currentQuiz.level,
        surface: 'practice',
        questionIndex: quizIndex,
      });
    },
    [addAnswer, currentQuiz._id, currentQuiz.level, quizIndex],
  );

  // Set up the timer when component mounts or relevant state changes
  useEffect(() => {
    // Clean up any existing timer
    if (timerRef.current) {
      timerRef.current.stop();
    }

    // Only create a new timer if we should be running
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

    // Clean up on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        timerRef.current.stop();
      }
    };
  }, [handlePressAnswer, isTimerRunning, timer]);

  const handleContinue = useCallback(async () => {
    try {
      if (isContinueProcessing) return;

      setIsContinueProcessing(true);

      if (timerRef.current) {
        timerRef.current.stop();
      }

      const isLastQuiz = quizIndex >= quizzes.length - 1;

      if (isLastQuiz) {
        logEvent(LOG_EVENTS.PRACTICE_QUIZ_FINISH_REQUESTED, {
          point,
          hasPassed,
          quizIndex,
          quizCount: quizzes.length,
          lastQuizId: lastQuiz._id,
        });
        handleFinish();
      } else {
        const newIndex = quizIndex + 1;
        setTimer(QUIZ_TIME_IN_SECONDS);
        setIsTimerRunning(true);
        setSelectedOption(null);
        setQuizIndex(newIndex < quizzes.length ? newIndex : quizIndex);
      }

      setTimeout(() => {
        setIsContinueProcessing(false);
      }, 300);
    } catch (error) {
      logError(error, 'QuizPage.handleContinue');
      setIsContinueProcessing(false);
    }
  }, [
    quizIndex,
    quizzes.length,
    setQuizIndex,
    isContinueProcessing,
    handleFinish,
    point,
    hasPassed,
    lastQuiz._id,
  ]);

  if (finishRouteParams) {
    return (
      <TransitionContainer>
        <Stack.Screen options={{headerShown: false}} />
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
      scrollEventThrottle={16}
    >
      <Stack.Screen options={{headerShown: false}} />
      <Header
        style={css`
          padding-top: ${top + 8 + 'px'};
          justify-content: space-between;
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
              justify-content: center;
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
          isLastQuestion={quizIndex >= quizzes.length - 1}
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

function QuizPageContainer(): JSX.Element {
  const {quizzes, isLoading, lastQuiz} = useQuizzes();
  const {replace} = useRouter();
  const [isQuizChanging, setIsQuizChanging] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const {answers, clearAnswers} = useAnswerStore();
  const [initialLoading, setInitialLoading] = useState(true);
  const handledInvalidQuizRef = useRef(false);

  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'quiz',
        screen_class: 'Quiz',
      });
  }, []);

  // Memoize shuffled quizzes with safety check
  const shuffledQuizzes = useMemo(() => {
    if (!quizzes?.length) return [];

    // Take the last QUIZ_LIMIT items instead of the first ones
    const startIndex = Math.max(0, quizzes.length - QUIZ_LIMIT);
    const safeCopy = quizzes.slice(startIndex).map((quiz) => ({
      ...quiz,
      options: quiz.options?.length ? [...quiz.options] : [],
    }));

    return shuffle(safeCopy);
  }, [quizzes]);

  const {currentQuiz, progress, point, hasPassed} = useMemo(() => {
    if (!shuffledQuizzes?.length || quizIndex >= shuffledQuizzes.length) {
      return {
        currentQuiz: undefined,
        progress: 0,
        point: 0,
        hasPassed: false,
      };
    }

    try {
      const quiz = shuffledQuizzes[quizIndex];
      if (!quiz?._id || !quiz?.options?.length) {
        throw new Error('Invalid quiz data');
      }

      const correctAnswersCount = answers.filter(
        (answer) => answer.isCorrect,
      ).length;
      const maxPossibleScore = shuffledQuizzes.length;
      const pointOutOf100 = Math.round(
        (correctAnswersCount / maxPossibleScore) * 100,
      );

      return {
        currentQuiz: quiz,
        progress: Math.round((quizIndex / shuffledQuizzes.length) * 100),
        point: pointOutOf100,
        hasPassed: pointOutOf100 >= QUIZ_PASSED_SCORE,
      };
    } catch (error) {
      logError(error);

      return {
        currentQuiz: undefined,
        progress: 0,
        point: 0,
        hasPassed: false,
      };
    }
  }, [shuffledQuizzes, quizIndex, answers]);

  const screenHeader = <Stack.Screen options={{headerShown: false}} />;

  useEffect(() => {
    clearAnswers();
  }, [clearAnswers]);

  // 퀴즈 변경 시 로딩 상태 처리
  useEffect(() => {
    if (isQuizChanging) {
      const timer = setTimeout(() => {
        setIsQuizChanging(false);
      }, 1000); // 1초 후에 로딩 상태 해제

      return () => clearTimeout(timer);
    }
  }, [isQuizChanging]);

  useEffect(() => {
    // 초기 로딩 시뮬레이션
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialLoading || isQuizChanging || isLoading) return;
    if (handledInvalidQuizRef.current) return;

    if (!quizzes?.length) {
      handledInvalidQuizRef.current = true;
      logError(
        new Error('No practice quizzes available'),
        'QuizPage.noQuizzes',
      );
      replace(HOME_ROUTE);
      return;
    }

    if (!currentQuiz || !currentQuiz.options?.length) {
      handledInvalidQuizRef.current = true;
      logError(
        new Error(`Invalid practice quiz at index ${quizIndex}`),
        'QuizPage.invalidCurrentQuiz',
      );
      replace(HOME_ROUTE);
    }
  }, [
    currentQuiz,
    initialLoading,
    isLoading,
    isQuizChanging,
    quizIndex,
    quizzes?.length,
    replace,
  ]);

  // 로딩 상태 체크 (초기 로딩, 퀴즈 변경 중, 스토어 로딩 상태)
  if (initialLoading || isQuizChanging || isLoading || !quizzes?.length) {
    return (
      <>
        {screenHeader}
        <CustomLoadingIndicator />
      </>
    );
  }

  if (!currentQuiz?.options?.length || !currentQuiz) {
    return (
      <>
        {screenHeader}
        <CustomLoadingIndicator />
      </>
    );
  }

  return (
    <>
      {screenHeader}
      <QuizPage
        quizzes={shuffledQuizzes}
        lastQuiz={lastQuiz}
        currentQuiz={currentQuiz}
        progress={progress}
        point={point}
        hasPassed={hasPassed}
        quizIndex={quizIndex}
        setQuizIndex={setQuizIndex}
      />
    </>
  );
}

export default withErrorBoundary(QuizPageContainer);
