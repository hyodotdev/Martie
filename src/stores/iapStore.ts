/**
 * @name useUserStore
 *
 * expo-iap의 getAvailablePurchases를 통해 프리미엄 상태를 글로벌로 관리하는 Zustand 스토어
 * CPK 스타일 가이드 및 구조 준수
 */
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';

interface UserState {
  isPremium: boolean;
  setIsPremium: (isPremium: boolean) => void;
}

export const useUserStore = create<UserState>()(
  immer((set) => ({
    isPremium: false,
    setIsPremium: (isPremium) =>
      set((state) => {
        state.isPremium = isPremium;
      }),
  })),
);
