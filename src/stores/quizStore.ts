import {create} from "zustand"
import {immer} from "zustand/middleware/immer"
import {storage, Storage} from "../utils/storage"

interface QuizState {
  lastQuizKeyCursor: string | undefined
  setLastQuizKeyCursor: (cursor: string) => void
}

// Initialize state from MMKV storage
const initialCursor = storage.getString(Storage.LastQuizCursor) || undefined

const useQuizStore = create<QuizState>()(
  immer((set) => ({
    lastQuizKeyCursor: initialCursor,
    setLastQuizKeyCursor: (cursor) =>
      set((state) => {
        state.lastQuizKeyCursor = cursor
        
        // Persist to MMKV storage
        if (cursor) {
          storage.set(Storage.LastQuizCursor, cursor)
        } else {
          storage.remove(Storage.LastQuizCursor)
        }
      }),
  })),
)

export default useQuizStore
