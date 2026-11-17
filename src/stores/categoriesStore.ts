import {create} from 'zustand';
import {devtools} from 'zustand/middleware';
import {immer} from 'zustand/middleware/immer';

type State = {
  selectedCategories: string[];
};

type Actions = {
  toggleCategory: (category: string) => void;
  clearCategories: () => void;
};

export const useCategoriesStore = create<State & Actions>()(
  devtools(
    immer((set) => ({
      selectedCategories: [],
      toggleCategory: (category) =>
        set(
          (state) => {
            const index = state.selectedCategories.indexOf(category)
            if (index > -1) {
              state.selectedCategories.splice(index, 1)
            } else {
              state.selectedCategories.push(category)
            }
          },
          false, // 상태 교체 대신 업데이트
          {type: "categories/toggle", category}
        ),
      clearCategories: () =>
        set(
          (state) => {
            state.selectedCategories = [];
          },
          true,
          {type: 'categories/clear'},
        ),
    })),
  ),
);
