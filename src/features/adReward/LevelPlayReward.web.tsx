import {useEffect, useRef} from 'react';
import {useRouter} from 'expo-router';
import {useMMKVBoolean} from 'react-native-mmkv';
import {useAudioPlayer} from 'expo-audio';

import CustomLoadingIndicator from '../../uis/CustomLoadingIndicator';
import {t} from '../../STRINGS';
import {AUDIO_RECHARGE_BULB} from '../../sounds';
import {Storage} from '../../utils/storage';
import {logEvent} from '../../utils/analytics';
import {logError} from '../../utils/error';
import {
  safePlayAudioPlayer,
  safeSeekAudioPlayerToStart,
} from '../../utils/audioPlayer';
import {useBulbManager} from '../../hooks/useBulbManager';

export default function LevelPlayReward(): JSX.Element {
  const router = useRouter();
  const [, setIsRewarded] = useMMKVBoolean(Storage.IsRewarded);
  const audioRechargeBulbPlayer = useAudioPlayer(AUDIO_RECHARGE_BULB);
  const {claimRecharge} = useBulbManager();
  const rewardedRef = useRef(false);

  useEffect(() => {
    if (rewardedRef.current) return;
    rewardedRef.current = true;

    const handleWebFallbackReward = async () => {
      try {
        // The server limits free web recharges per day.
        const {granted} = await claimRecharge('web');

        if (granted > 0) setIsRewarded(true);
        logEvent('handleBulbRecharge', {
          reward: 'bulb',
          count: granted,
          adProvider: 'web_fallback',
        });

        safeSeekAudioPlayerToStart(audioRechargeBulbPlayer);
        safePlayAudioPlayer(audioRechargeBulbPlayer);

        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      } catch (error) {
        logError(error, 'LevelPlayRewardWeb');
      }
    };

    void handleWebFallbackReward();
  }, [audioRechargeBulbPlayer, claimRecharge, router, setIsRewarded]);

  return <CustomLoadingIndicator text={t('common.loading')} />;
}
