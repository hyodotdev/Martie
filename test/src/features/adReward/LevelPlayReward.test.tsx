import {act, render, waitFor} from '@testing-library/react-native';
import {
  LevelPlay,
  LevelPlayRewardedAd,
  type LevelPlayRewardedAdListener,
} from 'unity-levelplay-mediation';
import LevelPlayReward from '../../../../src/features/adReward/LevelPlayReward';
import {useAdConsentStore} from '../../../../src/stores/adConsentStore';
import {initializeMobileAds} from '../../../../src/utils/mobileAdsConfig';

const mockClaimRecharge = jest
  .fn()
  .mockResolvedValue({granted: 2, pending: false});
const mockSetIsRewarded = jest.fn();
const mockRouter = {back: jest.fn(), canGoBack: () => true, replace: jest.fn()};
const mockAudioPlayer = {
  play: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-router', () => ({useRouter: () => mockRouter}));
jest.mock('react-native-mmkv', () => ({
  useMMKVBoolean: () => [undefined, mockSetIsRewarded],
}));
jest.mock('expo-audio', () => ({useAudioPlayer: () => mockAudioPlayer}));
jest.mock('../../../../src/sounds', () => ({AUDIO_RECHARGE_BULB: 1}));
jest.mock('../../../../src/hooks/useBulbManager', () => ({
  useBulbManager: () => ({claimRecharge: mockClaimRecharge}),
}));
jest.mock('convex/react', () => ({
  useQuery: () => ({_id: 'user-a'}),
}));
jest.mock('../../../../src/utils/storage', () => ({
  Storage: {IsRewarded: 'IsRewarded'},
}));
jest.mock('../../../../src/utils/analytics', () => ({logEvent: jest.fn()}));
jest.mock('../../../../src/utils/error', () => ({logError: jest.fn()}));
jest.mock('../../../../src/STRINGS', () => ({t: (key: string) => key}));
jest.mock('../../../../src/utils/mobileAdsConfig', () => ({
  initializeMobileAds: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../src/uis/CustomLoadingIndicator', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const {Text} =
    jest.requireActual<typeof import('react-native')>('react-native');
  const CustomLoadingIndicator = ({text}: {text: string}) =>
    React.createElement(Text, null, text);
  return CustomLoadingIndicator;
});

const adInfo = {adNetwork: 'ironSource'} as Parameters<
  LevelPlayRewardedAdListener['onAdLoaded']
>[0];
const adError = {errorCode: 509, errorMessage: 'no fill', adUnitId: 'reward'};
const reward = {name: 'bulb', amount: 2};
const startAd = async () => {
  useAdConsentStore.setState({canRequestAds: true});
  const result = render(<LevelPlayReward />);
  await waitFor(() => expect(LevelPlayRewardedAd).toHaveBeenCalledTimes(1));
  const ad = jest.mocked(LevelPlayRewardedAd).mock.results[0].value;
  const listener = jest.mocked(ad.setListener).mock.calls[0][0];
  return {result, ad, listener};
};

describe('LevelPlay rewarded lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAdConsentStore.setState({
      canRequestAds: null,
      isMobileAdsReady: false,
      privacyOptionsRequired: false,
    });
  });
  afterEach(() => jest.useRealTimers());

  it('waits for consent before initializing or loading an ad', () => {
    render(<LevelPlayReward />);
    expect(initializeMobileAds).not.toHaveBeenCalled();
    expect(LevelPlayRewardedAd).not.toHaveBeenCalled();
    expect(mockClaimRecharge).not.toHaveBeenCalled();
  });

  it('preserves fallback recharge when consent prevents an ad', async () => {
    useAdConsentStore.setState({canRequestAds: false});
    render(<LevelPlayReward />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(LevelPlayRewardedAd).not.toHaveBeenCalled();
    expect(mockClaimRecharge).toHaveBeenCalledWith('consent_unavailable');
  });

  it('shows a loaded ad, credits completion once, and waits for close before navigating', async () => {
    const {ad, listener} = await startAd();
    act(() => listener.onAdLoaded(adInfo));
    expect(ad.showAd).toHaveBeenCalledTimes(1);
    act(() => {
      listener.onAdDisplayed(adInfo);
      listener.onAdRewarded(reward, adInfo);
      listener.onAdRewarded(reward, adInfo);
    });
    await waitFor(() => expect(mockSetIsRewarded).toHaveBeenCalledWith(true));
    expect(mockClaimRecharge).toHaveBeenCalledTimes(1);
    expect(mockClaimRecharge).toHaveBeenCalledWith('completed');
    expect(LevelPlay.setMetaData).toHaveBeenCalledWith(
      'LevelPlay_Rewarded_Server_Params',
      ['userId=user-a'],
    );
    expect(LevelPlay.setDynamicUserId).toHaveBeenCalledWith('user-a');
    expect(mockRouter.back).not.toHaveBeenCalled();
    act(() => listener.onAdClosed?.(adInfo));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });

  it('claims a fallback recharge when the account cannot be attached', async () => {
    jest
      .mocked(LevelPlay.setMetaData)
      .mockRejectedValueOnce(new Error('bridge'));
    const {listener} = await startAd();
    act(() => {
      listener.onAdRewarded(reward, adInfo);
      listener.onAdClosed?.(adInfo);
    });
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(mockClaimRecharge).toHaveBeenCalledWith('unavailable');
  });

  it('does not grant a reward or navigate while a long ad is playing', async () => {
    const {listener} = await startAd();
    jest.useFakeTimers();
    act(() => listener.onAdDisplayed(adInfo));
    act(() => jest.advanceTimersByTime(60000));
    expect(mockClaimRecharge).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('does not reward an ad closed before completion', async () => {
    const {listener} = await startAd();
    jest.useFakeTimers();
    act(() => {
      listener.onAdDisplayed(adInfo);
      listener.onAdClosed?.(adInfo);
      jest.advanceTimersByTime(1000);
    });
    expect(mockClaimRecharge).not.toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('accepts a reward callback arriving just after close', async () => {
    const {listener} = await startAd();
    act(() => {
      listener.onAdClosed?.(adInfo);
      listener.onAdRewarded(reward, adInfo);
    });
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(mockClaimRecharge).toHaveBeenCalledTimes(1);
  });

  it('handles no-fill without a stuck screen or duplicate fallback reward', async () => {
    const {listener} = await startAd();
    act(() => {
      listener.onAdLoadFailed(adError);
      listener.onAdLoadFailed(adError);
    });
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(mockClaimRecharge).toHaveBeenCalledTimes(1);
  });

  it('ignores callbacks after leaving and removes its native ad', async () => {
    const {result, ad, listener} = await startAd();
    result.unmount();
    act(() => {
      listener.onAdLoaded(adInfo);
      listener.onAdRewarded(reward, adInfo);
    });
    expect(ad.remove).toHaveBeenCalledTimes(1);
    expect(ad.showAd).not.toHaveBeenCalled();
    expect(mockClaimRecharge).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
