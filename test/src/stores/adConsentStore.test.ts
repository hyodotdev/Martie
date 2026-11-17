import type {LevelPlayInitListener} from 'unity-levelplay-mediation';
import {
  AdsConsentPrivacyOptionsRequirementStatus,
  AdsConsentStatus,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';

type AdConsentStoreModule = typeof import('../../../src/stores/adConsentStore');

const mockGatherConsent = jest.fn<Promise<AdsConsentInfo>, []>();
const mockGetConsentInfo = jest.fn<Promise<AdsConsentInfo>, []>();
const mockShowPrivacyOptionsForm = jest.fn<Promise<AdsConsentInfo>, []>();
const mockSetRequestConfiguration = jest.fn();
const mockInitialize = jest.fn();
const mockLogError = jest.fn();

jest.mock('unity-levelplay-mediation', () => ({
  LevelPlay: {
    init: (...args: unknown[]) => mockInitialize(...args),
    setMetaData: jest.fn().mockResolvedValue(undefined),
    setAdaptersDebug: jest.fn().mockResolvedValue(undefined),
  },
  LevelPlayPrivacySettings: {setCOPPA: jest.fn().mockResolvedValue(undefined)},
  LevelPlayInitRequest: {
    builder: (appKey: string) => ({build: () => ({appKey})}),
  },
}));

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({
    initialize: mockInitialize,
    setRequestConfiguration: mockSetRequestConfiguration,
  }),
  AdsConsent: {
    gatherConsent: mockGatherConsent,
    getConsentInfo: mockGetConsentInfo,
    showPrivacyOptionsForm: mockShowPrivacyOptionsForm,
  },
  AdsConsentPrivacyOptionsRequirementStatus: {
    NOT_REQUIRED: 'NOT_REQUIRED',
    REQUIRED: 'REQUIRED',
    UNKNOWN: 'UNKNOWN',
  },
  AdsConsentStatus: {OBTAINED: 'OBTAINED'},
  MaxAdContentRating: {G: 'G'},
}));

jest.mock('../../../src/utils/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('../../../src/utils/error', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const consentInfo = (
  canRequestAds: boolean,
  privacyOptionsRequirementStatus = AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
): AdsConsentInfo => ({
  canRequestAds,
  isConsentFormAvailable: true,
  privacyOptionsRequirementStatus,
  status: AdsConsentStatus.OBTAINED,
});

// A fresh module per test resets the once-per-launch consent request.
const loadStore = (): AdConsentStoreModule['useAdConsentStore'] =>
  jest.requireActual<AdConsentStoreModule>('../../../src/stores/adConsentStore')
    .useAdConsentStore;

