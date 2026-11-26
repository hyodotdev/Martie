const {withPodfile} = require('expo/config-plugins');

// react-native-firebase 27 resolves Firebase through Swift Package Manager,
// which requires dynamic frameworks. The ad SDKs ship static xcframeworks that
// CocoaPods refuses to embed in a dynamic framework, so these pods, and the
// React Native wrappers that depend on them, stay static libraries.
const STATIC_PODS = [
  'Google-Mobile-Ads-SDK',
  'GoogleUserMessagingPlatform',
  'IronSourceSDK',
  'IronSourceUnityAdsAdapter',
  'RNGoogleMobileAds',
  'UnityAds',
  'unity-levelplay-mediation',
];

const BLOCK = `# @generated begin withStaticAdPods
pre_install do |installer|
  static_pods = ${JSON.stringify(STATIC_PODS)}
  installer.pod_targets.each do |pod|
    next unless static_pods.include?(pod.name)
    def pod.build_type
      Pod::BuildType.static_library
    end
  end
end
# @generated end withStaticAdPods`;

function withStaticAdPods(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('@generated begin withStaticAdPods')) {
      return config;
    }

    const targetPattern = /^target '[^']+' do$/m;

    if (!targetPattern.test(contents)) {
      throw new Error('Could not find the app target in ios/Podfile');
    }

    config.modResults.contents = contents.replace(
      targetPattern,
      (target) => `${BLOCK}\n\n${target}`,
    );

    return config;
  });
}

module.exports = withStaticAdPods;
