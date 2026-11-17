import {toast} from '@backpackapp-io/react-native-toast';
import {useCallback} from 'react';
import {LOG_EVENTS, logEvent} from '../utils/analytics';
import {shouldSpendBulbForStandardQuiz} from '../utils/quizAccess';
import {t} from '../STRINGS';
import {useUserStore} from '../stores/userStore';
import {useAsync} from './useAsync';

type UpdateBulbCount = (
  count: number,
  operation?: 'set' | 'add' | 'subtract',
) => Promise<void>;

type Props = {
  bulbCount: number;
  quizCount: number | undefined;
  updateBulbCount: UpdateBulbCount;
  navigate: (href: '/quiz') => void;
};

export function useStandardQuizStart({
  bulbCount,
  quizCount,
  updateBulbCount,
  navigate,
}: Props): {
  startStandardQuiz: () => Promise<void | undefined>;
  isStartingStandardQuiz: boolean;
} {
  const startQuiz = useCallback(async () => {
    const {isPremium: hasPremiumAccess} = useUserStore.getState();
    if (!hasPremiumAccess && bulbCount <= 0) {
      logEvent(LOG_EVENTS.BULB_DEPLETED, {source: 'start_quiz'});
      toast.error(t('common.notEnoughBulbDesc'));
      return;
    }
    if (!quizCount) {
      toast.error(t('common.noQuizFound'));
      return;
    }

    if (shouldSpendBulbForStandardQuiz(hasPremiumAccess)) {
      await updateBulbCount(1, 'subtract');
    }

    navigate('/quiz');
  }, [bulbCount, navigate, quizCount, updateBulbCount]);

  const {execute: startStandardQuiz, loading: isStartingStandardQuiz} =
    useAsync(startQuiz);

  return {
    startStandardQuiz,
    isStartingStandardQuiz,
  };
}
