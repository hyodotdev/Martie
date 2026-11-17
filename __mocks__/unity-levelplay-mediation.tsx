import React, {forwardRef, useImperativeHandle} from 'react';
import {View} from 'react-native';
import type {
  LevelPlayBannerAdViewMethods,
  LevelPlayBannerAdViewProps,
  LevelPlayInitListener,
} from 'unity-levelplay-mediation';

export const LevelPlay = {
  init: jest.fn((_request: unknown, listener: LevelPlayInitListener) => {
    listener.onInitSuccess?.({isAdQualityEnabled: false});
    return Promise.resolve();
  }),
  setMetaData: jest.fn().mockResolvedValue(undefined),
  setAdaptersDebug: jest.fn().mockResolvedValue(undefined),
  launchTestSuite: jest.fn().mockResolvedValue(undefined),
  setDynamicUserId: jest.fn().mockResolvedValue(undefined),
};
export const LevelPlayPrivacySettings = {
  setCOPPA: jest.fn().mockResolvedValue(undefined),
};
export const LevelPlayInitRequest = {
  builder: jest.fn((appKey: string) => ({build: () => ({appKey})})),
};
const bannerSize = {width: 320, height: 50};
export const LevelPlayAdSize = {
  BANNER: bannerSize,
  createAdaptiveAdSize: jest.fn().mockResolvedValue(bannerSize),
};
export const bannerMethods = {
  loadAd: jest.fn(),
  destroy: jest.fn(),
  pauseAutoRefresh: jest.fn(),
  resumeAutoRefresh: jest.fn(),
  getAdId: () => 'test-banner',
};
export const LevelPlayBannerAdView = forwardRef<
  LevelPlayBannerAdViewMethods,
  LevelPlayBannerAdViewProps
>((props, ref) => {
  useImperativeHandle(ref, () => bannerMethods);
  return <View {...props} testID="banner-ad" />;
});
export const LevelPlayRewardedAd = jest.fn(() => ({
  setListener: jest.fn(),
  loadAd: jest.fn().mockResolvedValue(undefined),
  showAd: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
}));
