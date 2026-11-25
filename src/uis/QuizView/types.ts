import {StyleProp, ViewStyle} from 'react-native';
import {QuizWithDescriptions, QuizOptionWithDescription} from '../../types';

export type QuizViewProps = {
  style?: StyleProp<ViewStyle>;
  quiz: QuizWithDescriptions;
  onPressAnswer: (option: QuizOptionWithDescription) => void | Promise<void>;
  onContinue: () => void | Promise<void>;
  selectedOption: QuizOptionWithDescription | null;
  timeSpentMs: number;
  allowStudyInDetail?: boolean;
  isLastQuestion?: boolean;
  // Sends Martie into a panic while the timer is in its last quarter.
  isTimeRunningOut?: boolean;
};

export type QuizViewUIProps = {
  quiz: QuizWithDescriptions;
  onPressAnswer: (option: QuizOptionWithDescription) => void;
  isAnswerPending?: boolean;
  isTimeRunningOut?: boolean;
  bubbleAnimatedStyle: object;
  imageAnimatedStyle: object;
  buttonAnimatedStyle: object;
};
