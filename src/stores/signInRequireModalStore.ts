import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';

interface SignInRequireModalState {
  visible: boolean;
}

interface SignInRequireModalAction {
  setVisible: (isVisible: boolean) => void;
}

export type SignInModalStoreType = SignInRequireModalState &
  SignInRequireModalAction;

const initialState: SignInRequireModalState = {
  visible: false,
};

export const useSignInRequireModalStore = create<SignInModalStoreType>()(
  immer((set) => ({
    ...initialState,
    setVisible: (isVisible) =>
      set((state) => {
        state.visible = isVisible;
      }),
  })),
);
