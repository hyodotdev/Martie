/**
 * @name Result
 *
 * 퀴즈 결과 메인 컴포넌트
 * 화면 크기에 따라 모바일 또는 태블릿 버전을 렌더링
 */
import {useCPK} from 'cpk-ui';
import {useEffect, useRef} from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {useConvexAuth, useMutation} from 'convex/react';
import {api} from '../../../../convex/_generated/api';
import {useAudioPlayer} from 'expo-audio';
import {AUDIO_CORRECT, AUDIO_INCORRECT} from '../../../sounds';

import {ResultProps} from './types';
import ResultMobile from './ResultMobile';
import ResultTablet from './ResultTablet';

// 애니메이션 지속 시간 상수
const ANIM_DURATION = 300;

function Result({
  selectedOption,
  quiz,
  onContinue,
  timeSpentMs,
  isContinuePending = false,
  allowStudyInDetail = true,
  isLastQuestion = false,
}: ResultProps): JSX.Element {
  const audioCorrectPlayer = useAudioPlayer(AUDIO_CORRECT);
  const audioIncorrectPlayer = useAudioPlayer(AUDIO_INCORRECT);
  const {
    theme,
    media: {isTablet},
  } = useCPK();

  // 애니메이션 값
  const bubbleOpacity = useSharedValue(0);
  const bubbleTranslateY = useSharedValue(20);
  const imageOpacity = useSharedValue(0);
  const imageTranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const imageScale = useSharedValue(1);
  const imageRotate = useSharedValue(0);

  // 비즈니스 로직
  const isCorrect = selectedOption.isAnswer || false;
  const saveQuizResult = useMutation(api.quizResult.mutation.saveQuizResult);
  const hasSavedResult = useRef(false);
  const {isAuthenticated} = useConvexAuth();

  // 사운드 효과 재생
  useEffect(() => {
    if (isCorrect) {
      audioCorrectPlayer.seekTo(0);
      audioCorrectPlayer.play();
      return;
    }
    audioIncorrectPlayer.seekTo(0);
    audioIncorrectPlayer.play();
  }, [audioCorrectPlayer, audioIncorrectPlayer, isCorrect]);

  // 퀴즈 결과 API 저장
  useEffect(() => {
    const recordResult = async () => {
      if (hasSavedResult.current) return;

      try {
        isAuthenticated &&
          (await saveQuizResult({
            quizId: quiz._id,
            isCorrect: !!selectedOption.isAnswer,
            selectedOptionIndex: quiz.options.findIndex(
              (opt) => opt.key === selectedOption.key,
            ),
            timeSpentMs,
          }));

        hasSavedResult.current = true;
      } catch (error) {
        console.error('Failed to save quiz result:', error);
      }
    };

    recordResult();
  }, [quiz, selectedOption, saveQuizResult, timeSpentMs, isAuthenticated]);

  // 애니메이션 설정
  useEffect(() => {
    const duration = isCorrect ? ANIM_DURATION : ANIM_DURATION * 1.5;

    if (isCorrect) {
      imageScale.value = withSequence(
        withTiming(1.2, {duration: 350, easing: Easing.out(Easing.ease)}),
        withTiming(1, {duration: 350, easing: Easing.out(Easing.ease)}),
      );
      imageRotate.value = withSequence(
        withTiming(0.1, {duration: 150, easing: Easing.ease}),
        withTiming(-0.1, {duration: 200, easing: Easing.ease}),
        withTiming(0, {duration: 150, easing: Easing.ease}),
      );
    } else {
      imageRotate.value = withSequence(
        withTiming(0.2, {duration: 100, easing: Easing.ease}),
        withTiming(-0.2, {duration: 100, easing: Easing.ease}),
        withTiming(0.2, {duration: 100, easing: Easing.ease}),
        withTiming(0, {duration: 100, easing: Easing.ease}),
      );
      imageScale.value = withSequence(
        withTiming(0.9, {duration: 150}),
        withTiming(1, {duration: 150}),
      );
    }

    bubbleOpacity.value = withTiming(1, {duration});
    bubbleTranslateY.value = withTiming(0, {duration});
    imageOpacity.value = withTiming(1, {duration});
    imageTranslateY.value = withTiming(0, {duration});
    buttonOpacity.value = withTiming(1, {duration});
    buttonTranslateY.value = withTiming(0, {duration});
  }, [
    bubbleOpacity,
    bubbleTranslateY,
    imageOpacity,
    imageTranslateY,
    buttonOpacity,
    buttonTranslateY,
    imageScale,
    imageRotate,
    isCorrect,
  ]);

  // 애니메이션 스타일
  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{translateY: bubbleTranslateY.value}],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      {translateY: imageTranslateY.value},
      {scale: imageScale.value},
      {rotate: `${imageRotate.value}rad`},
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{translateY: buttonTranslateY.value}],
  }));

  // 화면 크기에 따라 적절한 컴포넌트 렌더링
  return isTablet ? (
    <ResultTablet
      quiz={quiz}
      selectedOption={selectedOption}
      onContinue={onContinue}
      isContinuePending={isContinuePending || false}
      bubbleAnimatedStyle={bubbleAnimatedStyle}
      imageAnimatedStyle={imageAnimatedStyle}
      buttonAnimatedStyle={buttonAnimatedStyle}
      theme={theme}
      isCorrect={isCorrect}
      allowStudyInDetail={allowStudyInDetail}
      isLastQuestion={isLastQuestion}
    />
  ) : (
    <ResultMobile
      quiz={quiz}
      selectedOption={selectedOption}
      onContinue={onContinue}
      isContinuePending={isContinuePending || false}
      bubbleAnimatedStyle={bubbleAnimatedStyle}
      imageAnimatedStyle={imageAnimatedStyle}
      buttonAnimatedStyle={buttonAnimatedStyle}
      theme={theme}
      isCorrect={isCorrect}
      allowStudyInDetail={allowStudyInDetail}
      isLastQuestion={isLastQuestion}
    />
  );
}

export default Result;
