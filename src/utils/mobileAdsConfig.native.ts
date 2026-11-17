import {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';
import {
  LevelPlay,
  LevelPlayInitRequest,
  LevelPlayPrivacySettings,
} from 'unity-levelplay-mediation';

import {logError} from './error';
import {levelPlayConfig} from './levelPlayConfig';

let initializationPromise: Promise<void> | null = null;

export function initializeMobileAds(): Promise<void> {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    // Preserve the existing child-directed treatment for users of unknown age.
    await LevelPlayPrivacySettings.setCOPPA(true);
    await LevelPlay.setMetaData('UnityAds_coppa', ['true']);
    await LevelPlay.setMetaData('is_deviceid_optout', ['true']);
    await LevelPlay.setMetaData('Google_Family_Self_Certified_SDKS', ['true']);
    if (__DEV__) {
      await LevelPlay.setAdaptersDebug(true);
      await LevelPlay.setMetaData('is_test_suite', ['enable']);
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('LevelPlay initialization timed out')),
        30000,
      );
      void LevelPlay.init(
        LevelPlayInitRequest.builder(levelPlayConfig.appKey).build(),
        {
          onInitSuccess: () => {
            clearTimeout(timer);
            resolve();
          },
          onInitFailed: (error) => {
            clearTimeout(timer);
            reject(
              new Error(`LevelPlay ${error.errorCode}: ${error.errorMessage}`),
            );
          },
        },
      ).catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  })().catch((error) => {
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
}

export async function launchAdTestSuite(): Promise<void> {
  if (__DEV__) {
    await initializeMobileAds();
    await LevelPlay.launchTestSuite();
  }
}

export type AdConsent = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
};

function toAdConsent(info: AdsConsentInfo): AdConsent {
  return {
    canRequestAds: info.canRequestAds,
    privacyOptionsRequired:
      info.privacyOptionsRequirementStatus ===
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
  };
}

export async function gatherAdConsent(): Promise<AdConsent> {
  try {
    return toAdConsent(await AdsConsent.gatherConsent());
  } catch (error) {
    logError(error, 'ad_consent_gather_error');
    // Offline or a form failure: consent stored by an earlier launch still counts.
    return toAdConsent(await AdsConsent.getConsentInfo());
  }
}

export async function showAdPrivacyOptions(): Promise<AdConsent> {
  return toAdConsent(await AdsConsent.showPrivacyOptionsForm());
}
