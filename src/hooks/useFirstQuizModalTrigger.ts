import {useEffect} from 'react';
import {usePathname} from 'expo-router';
import {useIsFocused} from 'expo-router/react-navigation';
import {useMMKVBoolean} from 'react-native-mmkv';
import {useConvexAuth, useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {Storage} from '../utils/storage';
import {isGuestDailyCompletedToday} from '../utils/guestDaily';
import {useFirstQuizModalStore} from '../stores/firstQuizModalStore';
import {getLocale} from '../STRINGS';
import {canShowFirstQuizModalOnPath} from '../utils/firstQuizModal';

const QUIZ_LANGUAGE_MAP: Record<string, 'en' | 'ko' | 'ja'> = {
  ko: 'ko',
  ja: 'ja',
  en: 'en',
};

const TRIGGER_DELAY_MS = 600;

/**
 * Shows the first-quiz bottom sheet once per session for users who have
 * never completed a daily quiz. Used by both Mobile and Tablet home tabs
 * so the trigger criteria stay in sync.
 *
 * Guards:
 *  - Home tab must be focused (avoids the modal popping over other tabs).
 *  - Zustand `wasShown` flag prevents repeat triggers across remounts.
 *  - Persistent `DidFinishFirstDaily` flag prevents triggers for returning users.
 *  - Live `dailyChallenge.isCompleted` and guest-side `Storage.GuestDailyResult`
 *    are both checked, so a finished daily blocks the modal in either auth state.
 */
export function useFirstQuizModalTrigger(): void {
  const isFocused = useIsFocused();
  const pathname = usePathname();
  const canShowOnPath = canShowFirstQuizModalOnPath(pathname);
  const setFirstQuizModalVisible = useFirstQuizModalStore(
    (state) => state.setVisible,
  );
  const firstQuizModalWasShown = useFirstQuizModalStore(
    (state) => state.wasShown,
  );
  const setFirstQuizModalTriggerPending = useFirstQuizModalStore(
    (state) => state.setTriggerPending,
  );
  const [didFinishFirstDaily] = useMMKVBoolean(Storage.DidFinishFirstDaily);
  const {isAuthenticated, isLoading: isAuthLoading} = useConvexAuth();
  const locale = getLocale();
  const quizLanguage = QUIZ_LANGUAGE_MAP[locale] || 'en';
  const dailyChallenge = useQuery(
    api.dailyChallenge.queries.getToday,
    isAuthLoading || !canShowOnPath ? 'skip' : {language: quizLanguage},
  );

  useEffect(() => {
    if (!isFocused) return;
    if (!canShowOnPath) return;
    if (isAuthLoading || dailyChallenge === undefined) {
      setFirstQuizModalTriggerPending(true);
      return;
    }
    if (
      firstQuizModalWasShown ||
      didFinishFirstDaily ||
      dailyChallenge === null ||
      dailyChallenge.isCompleted ||
      (!isAuthenticated && isGuestDailyCompletedToday())
    ) {
      setFirstQuizModalTriggerPending(false);
      return;
    }
    setFirstQuizModalTriggerPending(true);
    const handle = setTimeout(() => {
      setFirstQuizModalVisible(true);
      setFirstQuizModalTriggerPending(false);
    }, TRIGGER_DELAY_MS);
    return () => clearTimeout(handle);
  }, [
    isFocused,
    canShowOnPath,
    firstQuizModalWasShown,
    didFinishFirstDaily,
    isAuthLoading,
    dailyChallenge,
    isAuthenticated,
    setFirstQuizModalVisible,
    setFirstQuizModalTriggerPending,
  ]);
}
