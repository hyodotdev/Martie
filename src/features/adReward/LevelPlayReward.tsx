import {useEffect, useEffectEvent} from 'react';
import {useAudioPlayer} from 'expo-audio';
import {useRouter} from 'expo-router';
import {useMMKVBoolean} from 'react-native-mmkv';
import {LevelPlay, LevelPlayRewardedAd} from 'unity-levelplay-mediation';
import {useQuery} from 'convex/react';
import {api} from '../../../convex/_generated/api';

import {AUDIO_RECHARGE_BULB} from '../../sounds';
import {logEvent} from '../../utils/analytics';
import {Storage} from '../../utils/storage';
import {t} from '../../STRINGS';
import {logError} from '../../utils/error';
import CustomLoadingIndicator from '../../uis/CustomLoadingIndicator';
import {useBulbManager, type RechargeReason} from '../../hooks/useBulbManager';
import {levelPlayConfig} from '../../utils/levelPlayConfig';
import {REWARD_USER_PARAM} from '../../../convex/utils/levelPlay';
import {initializeMobileAds} from '../../utils/mobileAdsConfig';
import {useAdConsentStore} from '../../stores/adConsentStore';
import {
  safePlayAudioPlayer,
  safeSeekAudioPlayerToStart,
} from '../../utils/audioPlayer';

const REWARDED_SERVER_PARAMS = 'LevelPlay_Rewarded_Server_Params';

export default function LevelPlayReward(): JSX.Element {
  const router = useRouter();
  const [, setIsRewarded] = useMMKVBoolean(Storage.IsRewarded);
  const player = useAudioPlayer(AUDIO_RECHARGE_BULB);
  const {claimRecharge} = useBulbManager();
  const currentUser = useQuery(api.user.queries.currentUser);
  const canRequestAds = useAdConsentStore((state) => state.canRequestAds);

  const leave = useEffectEvent(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  });
  const recharge = useEffectEvent(async (reason: RechargeReason) => {
    // The server decides the grant. With LevelPlay callbacks configured, a
    // completed ad is credited by the callback and arrives as `pending`.
    const {granted: amount, pending} = await claimRecharge(reason);
    if (amount <= 0 && !pending) return;
    setIsRewarded(true);
    safeSeekAudioPlayerToStart(player);
    safePlayAudioPlayer(player);
    logEvent('handleBulbRecharge', {
      reward: 'bulb',
      count: amount,
      adProvider: 'levelplay',
      reason,
    });
  });

  // Server-to-server rewards are keyed to the signed-in account: the user id
  // travels as the `custom_userId` callback param. Guests clear it so a
  // previous account is never credited.
  const attachRewardUser = useEffectEvent(async (): Promise<boolean> => {
    const userId = currentUser?._id;
    try {
      await LevelPlay.setMetaData(
        REWARDED_SERVER_PARAMS,
        userId ? [`${REWARD_USER_PARAM}=${userId}`] : [],
      );
      if (!userId) return false;
      await LevelPlay.setDynamicUserId(userId);
      return true;
    } catch (error) {
      logError(error, 'levelplay_user_id');
      return false;
    }
  });

  useEffect(() => {
    if (canRequestAds === null) return;
    let cancelled = false;
    let finished = false;
    let closed = false;
    let showRequested = false;
    let rewardPromise: Promise<void> | null = null;
    let ad: LevelPlayRewardedAd | null = null;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let userAttached = false;

    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      clearTimeout(loadTimer);
      clearTimeout(closeTimer);
      leave();
    };
    const grant = (reason: RechargeReason) => {
      if (cancelled || finished) return Promise.resolve();
      rewardPromise ??= recharge(reason).catch((error: unknown) => {
        logError(error, 'levelplay_reward_error');
      });
      return rewardPromise;
    };
    const fallback = (error: unknown) => {
      if (cancelled || finished) return;
      clearTimeout(loadTimer);
      logError(error, 'levelplay_reward_unavailable');
      logEvent('ad_load_failed', {
        adProvider: 'levelplay',
        error: String(error),
      });
      // Preserve free recharges when an ad cannot be served.
      void grant('unavailable').then(finish);
    };

    if (!canRequestAds) {
      void grant('consent_unavailable').then(finish);
    } else {
      loadTimer = setTimeout(
        () => fallback(new Error('Ad load timed out')),
        20000,
      );
      void initializeMobileAds()
        .then(async () => {
          if (cancelled || finished || rewardPromise) return;
          userAttached = await attachRewardUser();
          if (cancelled || finished || rewardPromise) return;
          ad = new LevelPlayRewardedAd(levelPlayConfig.rewardedAdUnitId);
          ad.setListener({
            onAdLoaded: (info) => {
              if (cancelled || finished || rewardPromise || showRequested)
                return;
              showRequested = true;
              logEvent('ad_loaded', {
                adProvider: 'levelplay',
                network: info.adNetwork,
              });
              void ad?.showAd().catch(fallback);
            },
            onAdLoadFailed: fallback,
            onAdDisplayed: (info) => {
              clearTimeout(loadTimer);
              logEvent('ad_displayed', {
                adProvider: 'levelplay',
                network: info.adNetwork,
              });
            },
            onAdDisplayFailed: fallback,
            onAdRewarded: (_reward, info) => {
              if (cancelled || finished) return;
              logEvent('ad_rewarded', {
                adProvider: 'levelplay',
                network: info.adNetwork,
              });
              // Without the account on the ad, the server callback cannot
              // credit it, so claim it like an ad that could not be shown.
              void grant(userAttached ? 'completed' : 'unavailable').then(
                () => {
                  if (closed) finish();
                },
              );
            },
            onAdClosed: () => {
              if (cancelled || finished) return;
              closed = true;
              clearTimeout(loadTimer);
              if (rewardPromise) void rewardPromise.then(finish);
              else closeTimer = setTimeout(finish, 1000);
            },
          });
          return ad.loadAd();
        })
        .catch(fallback);
    }

    return () => {
      cancelled = true;
      clearTimeout(loadTimer);
      clearTimeout(closeTimer);
      void ad
        ?.remove()
        .catch((error: unknown) => logError(error, 'levelplay_reward_cleanup'));
    };
  }, [canRequestAds]);

  return <CustomLoadingIndicator text={t('common.adInstruction')} />;
}
