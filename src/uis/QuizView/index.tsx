import {useEffect, useRef, useState} from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Result from './Result';
import {QuizOptionWithDescription} from '../../types';
import {logError} from '../../utils/error';
import QuizViewMobile from './QuizViewMobile';
import QuizViewTablet from './QuizViewTablet';
import {QuizViewProps} from './types';
import {useCPK} from 'cpk-ui';

const ANIM_DURATION = 500;
const ANIM_TRANSLATE_Y = 20;

function QuizView({
  style,
  quiz,
  onPressAnswer,
  onContinue,
  selectedOption,
  timeSpentMs,
  allowStudyInDetail = true,
  isLastQuestion = false,
}: QuizViewProps): JSX.Element {
  const {
    media: {isTablet},
  } = useCPK();
  const bubbleOpacity = useSharedValue(0);
  const bubbleTranslateY = useSharedValue(ANIM_TRANSLATE_Y);
  const imageOpacity = useSharedValue(0);
  const imageTranslateY = useSharedValue(ANIM_TRANSLATE_Y);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(ANIM_TRANSLATE_Y);

  // 현재 퀴즈 상태를 저장
  const [currentQuizState, setCurrentQuizState] = useState(quiz);
  // Track if continue has been pressed to prevent double-clicks
  const [isContinuePending, setIsContinuePending] = useState(false);
  const [isAnswerPending, setIsAnswerPending] = useState(false);
  const hasSubmittedAnswerRef = useRef(false);
  const hasSubmittedContinueRef = useRef(false);

  // quiz prop이 변경될 때만 currentQuizState 업데이트
  useEffect(() => {
    if (!selectedOption) {
      setCurrentQuizState(quiz);
      setIsContinuePending(false); // Reset state when quiz changes
      setIsAnswerPending(false);
      hasSubmittedAnswerRef.current = false;
      hasSubmittedContinueRef.current = false;
    }
  }, [quiz, selectedOption]);

  useEffect(() => {
    bubbleOpacity.value = withTiming(1, {duration: ANIM_DURATION});
    bubbleTranslateY.value = withTiming(0, {duration: ANIM_DURATION});

    setTimeout(() => {
      imageOpacity.value = withTiming(1, {duration: ANIM_DURATION});
      imageTranslateY.value = withTiming(0, {duration: ANIM_DURATION});
    }, ANIM_DURATION);

    setTimeout(() => {
      buttonOpacity.value = withTiming(1, {duration: ANIM_DURATION});
      buttonTranslateY.value = withTiming(0, {duration: ANIM_DURATION});
    }, ANIM_DURATION * 2);
  }, [
    bubbleOpacity,
    bubbleTranslateY,
    imageOpacity,
    imageTranslateY,
    buttonOpacity,
    buttonTranslateY,
  ]);

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{translateY: bubbleTranslateY.value}],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{translateY: imageTranslateY.value}],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{translateY: buttonTranslateY.value}],
  }));

  const handleAnswerPress = (option: QuizOptionWithDescription) => {
    const resetPendingAnswer = () => {
      hasSubmittedAnswerRef.current = false;
      setIsAnswerPending(false);
    };

    try {
      if (!option || hasSubmittedAnswerRef.current) return;

      hasSubmittedAnswerRef.current = true;
      setIsAnswerPending(true);
      const result = onPressAnswer(option);
      if (result && typeof result.then === 'function') {
        void result.catch((error) => {
          resetPendingAnswer();
          logError(error, 'QuizView.handleAnswerPress');
        });
      }
    } catch (error) {
      resetPendingAnswer();
      logError(error, 'QuizView.handleAnswerPress');
    }
  };

  const handleContinuePress = () => {
    const resetPendingContinue = () => {
      hasSubmittedContinueRef.current = false;
      setIsContinuePending(false);
    };

    if (isContinuePending || hasSubmittedContinueRef.current) return;

    hasSubmittedContinueRef.current = true;
    setIsContinuePending(true);
    try {
      const result = onContinue();
      if (result && typeof result.then === 'function') {
        void result
          .catch((error) => logError(error, 'QuizView.handleContinuePress'))
          .finally(resetPendingContinue);
      } else {
        void Promise.resolve().then(resetPendingContinue);
      }
    } catch (error) {
      logError(error, 'QuizView.handleContinuePress');
      resetPendingContinue();
    }
  };

  if (selectedOption) {
    return (
      <Result
        selectedOption={selectedOption}
        quiz={currentQuizState}
        timeSpentMs={timeSpentMs}
        onContinue={handleContinuePress}
        isContinuePending={isContinuePending}
        allowStudyInDetail={allowStudyInDetail}
        isLastQuestion={isLastQuestion}
      />
    );
  }

  const quizViewProps = {
    quiz,
    onPressAnswer: handleAnswerPress,
    isAnswerPending,
    bubbleAnimatedStyle,
    imageAnimatedStyle,
    buttonAnimatedStyle,
  };

  return isTablet ? (
    <QuizViewTablet {...quizViewProps} />
  ) : (
    <QuizViewMobile {...quizViewProps} />
  );
}

export default QuizView;
