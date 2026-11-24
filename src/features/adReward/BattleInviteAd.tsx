import {useEffect, useEffectEvent} from 'react';
import {LevelPlay, LevelPlayRewardedAd} from 'unity-levelplay-mediation';

import {logEvent} from '../../utils/analytics';
import {t} from '../../STRINGS';
import {logError} from '../../utils/error';
import CustomLoadingIndicator from '../../uis/CustomLoadingIndicator';
import {levelPlayConfig} from '../../utils/levelPlayConfig';
import {
  BATTLE_AD_PURPOSE,
  REWARD_PURPOSE_PARAM,
} from '../../../convex/utils/levelPlay';
import {initializeMobileAds} from '../../utils/mobileAdsConfig';
import {useAdConsentStore} from '../../stores/adConsentStore';

const REWARDED_SERVER_PARAMS = 'LevelPlay_Rewarded_Server_Params';
const LOAD_TIMEOUT_MS = 20000;

type Props = {
  /** Called once the ad closed, or right away when no ad can be shown. */
  onDone: () => void;
};

/**
 * The ad a free member watches before opening a battle invite. It grants
 * no bulbs: the server ignores callbacks tagged with the battle purpose.
 */
export default function BattleInviteAd({onDone}: Props): JSX.Element {
  const canRequestAds = useAdConsentStore((state) => state.canRequestAds);
  const done = useEffectEvent(onDone);

  useEffect(() => {
    if (canRequestAds === null) return;
    let finished = false;
    let ad: LevelPlayRewardedAd | null = null;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(loadTimer);
      done();
    };
    // An ad that cannot be served never blocks the invite. No fill is
    // routine, so it is counted as an event rather than reported as a bug.
    const fallback = (error: unknown) => {
      if (finished) return;
      logEvent('ad_load_failed', {
        adProvider: 'levelplay',
        surface: 'battle_invite',
        error: String(error),
      });
      finish();
    };
    if (!canRequestAds) {
      finish();
      return;
    }
    loadTimer = setTimeout(
      () => fallback(new Error('Ad load timed out')),
      LOAD_TIMEOUT_MS,
    );

    void initializeMobileAds()
      .then(async () => {
        if (finished) return;
        await LevelPlay.setMetaData(REWARDED_SERVER_PARAMS, [
          `${REWARD_PURPOSE_PARAM}=${BATTLE_AD_PURPOSE}`,
        ]);
        ad = new LevelPlayRewardedAd(levelPlayConfig.rewardedAdUnitId);
        ad.setListener({
          onAdLoaded: () => {
            if (finished) return;
            void ad?.showAd().catch(fallback);
          },
          onAdLoadFailed: fallback,
          onAdDisplayed: (info) => {
            clearTimeout(loadTimer);
            logEvent('ad_displayed', {
              adProvider: 'levelplay',
              network: info.adNetwork,
              surface: 'battle_invite',
            });
          },
          onAdDisplayFailed: fallback,
          onAdRewarded: () => {},
          onAdClosed: finish,
        });
        return ad.loadAd();
      })
      .catch(fallback);

    return () => {
      finished = true;
      clearTimeout(loadTimer);
      void ad
        ?.remove()
        .catch((error: unknown) => logError(error, 'battle_invite_ad_cleanup'));
    };
  }, [canRequestAds]);

  return <CustomLoadingIndicator text={t('battle.adLoading')} />;
}
