/**
 * @name ReviewQuiz
 *
 * 오답 복습 화면 — 간격반복으로 재출제 + AI 챗 연결
 */
import {useState, useEffect, useCallback, useRef} from 'react';
import {View, ScrollView} from 'react-native';
import {Stack, useNavigation, useRouter} from 'expo-router';
import {Typography, useCPK} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {withErrorBoundary} from '../src/hoc/withErrorBoundary';
import {t, getLocale} from '../src/STRINGS';
import {useQuery, useMutation} from 'convex/react';
import {api} from '../convex/_generated/api';
import QuizView from '../src/uis/QuizView';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';
import ButtonMartie from '../src/uis/ButtonMartie';
import {ImpactFeedbackStyle} from 'expo-haptics';
import {QUIZ_TIME_IN_SECONDS} from '../src/utils/constants';
import {createSafeTimer} from '../src/utils/timerUtils';
import ProgressBar from '../src/uis/ProgressBar';
import ProgressCircle from '../src/uis/ProgressCircle';
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useMMKVNumber} from 'react-native-mmkv';
import {Storage} from '../src/utils/storage';
import type {QuizOptionWithDescription} from '../src/types';
import {toast} from '@backpackapp-io/react-native-toast';
import {IconButton} from 'cpk-ui';

const QUIZ_LANGUAGE_MAP: Record<string, 'en' | 'ko' | 'ja'> = {
  ko: 'ko',
  ja: 'ja',
  en: 'en',
};

