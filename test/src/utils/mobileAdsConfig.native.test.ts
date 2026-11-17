import {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  AdsConsentStatus,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';
import {
  LevelPlay,
  LevelPlayPrivacySettings,
  type LevelPlayInitListener,
} from 'unity-levelplay-mediation';
import {
  gatherAdConsent,
  initializeMobileAds,
  showAdPrivacyOptions,
} from '../../../src/utils/mobileAdsConfig.native';

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue([]),
  })),
  AdsConsent: {
    gatherConsent: jest.fn(),
    getConsentInfo: jest.fn(),
    showPrivacyOptionsForm: jest.fn(),
  },
  AdsConsentPrivacyOptionsRequirementStatus: {
    NOT_REQUIRED: 'NOT_REQUIRED',
    REQUIRED: 'REQUIRED',
    UNKNOWN: 'UNKNOWN',
  },
  AdsConsentStatus: {OBTAINED: 'OBTAINED'},
  MaxAdContentRating: {G: 'G'},
}));

jest.mock('../../../src/utils/error', () => ({
  logError: jest.fn(),
}));

const mockGatherConsent = jest.mocked(AdsConsent.gatherConsent);
const mockGetConsentInfo = jest.mocked(AdsConsent.getConsentInfo);
const mockShowPrivacyOptionsForm = jest.mocked(
  AdsConsent.showPrivacyOptionsForm,
);

const consentInfo = (
  canRequestAds: boolean,
  privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus,
): AdsConsentInfo => ({
  canRequestAds,
  isConsentFormAvailable: true,
  privacyOptionsRequirementStatus,
  status: AdsConsentStatus.OBTAINED,
});

describe('initializeMobileAds', () => {
  it('applies child privacy settings once and waits for the native init callback', async () => {
    jest.clearAllMocks();
    let listener: LevelPlayInitListener | undefined;
    jest
      .mocked(LevelPlay.init)
      .mockImplementationOnce(async (_request, initListener) => {
        listener = initListener;
      });
    let ready = false;
    const first = initializeMobileAds().then(() => {
      ready = true;
    });
    const second = initializeMobileAds();
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
    expect(LevelPlayPrivacySettings.setCOPPA).toHaveBeenCalledWith(true);
    expect(LevelPlay.setMetaData).toHaveBeenCalledWith('is_deviceid_optout', [
      'true',
    ]);
    expect(LevelPlay.init).toHaveBeenCalledTimes(1);
    expect(ready).toBe(false);
    listener?.onInitSuccess?.({isAdQualityEnabled: false});
    await Promise.all([first, second]);
    expect(ready).toBe(true);
  });
});

describe('gatherAdConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports whether ads may be requested and the privacy options entry point is required', async () => {
    mockGatherConsent.mockResolvedValue(
      consentInfo(true, AdsConsentPrivacyOptionsRequirementStatus.REQUIRED),
    );

    await expect(gatherAdConsent()).resolves.toEqual({
      canRequestAds: true,
      privacyOptionsRequired: true,
    });
    expect(mockGetConsentInfo).not.toHaveBeenCalled();
  });

  it.each([
    AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
    AdsConsentPrivacyOptionsRequirementStatus.UNKNOWN,
  ])(
    'does not require the privacy options entry point when UMP reports %s',
    async (status) => {
      mockGatherConsent.mockResolvedValue(consentInfo(false, status));

      await expect(gatherAdConsent()).resolves.toEqual({
        canRequestAds: false,
        privacyOptionsRequired: false,
      });
    },
  );

  it('falls back to the consent stored by an earlier launch when gathering fails', async () => {
    mockGatherConsent.mockRejectedValue(new Error('offline'));
    mockGetConsentInfo.mockResolvedValue(
      consentInfo(true, AdsConsentPrivacyOptionsRequirementStatus.REQUIRED),
    );

    await expect(gatherAdConsent()).resolves.toEqual({
      canRequestAds: true,
      privacyOptionsRequired: true,
    });
    expect(mockGetConsentInfo).toHaveBeenCalledTimes(1);
  });

  it('rejects when neither fresh nor stored consent can be read', async () => {
    mockGatherConsent.mockRejectedValue(new Error('offline'));
    mockGetConsentInfo.mockRejectedValue(new Error('unavailable'));

    await expect(gatherAdConsent()).rejects.toThrow('unavailable');
  });
});

describe('showAdPrivacyOptions', () => {
  it('returns the consent chosen in the privacy options form', async () => {
    mockShowPrivacyOptionsForm.mockResolvedValue(
      consentInfo(false, AdsConsentPrivacyOptionsRequirementStatus.REQUIRED),
    );

    await expect(showAdPrivacyOptions()).resolves.toEqual({
      canRequestAds: false,
      privacyOptionsRequired: true,
    });
  });
});
