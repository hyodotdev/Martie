import {DataModel, Doc} from '../convex/_generated/dataModel';

export type Quiz = Doc<'quizzes'> & {
  options: {
    key: string;
    isAnswer?: boolean;
  }[];
};

// 기본 QuizOption 타입 (quizzes 테이블에 맞춤)
export type QuizOption = {
  key: string;
  isAnswer?: boolean;
};

// 퀴즈에 텍스트 데이터를 포함한 확장된 타입 (UI용)
export type QuizOptionWithDescription = {
  key: string;
  isAnswer?: boolean;
  description: string;
};

export type QuizWithDescriptions = Omit<Quiz, 'options'> & {
  description: string;
  answerDescription: string;
  options: QuizOptionWithDescription[];
  creatorName?: string;
  creatorAvatarUrl?: string;
};

export type QuizResult = Doc<'quizResults'>;

// Enhanced quiz result type that extends the base QuizResult
export type QuizResultWithDetails = QuizResult & {
  quizLevel: number | null;
  quizTitle: string | null;
  quizStats: {
    attempts: number;
    correct: number;
    accuracy: number;
  };
  categoryName?: string;
};

export type ChatMessage = Omit<DataModel['chats']['document'], 'author'>;
