import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';

interface FirstQuizModalState {
  visible: boolean;
  wasShown: boolean;
  isTriggerPending: boolean;
}

interface FirstQuizModalAction {
  setVisible: (isVisible: boolean) => void;
  setTriggerPending: (isPending: boolean) => void;
}

export type FirstQuizModalStoreType = FirstQuizModalState &
  FirstQuizModalAction;

const initialState: FirstQuizModalState = {
  visible: false,
  wasShown: false,
  isTriggerPending: true,
};

export const useFirstQuizModalStore = create<FirstQuizModalStoreType>()(
  immer((set) => ({
    ...initialState,
    setVisible: (isVisible) =>
      set((state) => {
        state.visible = isVisible;
        if (isVisible) state.wasShown = true;
      }),
    setTriggerPending: (isPending) =>
      set((state) => {
        state.isTriggerPending = isPending;
      }),
  })),
);
