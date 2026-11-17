export async function initializeMobileAds(): Promise<void> {
  // Platform-specific implementations are resolved by Metro.
}

export async function launchAdTestSuite(): Promise<void> {}

export type AdConsent = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
};

export async function gatherAdConsent(): Promise<AdConsent> {
  // Platform-specific implementations are resolved by Metro.
  return {canRequestAds: false, privacyOptionsRequired: false};
}

export async function showAdPrivacyOptions(): Promise<AdConsent> {
  // Platform-specific implementations are resolved by Metro.
  return {canRequestAds: false, privacyOptionsRequired: false};
}
