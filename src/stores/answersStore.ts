import {create} from 'zustand';

type Answer = {
  quizId: string;
  isCorrect: boolean;
};

interface AnswerStore {
  answers: Answer[];
  addAnswer: (answer: Answer) => void;
  clearAnswers: () => void;
}

export const useAnswerStore = create<AnswerStore>((set) => ({
  answers: [],
  addAnswer: (answer) =>
    set((state) => ({answers: [...state.answers, answer]})),
  clearAnswers: () => set({answers: []}),
}));
