const {
  withAndroidManifest,
  withAppBuildGradle,
  withSettingsGradle,
} = require('expo/config-plugins');

const OPTIONAL_HARDWARE_FEATURES = [
  'android.hardware.touchscreen',
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
  'android.hardware.camera.flash',
  'android.hardware.microphone',
];

const AMAZON_AUTOLINKING_BLOCK = `// @generated begin withAmazonFireCompatibility
if (System.getenv("AMAZON_APPSTORE") == "1") {
  expoAutolinking.exclude = ((expoAutolinking.exclude ?: []) + ["expo-ondevice-ai"]).unique()
}
// @generated end withAmazonFireCompatibility`;

const AMAZON_RELEASE_NDK_BLOCK = `            // @generated begin withAmazonFireCompatibility
            if (System.getenv("AMAZON_APPSTORE") == "1") {
                ndk {
                    debugSymbolLevel 'NONE'
                }
            }
            // @generated end withAmazonFireCompatibility`;

function withOptionalHardwareFeatures(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const features = manifest['uses-feature'] ?? [];

    for (const featureName of OPTIONAL_HARDWARE_FEATURES) {
      const existing = features.find(
        (feature) => feature.$?.['android:name'] === featureName,
      );

      if (existing) {
        existing.$['android:required'] = 'false';
      } else {
        features.push({
          $: {
            'android:name': featureName,
            'android:required': 'false',
          },
        });
      }
    }

    manifest['uses-feature'] = features;
    return config;
  });
}

function withAmazonAutolinking(config) {
  return withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes(AMAZON_AUTOLINKING_BLOCK)) {
      return config;
    }

    if (!contents.includes('expoAutolinking.useExpoModules()')) {
      throw new Error(
        'Could not find expoAutolinking.useExpoModules() in android/settings.gradle',
      );
    }

    config.modResults.contents = contents.replace(
      'expoAutolinking.useExpoModules()',
      `${AMAZON_AUTOLINKING_BLOCK}\nexpoAutolinking.useExpoModules()`,
    );
    return config;
  });
}

function withAmazonReleaseBuildSize(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes(AMAZON_RELEASE_NDK_BLOCK)) {
      return config;
    }

    const releaseSigningPattern =
      /(release\s*\{[\s\S]*?signingConfig\s*=?\s*signingConfigs\.debug)/;

    if (!releaseSigningPattern.test(contents)) {
      throw new Error(
        'Could not find the release signingConfig block in android/app/build.gradle',
      );
    }

    config.modResults.contents = contents.replace(
      releaseSigningPattern,
      `$1\n${AMAZON_RELEASE_NDK_BLOCK}`,
    );
    return config;
  });
}

function withAmazonFireCompatibility(config) {
  config = withOptionalHardwareFeatures(config);
  config = withAmazonAutolinking(config);
  config = withAmazonReleaseBuildSize(config);
  return config;
}

module.exports = withAmazonFireCompatibility;