function ReviewQuizPage(): JSX.Element {
  const {replace} = useRouter();
  const navigation = useNavigation();
  const {theme} = useCPK();
  const {top} = useSafeAreaInsets();
  const locale = getLocale();
  const quizLanguage = QUIZ_LANGUAGE_MAP[locale] || 'en';

  const pendingReviews = useQuery(api.reviewQueue.queries.getPendingReviews, {
    language: quizLanguage,
  });
  const submitReview = useMutation(api.reviewQueue.mutations.submitReview);

  const audioTimerPlayer = useAudioPlayer(AUDIO_TIMER);
  const audioPianoPlayer = useAudioPlayer(AUDIO_PIANO);
  const [volume, setVolume] = useMMKVNumber(Storage.Volume);

  const [quizIndex, setQuizIndex] = useState(0);
  const [timer, setTimer] = useState(QUIZ_TIME_IN_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [selectedOption, setSelectedOption] =
    useState<QuizOptionWithDescription | null>(null);
  const [isContinueProcessing, setIsContinueProcessing] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof createSafeTimer> | null>(null);

  const reviews = pendingReviews ?? [];
  const currentReview = reviews[quizIndex];
  const totalReviews = reviews.length;
  const progress =
    totalReviews > 0 ? Math.round((quizIndex / totalReviews) * 100) : 0;
  const isDanger = timer <= QUIZ_TIME_IN_SECONDS / 4;
  const reviewProgressAccessibilityLabel = currentReview
    ? t('discover.reviewProgressAccessibility', {
        current: quizIndex + 1,
        stage: currentReview.reviewStage + 1,
        total: totalReviews,
      })
    : '';
  const reviewTimerAccessibilityLabel = t('discover.reviewTimerAccessibility', {
    seconds: timer,
  });
  const currentVolume =
    typeof volume === 'number' && !Number.isNaN(volume) ? volume : 1;
  const volumeAccessibilityLabel =
    currentVolume === 1
      ? t('common.volumeHigh')
      : currentVolume === 0
        ? t('common.volumeMuted')
        : t('common.volumeMedium');

  const stopTimerAudio = useCallback(() => {
    safePauseAudioPlayer(audioTimerPlayer);
    safeSeekAudioPlayerToStart(audioTimerPlayer);
  }, [audioTimerPlayer]);

  const stopQuizAudio = useCallback(() => {
    stopTimerAudio();
    stopAudioPlayer(audioPianoPlayer);
  }, [audioPianoPlayer, stopTimerAudio]);

  const stopQuizSession = useCallback(() => {
    if (timerRef.current) timerRef.current.stop();
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

  // Audio
  useEffect(() => {
    if (!currentReview) {
      stopQuizAudio();
      return;
    }

    if (!isTimerRunning) {
      stopTimerAudio();
      return;
    }

    safeSetAudioPlayerLoop(audioPianoPlayer, true);
    safeSetAudioPlayerVolume(audioPianoPlayer, currentVolume);
    if (!safeIsAudioPlayerPlaying(audioPianoPlayer)) {
      safePlayAudioPlayer(audioPianoPlayer);
    }

    if (isDanger && !safeIsAudioPlayerPlaying(audioTimerPlayer)) {
      safePlayAudioPlayer(audioTimerPlayer);
      return;
    }

    safePauseAudioPlayer(audioTimerPlayer);
    safeSeekAudioPlayerToStart(audioTimerPlayer);
  }, [
    audioPianoPlayer,
    audioTimerPlayer,
    currentVolume,
    currentReview,
    isDanger,
    isTimerRunning,
    stopQuizAudio,
    stopTimerAudio,
  ]);

  const handlePressAnswer = useCallback(
    (option: QuizOptionWithDescription) => {
      if (!currentReview) return;
      setIsTimerRunning(false);
      setSelectedOption(option);
    },
    [currentReview],
  );

  // Timer
  useEffect(() => {
    if (timerRef.current) timerRef.current.stop();

    if (isTimerRunning && currentReview) {
      timerRef.current = createSafeTimer(
        timer,
        (s) => setTimer(s),
        () => {
          setIsTimerRunning(false);
          handlePressAnswer({
            key: 'wrong',
            isAnswer: false,
            description: 'timeout',
          });
        },
      );
      timerRef.current.start();
    }

    return () => {
      if (timerRef.current) timerRef.current.stop();
    };
  }, [handlePressAnswer, isTimerRunning, timer, currentReview]);

  const handleContinue = useCallback(async () => {
    if (isContinueProcessing || !currentReview) return;
    setIsContinueProcessing(true);

    if (timerRef.current) timerRef.current.stop();

    const isCorrect = selectedOption?.isAnswer ?? false;

    // 복습 결과 서버에 전송
    let didMaster = false;
    try {
      const result = await submitReview({
        reviewId: currentReview.reviewId as any,
        isCorrect,
      });
      if (result?.mastered) {
        didMaster = true;
        setMasteredCount((p) => p + 1);
      }
    } catch {
      // 에러 무시
    }

    const isLast = quizIndex >= totalReviews - 1;
    if (isLast) {
      stopQuizAudio();

      toast.success(
        didMaster || masteredCount > 0
          ? t('discover.reviewMastered')
          : t('discover.reviewReset'),
      );
      replace('/(tabs)/articles');
    } else {
      setQuizIndex((p) => p + 1);
      setTimer(QUIZ_TIME_IN_SECONDS);
      setIsTimerRunning(true);
      setSelectedOption(null);
    }

    setTimeout(() => setIsContinueProcessing(false), 300);
  }, [
    quizIndex,
    totalReviews,
    currentReview,
    selectedOption,
    submitReview,
    isContinueProcessing,
    replace,
    stopQuizAudio,
    masteredCount,
  ]);

  if (!pendingReviews || totalReviews === 0) {
    return (
      <>
        <Stack.Screen
          options={{headerShown: true, title: t('discover.reviewTitle')}}
        />
        {!pendingReviews ? (
          <CustomLoadingIndicator />
        ) : (
          <EmptyContainer>
            <Typography.Heading5
              accessibilityLabel={t('discover.reviewEmpty')}
              accessibilityRole="text"
            >
              {t('discover.reviewEmpty')}
            </Typography.Heading5>
            <ButtonMartie
              hapticFeedback={ImpactFeedbackStyle.Soft}
              onPress={() => replace('/(tabs)/articles')}
              text={t('common.return')}
              borderRadius={12}
              styles={{
                container: css`
                  height: 48px;
                  width: 200px;
                  border-width: 0;
                `,
                text: css`
                  font-size: 16px;
                  font-weight: bold;
                `,
              }}
            />
          </EmptyContainer>
        )}
      </>
    );
  }

  if (!currentReview) {
    return (
      <>
        <Stack.Screen options={{headerShown: false}} />
        <CustomLoadingIndicator />
      </>
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
      <Stack.Screen options={{headerShown: false}} />
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
            gap: 8px;
          `}
        >
          <StageBadge
            accessible={true}
            accessibilityLabel={reviewProgressAccessibilityLabel}
            accessibilityRole="text"
          >
            <Typography.Body4
              style={css`
                font-weight: 700;
              `}
            >
              {t('discover.reviewStage', {
                stage: currentReview.reviewStage + 1,
              })}
            </Typography.Body4>
          </StageBadge>
          <IconButton
            icon={
              currentVolume === 1
                ? 'SpeakerHigh'
                : currentVolume === 0
                  ? 'SpeakerSimpleSlash'
                  : 'SpeakerSimpleLow'
            }
            size="small"
            color="light"
            onPress={() => {
              if (currentVolume === 1) {
                safeSetAudioPlayerVolume(audioPianoPlayer, 0);
                setVolume(0);
              } else if (currentVolume === 0) {
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
            accessibilityLabel={volumeAccessibilityLabel}
            touchableHighlightProps={{
              accessibilityHint: t('common.changeVolume'),
            }}
          />
          <View
            accessible={true}
            accessibilityLabel={reviewTimerAccessibilityLabel}
            accessibilityRole="timer"
            style={css`
              flex-direction: row;
              align-items: center;
              gap: 6px;
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
            padding: 32px 24px 0;
          `}
          selectedOption={selectedOption}
          onContinue={handleContinue}
          onPressAnswer={handlePressAnswer}
          quiz={currentReview.quiz as any}
          timeSpentMs={(QUIZ_TIME_IN_SECONDS - timer) * 1000}
        />
      </Content>
    </Container>
  );
}

const Container = styled(ScrollView)`
  background-color: ${({theme}) => theme.bg.basic};
  flex: 1;
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

const EmptyContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 20px;
`;

const StageBadge = styled.View`
  background-color: rgba(0, 0, 0, 0.05);
  padding: 4px 10px;
  border-radius: 10px;
`;

export default withErrorBoundary(ReviewQuizPage);
