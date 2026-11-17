import {Alert, Linking, Platform} from 'react-native';

import {t} from '../STRINGS';
import {APP_STORE_URLS} from './constants';
import {logEvent} from './analytics';
import {storage, Storage} from './storage';

const REVIEW_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REVIEW_ASK_COUNT = 3;

type ReviewReason = 'perfect_daily' | 'streak_milestone';

export function requestAppReviewIfEligible(reason: ReviewReason): void {
  const askCount = storage.getNumber(Storage.AppReviewAskCount) ?? 0;
  if (askCount >= MAX_REVIEW_ASK_COUNT) return;

  const lastAskedAt = storage.getNumber(Storage.AppReviewLastAskedAt);
  if (lastAskedAt && Date.now() - lastAskedAt < REVIEW_COOLDOWN_MS) return;

  storage.set(Storage.AppReviewLastAskedAt, Date.now());
  storage.set(Storage.AppReviewAskCount, askCount + 1);
  logEvent('app_review_prompt_shown', {reason});

  Alert.alert(t('reviewPrompt.title'), t('reviewPrompt.body'), [
    {
      text: t('common.cancel'),
      style: 'cancel',
      onPress: () => logEvent('app_review_prompt_dismissed', {reason}),
    },
    {
      text: t('reviewPrompt.action'),
      onPress: () => {
        logEvent('app_review_prompt_accepted', {reason});
        const storeUrl = Platform.select(APP_STORE_URLS);
        if (storeUrl) {
          void Linking.openURL(storeUrl);
        }
      },
    },
  ]);
}
