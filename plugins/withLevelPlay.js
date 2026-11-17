const {
  withAppBuildGradle,
  withPodfile,
  withInfoPlist,
} = require('expo/config-plugins');

function withLevelPlay(config) {
  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes('com.unity3d.ads-mediation:unityads-adapter:')) {
      if (!/dependencies\s*\{/.test(contents)) {
        throw new Error('LevelPlay: Android dependencies block not found');
      }
      config.modResults.contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {
    implementation 'com.unity3d.ads-mediation:unityads-adapter:5.15.0'
    implementation 'com.google.android.gms:play-services-appset:16.0.2'
    implementation 'androidx.work:work-runtime-ktx:2.8.0'`,
      );
    }
    return config;
  });

  config = withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes("pod 'IronSourceUnityAdsAdapter'")) {
      if (!contents.includes('use_expo_modules!')) {
        throw new Error('LevelPlay: Expo Podfile target not found');
      }
      config.modResults.contents = contents.replace(
        'use_expo_modules!',
        "use_expo_modules!\n  pod 'IronSourceUnityAdsAdapter', '5.13.0'",
      );
    }
    return config;
  });

  return withInfoPlist(config, (config) => {
    const items = config.modResults.SKAdNetworkItems ?? [];
    for (const identifier of [
      'su67r6k2v3.skadnetwork',
      '4dzt52r2t5.skadnetwork',
    ]) {
      if (!items.some((item) => item.SKAdNetworkIdentifier === identifier)) {
        items.push({SKAdNetworkIdentifier: identifier});
      }
    }
    config.modResults.SKAdNetworkItems = items;
    return config;
  });
}

module.exports = withLevelPlay;
