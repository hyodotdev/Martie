import {QuizWithDescriptions, QuizOptionWithDescription} from '../../../types';

export type ResultProps = {
  quiz: QuizWithDescriptions;
  selectedOption: QuizOptionWithDescription;
  onContinue: () => void | Promise<void>;
  timeSpentMs: number;
  isContinuePending?: boolean;
  allowStudyInDetail?: boolean;
  isLastQuestion?: boolean;
};

export type ResultUIProps = {
  quiz: QuizWithDescriptions;
  selectedOption: QuizOptionWithDescription;
  onContinue: () => void | Promise<void>;
  isContinuePending: boolean;
  bubbleAnimatedStyle: object;
  imageAnimatedStyle: object;
  buttonAnimatedStyle: object;
  theme: any;
  isCorrect: boolean;
  allowStudyInDetail: boolean;
  isLastQuestion: boolean;
};