describe('useAdConsentStore', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockSetRequestConfiguration.mockResolvedValue(undefined);
    mockInitialize.mockImplementation(
      async (_request: unknown, listener: LevelPlayInitListener) => {
        listener.onInitSuccess?.({isAdQualityEnabled: false});
      },
    );
  });

  it('does not initialize Mobile Ads before consent allows ad requests', async () => {
    let resolveConsent: (info: AdsConsentInfo) => void = () => undefined;
    mockGatherConsent.mockReturnValue(
      new Promise((resolve) => {
        resolveConsent = resolve;
      }),
    );
    const useAdConsentStore = loadStore();

    const request = useAdConsentStore.getState().requestConsent();
    await Promise.resolve();

    expect(mockInitialize).not.toHaveBeenCalled();
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: null,
      isMobileAdsReady: false,
    });

    resolveConsent(consentInfo(true));
    await request;

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockGatherConsent.mock.invocationCallOrder[0]).toBeLessThan(
      mockInitialize.mock.invocationCallOrder[0],
    );
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: true,
      isMobileAdsReady: true,
      privacyOptionsRequired: true,
    });
  });

  it('keeps ads off when consent does not allow ad requests', async () => {
    mockGatherConsent.mockResolvedValue(consentInfo(false));
    const useAdConsentStore = loadStore();

    await useAdConsentStore.getState().requestConsent();

    expect(mockSetRequestConfiguration).not.toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: false,
      isMobileAdsReady: false,
      privacyOptionsRequired: true,
    });
  });

  it('falls back to consent stored by an earlier launch when gathering fails', async () => {
    mockGatherConsent.mockRejectedValue(new Error('offline'));
    mockGetConsentInfo.mockResolvedValue(consentInfo(true));
    const useAdConsentStore = loadStore();

    await useAdConsentStore.getState().requestConsent();

    expect(mockGetConsentInfo).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: true,
      isMobileAdsReady: true,
    });
  });

  it('keeps ads off when stored consent does not allow ad requests either', async () => {
    mockGatherConsent.mockRejectedValue(new Error('offline'));
    mockGetConsentInfo.mockResolvedValue(
      consentInfo(false, AdsConsentPrivacyOptionsRequirementStatus.UNKNOWN),
    );
    const useAdConsentStore = loadStore();

    await useAdConsentStore.getState().requestConsent();

    expect(mockInitialize).not.toHaveBeenCalled();
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: false,
      isMobileAdsReady: false,
      privacyOptionsRequired: false,
    });
  });

  it('shows no ads when neither fresh nor stored consent can be read', async () => {
    mockGatherConsent.mockRejectedValue(new Error('offline'));
    mockGetConsentInfo.mockRejectedValue(new Error('unavailable'));
    const useAdConsentStore = loadStore();

    await useAdConsentStore.getState().requestConsent();

    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      'ad_consent_error',
    );
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: false,
      isMobileAdsReady: false,
    });
  });

  it('gathers consent once per launch', async () => {
    mockGatherConsent.mockResolvedValue(consentInfo(true));
    const useAdConsentStore = loadStore();

    await Promise.all([
      useAdConsentStore.getState().requestConsent(),
      useAdConsentStore.getState().requestConsent(),
    ]);
    await useAdConsentStore.getState().requestConsent();

    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('retries a failed SDK initialization using the settled consent', async () => {
    mockGatherConsent.mockResolvedValue(consentInfo(true));
    mockInitialize.mockImplementationOnce(
      async (_request: unknown, listener: LevelPlayInitListener) => {
        listener.onInitFailed?.({errorCode: 2110, errorMessage: 'offline'});
      },
    );
    const useAdConsentStore = loadStore();
    await useAdConsentStore.getState().requestConsent();
    expect(useAdConsentStore.getState().isMobileAdsReady).toBe(false);

    await useAdConsentStore.getState().requestConsent();

    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(2);
    expect(useAdConsentStore.getState().isMobileAdsReady).toBe(true);
  });

  it('stops ad requests when consent is withdrawn in the privacy options form', async () => {
    mockGatherConsent.mockResolvedValue(consentInfo(true));
    mockShowPrivacyOptionsForm.mockResolvedValue(consentInfo(false));
    const useAdConsentStore = loadStore();
    await useAdConsentStore.getState().requestConsent();

    await useAdConsentStore.getState().showPrivacyOptions();

    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1);
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: false,
      isMobileAdsReady: false,
      privacyOptionsRequired: true,
    });
  });

  it('initializes Mobile Ads when the privacy options form newly grants consent', async () => {
    mockGatherConsent.mockResolvedValue(consentInfo(false));
    mockShowPrivacyOptionsForm.mockResolvedValue(consentInfo(true));
    const useAdConsentStore = loadStore();
    await useAdConsentStore.getState().requestConsent();
    expect(mockInitialize).not.toHaveBeenCalled();

    await useAdConsentStore.getState().showPrivacyOptions();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: true,
      isMobileAdsReady: true,
    });
  });

  it('keeps the current consent when the privacy options form fails', async () => {
    mockGatherConsent.mockResolvedValue(consentInfo(true));
    mockShowPrivacyOptionsForm.mockRejectedValue(new Error('form error'));
    const useAdConsentStore = loadStore();
    await useAdConsentStore.getState().requestConsent();

    await useAdConsentStore.getState().showPrivacyOptions();

    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      'ad_privacy_options_error',
    );
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: true,
      isMobileAdsReady: true,
      privacyOptionsRequired: true,
    });
  });
});
