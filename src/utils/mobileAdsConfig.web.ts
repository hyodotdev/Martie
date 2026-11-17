export async function initializeMobileAds(): Promise<void> {
  // LevelPlay is native-only.
}

export async function launchAdTestSuite(): Promise<void> {}

export type AdConsent = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
};

// Web has no ad SDK or UMP to gate; BannerAd.web renders an empty view.
const WEB_AD_CONSENT: AdConsent = {
  canRequestAds: true,
  privacyOptionsRequired: false,
};

export async function gatherAdConsent(): Promise<AdConsent> {
  return WEB_AD_CONSENT;
}

export async function showAdPrivacyOptions(): Promise<AdConsent> {
  return WEB_AD_CONSENT;
}
