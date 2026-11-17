import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';

import {logEvent} from '../utils/analytics';
import {logError} from '../utils/error';
import {
  gatherAdConsent,
  initializeMobileAds,
  showAdPrivacyOptions,
  type AdConsent,
} from '../utils/mobileAdsConfig';

interface AdConsentState {
  // null until this launch's UMP consent check settles.
  canRequestAds: boolean | null;
  isMobileAdsReady: boolean;
  privacyOptionsRequired: boolean;
}

interface AdConsentAction {
  requestConsent: () => Promise<void>;
  showPrivacyOptions: () => Promise<void>;
}

export type AdConsentStoreType = AdConsentState & AdConsentAction;

const initialState: AdConsentState = {
  canRequestAds: null,
  isMobileAdsReady: false,
  privacyOptionsRequired: false,
};

let consentRequest: Promise<void> | null = null;

export const useAdConsentStore = create<AdConsentStoreType>()(
  immer((set, get) => {
    const applyConsent = async (consent: AdConsent): Promise<void> => {
      set((state) => {
        state.canRequestAds = consent.canRequestAds;
        state.privacyOptionsRequired = consent.privacyOptionsRequired;
        if (!consent.canRequestAds) state.isMobileAdsReady = false;
      });
      if (!consent.canRequestAds || get().isMobileAdsReady) return;

      try {
        await initializeMobileAds();
      } catch (error) {
        logError(error, 'levelplay_sdk_initialization_error');
        return;
      }
      // Consent may have been withdrawn while the SDK was initializing.
      if (!get().canRequestAds) return;
      set((state) => {
        state.isMobileAdsReady = true;
      });
      logEvent('levelplay_sdk_initialized');
    };

    return {
      ...initialState,
      requestConsent: () => {
        const state = get();
        if (state.canRequestAds && !state.isMobileAdsReady) {
          return applyConsent({
            canRequestAds: true,
            privacyOptionsRequired: state.privacyOptionsRequired,
          });
        }
        if (consentRequest) return consentRequest;

        consentRequest = gatherAdConsent()
          .catch((error: unknown): AdConsent => {
            // Neither fresh nor stored consent is readable: show no ads.
            logError(error, 'ad_consent_error');
            return {canRequestAds: false, privacyOptionsRequired: false};
          })
          .then(applyConsent);

        return consentRequest;
      },
      showPrivacyOptions: async () => {
        try {
          await applyConsent(await showAdPrivacyOptions());
        } catch (error) {
          // Keep the current consent state; the user can open the form again.
          logError(error, 'ad_privacy_options_error');
        }
      },
    };
  }),
);
