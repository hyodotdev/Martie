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
};

export type QuizViewUIProps = {
  quiz: QuizWithDescriptions;
  onPressAnswer: (option: QuizOptionWithDescription) => void;
  isAnswerPending?: boolean;
  bubbleAnimatedStyle: object;
  imageAnimatedStyle: object;
  buttonAnimatedStyle: object;
};
