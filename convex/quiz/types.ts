import {Id} from '../_generated/dataModel';

export type QuizOption = {
  key: string;
  description: string;
  isAnswer: boolean;
};

export type QuizData = {
  categoryId: Id<'categories'>;
  level: number;
  key: string;
  description: string;
  answerKey: string;
  answerDescription: string;
  options: QuizOption[];
};
