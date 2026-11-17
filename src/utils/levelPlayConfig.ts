import {Platform} from 'react-native';

// Existing Martie apps and ad units, verified in the LevelPlay dashboard.
export const levelPlayConfig = Platform.select({
  android: {
    appKey: '215270c35',
    bannerAdUnitId: 'i1bwhnznhk0xzir0',
    rewardedAdUnitId: 's4jmeh9j0g2m5iuq',
    interstitialAdUnitId: 'w9umebv05hjeey9z',
  },
  default: {
    appKey: '21526d2ad',
    bannerAdUnitId: '9fw35doeittqscwa',
    rewardedAdUnitId: 'jovd9glm2vged62e',
    interstitialAdUnitId: 'mqb1maq76ygxucwv',
  },
});
