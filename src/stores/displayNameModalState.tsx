import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';

interface DisplayNameModalState {
  visible: boolean;
}

interface DisplayNameModalAction {
  setVisible: (isVisible: boolean) => void;
}

export type DisplayNameStoreType = DisplayNameModalState &
  DisplayNameModalAction;

const initialState: DisplayNameModalState = {
  visible: false,
};

export const useDisplayNameModalStore = create<DisplayNameStoreType>()(
  immer((set) => ({
    ...initialState,
    setVisible: (isVisible) =>
      set((state) => {
        state.visible = isVisible;
      }),
  })),
);
