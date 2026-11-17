import {Id} from './_generated/dataModel';

export type QuizOption = {
  key: string;
  isAnswer?: boolean; // optional로 변경
};

export type QuizData = {
  categoryId: Id<'categories'>;
  level: number;
  key: string;
  answerKey: string;
  indexes: string[];
  options: QuizOption[];
};
