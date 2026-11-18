import type {ConfigContext, ExpoConfig} from '@expo/config';
import dotenv from 'dotenv';
import {expand} from 'dotenv-expand';
import fs from 'fs';
import path from 'path';

import {version} from './package.json';

// Prefer canonical stage filenames; retain existing local short aliases.
const getStageEnvPath = (stage: string): string => {
  const candidates =
    stage === 'production'
      ? ['.env.production', '.env.prod']
      : stage === 'development'
        ? ['.env.development', '.env.local']
        : [`.env.${stage}`];
  const existing = candidates.find((fileName) =>
    fs.existsSync(path.join(__dirname, fileName)),
  );

  return path.join(__dirname, existing ?? `.env.${stage}`);
};

// Explicit EAS/shell values win; the stage file takes precedence over .env.
expand(
  dotenv.config({
    path: process.env.STAGE
      ? [getStageEnvPath(process.env.STAGE), path.join(__dirname, '.env')]
      : path.join(__dirname, '.env'),
    quiet: true,
  }),
);

// Codemagic Patch delivers over-the-air updates. Deployment keys only let a
// build ask for updates, so they ship inside every binary and live in the repo.
// Only production store builds read Production; every other stage reads
// Staging so test builds never take or replace a production update.
const OTA_API_URL = 'https://ota.codemagicpatch.dev';
const OTA_DOWNLOAD_BASE_URL = 'https://ota-storage.codemagicpatch.dev';
const OTA_DEPLOYMENT_KEYS = {
  ios: {
    staging: 'dep_f2ad6121eb854f64925927e6684f8f02',
    production: 'dep_8a23f1459bb74452ba0fcc8fde1d25fa',
  },
  android: {
    staging: 'dep_0b464ab3b7df4dfc9105e006eb539c0a',
    production: 'dep_d90387e38e924537b0d776abc4e35f80',
  },
};
const otaTrack = process.env.STAGE === 'production' ? 'production' : 'staging';

const DEEP_LINK_HOST = 'hyo.dev';
const MARTIE_LINK_PATH_PREFIXES = [
  '/martie',
  '/en/martie',
  '/ko/martie',
  '/ja/martie',
];
const isAmazonAppstoreBuild = process.env.AMAZON_APPSTORE === '1';
const isHorizonOsBuild = process.env.HORIZON_OS === '1';
const metaHorizonAppId =
  process.env.META_HORIZON_APP_ID ?? process.env.HORIZON_APP_ID;
const HORIZON_BLOCKED_ANDROID_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.ACCESS_NOTIFICATION_POLICY',
  'android.permission.CAMERA',
  'android.permission.CAMERA_ROLL',
  'android.permission.RECORD_AUDIO',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.ACCESS_MEDIA_LOCATION',
  'android.permission.MANAGE_EXTERNAL_STORAGE',
];
const DEFAULT_ANDROID_PERMISSIONS = [
  'RECEIVE_BOOT_COMPLETED',
  'CAMERA',
  'CAMERA_ROLL',
  'READ_EXTERNAL_STORAGE',
  'WRITE_EXTERNAL_STORAGE',
  'NOTIFICATIONS',
  'USER_FACING_NOTIFICATIONS',
  'RECORD_AUDIO',
  'MODIFY_AUDIO_SETTINGS',
  'com.google.android.gms.permission.AD_ID',
];
const HORIZON_ANDROID_PERMISSIONS = [
  'RECEIVE_BOOT_COMPLETED',
  'NOTIFICATIONS',
  'USER_FACING_NOTIFICATIONS',
  'MODIFY_AUDIO_SETTINGS',
  'com.google.android.gms.permission.AD_ID',
];

if (isAmazonAppstoreBuild && isHorizonOsBuild) {
  throw new Error('AMAZON_APPSTORE=1 and HORIZON_OS=1 are mutually exclusive');
}

if (isHorizonOsBuild && !metaHorizonAppId) {
  throw new Error(
    'META_HORIZON_APP_ID or HORIZON_APP_ID is required when building with HORIZON_OS=1',
  );
}

type ExpoPlugin = NonNullable<ExpoConfig['plugins']>[number];

const customAssetsPlugin: ExpoPlugin = [
  'expo-custom-assets',
  {assetsPaths: ['./assets/sounds']},
];

const expoFontPlugin: ExpoPlugin = [
  'expo-font',
  {
    fonts: [
      'assets/fonts/NanumSquareRoundOTFB.otf',
      'assets/fonts/NanumSquareRoundOTFR.otf',
      'assets/fonts/NanumSquareRoundOTFL.otf',
      'node_modules/cpk-ui/components/uis/Icon/cpk.ttf',
      'node_modules/cpk-ui/components/uis/Icon/Pretendard-Bold.otf',
      'node_modules/cpk-ui/components/uis/Icon/Pretendard-Regular.otf',
      'node_modules/cpk-ui/components/uis/Icon/Pretendard-Thin.otf',
    ],
  },
];

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Martie',
  scheme: 'martie',
  slug: 'martie',
  platforms: ['ios', 'android', 'web'],
  version,
  orientation: 'default',
  icon: './assets/icon.png',
  plugins: [
    [
      '@codemagic/react-native-patch',
      {
        ios: {
          apiUrl: OTA_API_URL,
          downloadBaseUrl: OTA_DOWNLOAD_BASE_URL,
          deploymentKey: OTA_DEPLOYMENT_KEYS.ios[otaTrack],
        },
        android: {
          apiUrl: OTA_API_URL,
          downloadBaseUrl: OTA_DOWNLOAD_BASE_URL,
          deploymentKey: OTA_DEPLOYMENT_KEYS.android[otaTrack],
        },
      },
    ],
    './plugins/withAmazonFireCompatibility',
    './plugins/withIosPodDeploymentTarget',
    'expo-asset',
    [
      'expo-iap',
      {
        modules: {
          amazon: {
            fireOS: isAmazonAppstoreBuild,
          },
          horizon: isHorizonOsBuild,
        },
        android: {
          horizon: {
            appId: isHorizonOsBuild ? metaHorizonAppId : undefined,
          },
        },
      },
    ],
    'expo-status-bar',
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    'expo-image',
    'expo-sharing',
    ...(isAmazonAppstoreBuild ? [] : [customAssetsPlugin]),
    [
      'react-native-edge-to-edge',
      {
        android: {
          parentTheme: 'Light',
          enforceNavigationBarContrast: false,
        },
      },
    ],
    'expo-secure-store',
    '@react-native-firebase/app',
    'expo-router',
    './plugins/withExpoReactHostFactory',
    ['expo-tracking-transparency'],
    'expo-localization',
    'expo-ondevice-ai',
    ...(isAmazonAppstoreBuild ? [] : [expoFontPlugin]),
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          buildReactNativeFromSource: true,
          enableSceneSupport: true,
        },
        // https://github.com/invertase/notifee/issues/911#issuecomment-1872530474
        android: {
          // Locanara, used by expo-ondevice-ai, requires minSdk 31.
          // Amazon builds exclude that optional native module to reach more Fire OS devices.
          minSdkVersion: isAmazonAppstoreBuild ? 24 : 31,
          targetSdkVersion: isHorizonOsBuild ? 34 : undefined,
          extraMavenRepos: [
            '../../node_modules/@notifee/react-native/android/libs',
          ],
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          extraProguardRules: `
            -keep public class com.horcrux.svg.** {*;}
            # OpenIAP invokes these Google UCB APIs through reflection.
            -keepclassmembers class com.android.billingclient.api.BillingClient$Builder {
              public com.android.billingclient.api.BillingClient$Builder enableUserChoiceBilling(com.android.billingclient.api.UserChoiceBillingListener);
            }
            -keep interface com.android.billingclient.api.UserChoiceBillingListener { *; }
            -keep class com.android.billingclient.api.UserChoiceDetails { *; }
            -keep class com.android.billingclient.api.UserChoiceDetails$Product { *; }
          `,
          allowBackup: false,
          kotlinVersion: '2.1.20',
          ...(isAmazonAppstoreBuild
            ? {
                packagingOptions: {
                  exclude: ['org/bouncycastle/pqc/crypto/picnic/**'],
                },
              }
            : {}),
        },
      },
    ],
    './plugins/withAndroidGradleMemory',
    [
      'expo-audio',
      {
        microphonePermission:
          'The app requests permission to access the microphone to enable voice input or recording features. By processing the user’s voice, it can provide functions such as voice commands or recordings. Users can revoke this permission at any time from the settings.',
        recordAudioAndroid: !isHorizonOsBuild,
        enableBackgroundPlayback: false,
      },
    ],
    [
      'expo-splash-screen',
      // https://github.com/expo/expo/issues/32515#issuecomment-2533398853
      {
        image: './assets/icon_splash.png',
        backgroundColor: '#EFEFEF',
        dark: {backgroundColor: '#232323'},
        imageWidth: 240,
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-8862850348605557~7400062619',
        iosAppId: 'ca-app-pub-8862850348605557~2002032756',
        delayAppMeasurementInit: true,
        skAdNetworkItems: [
          'cstr6suwn9.skadnetwork',
          '4fzdc2evr5.skadnetwork',
          '4pfyvq9l8r.skadnetwork',
          '2fnua5tdw4.skadnetwork',
          'ydx93a7ass.skadnetwork',
          '5a6flpkh64.skadnetwork',
          'p78axxw29g.skadnetwork',
          'v72qych5uu.skadnetwork',
          'ludvb6z3bs.skadnetwork',
          'cp8zw746q7.skadnetwork',
          '3sh42y64q3.skadnetwork',
          'c6k4g5qg8m.skadnetwork',
          's39g8k73mm.skadnetwork',
          '3qy4746246.skadnetwork',
          'f38h382jlk.skadnetwork',
          'hs6bdukanm.skadnetwork',
          'v4nxqhlyqp.skadnetwork',
          'wzmmz9fp6w.skadnetwork',
          'yclnxrl5pm.skadnetwork',
          't38b2kh725.skadnetwork',
          '7ug5zh24hu.skadnetwork',
          'gta9lk7p23.skadnetwork',
          'vutu7akeur.skadnetwork',
          'y5ghdn5j9k.skadnetwork',
          'n6fk4nfna4.skadnetwork',
          'v9wttpbfk9.skadnetwork',
          'n38lu8286q.skadnetwork',
          '47vhws6wlr.skadnetwork',
          'kbd757ywx3.skadnetwork',
          '9t245vhmpl.skadnetwork',
          'eh6m2bh4zr.skadnetwork',
          'a2p9lx4jpn.skadnetwork',
          '22mmun2rn5.skadnetwork',
          '4468km3ulz.skadnetwork',
          '2u9pt9hc89.skadnetwork',
          '8s468mfl3y.skadnetwork',
          'klf5c3l5u5.skadnetwork',
          'ppxm28t8ap.skadnetwork',
          'ecpz2srf59.skadnetwork',
          'uw77j35x4d.skadnetwork',
          'pwa73g5rt2.skadnetwork',
          'mlmmfzh3r3.skadnetwork',
          '578prtvx9j.skadnetwork',
          '4dzt52r2t5.skadnetwork',
          'e5fvkxwrpn.skadnetwork',
          '8c4e2ghe7u.skadnetwork',
          'zq492l623r.skadnetwork',
          '3rd42ekr43.skadnetwork',
          '3qcr597p9d.skadnetwork',
        ],
      },
    ],
    './plugins/withLevelPlay',
  ],
  owner: 'crossplatformkorea',
  experiments: {
    typedRoutes: true,
    // GitHub Pages serves the web build under a sub path (e.g. /app).
    ...(process.env.EXPO_WEB_BASE_URL
      ? {baseUrl: process.env.EXPO_WEB_BASE_URL}
      : {}),
  },
  extra: {
    iapStore: isHorizonOsBuild
      ? 'horizon'
      : isAmazonAppstoreBuild
        ? 'amazon'
        : 'google',
    ROOT_URL: process.env.ROOT_URL,
    expoProjectId: process.env.expoProjectId,
    eas: {projectId: '89e8816c-1b59-4336-b3ea-110469262de7'},
  },
  assetBundlePatterns: ['**/*'],
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'dev.hyo.martie',
    appleTeamId: 'PRDQGB267K',
    associatedDomains: [`applinks:${DEEP_LINK_HOST}`],
    supportsTablet: true,
    // Store builds outside this checkout get it from the EAS file variable.
    googleServicesFile:
      process.env.GOOGLE_SERVICES_INFO_PLIST ?? './GoogleService-Info.plist',
    infoPlist: {
      NSUserTrackingUsageDescription:
        "App requests permission to track your activity across other companies' apps and websites to provide personalized ads. By understanding your interests, we can deliver ads that are more relevant to you. Users can revoke this permission at any time in the settings.",
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: ['en', 'ko', 'ja'],
      ITSAppUsesNonExemptEncryption: false,
    },
    appStoreUrl: 'https://apps.apple.com/app/martie/id6740057833',
  },
  android: {
    userInterfaceStyle: 'automatic',
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    blockedPermissions: isHorizonOsBuild
      ? HORIZON_BLOCKED_ANDROID_PERMISSIONS
      : undefined,
    permissions: [
      ...(isHorizonOsBuild
        ? HORIZON_ANDROID_PERMISSIONS
        : DEFAULT_ANDROID_PERMISSIONS),
    ],
    package: 'dev.hyo.martie',
    adaptiveIcon: {
      foregroundImage: './assets/icon_round.png',
      backgroundColor: '#EFEFEF',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: MARTIE_LINK_PATH_PREFIXES.map((pathPrefix) => ({
          scheme: 'https',
          host: DEEP_LINK_HOST,
          pathPrefix,
        })),
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=dev.hyo.martie',
  },
  locales: {
    ko: './assets/langs/meta/ko.json',
    en: './assets/langs/meta/en.json',
    ja: './assets/langs/meta/ja.json',
  },
  description:
    'Daily 2-minute trivia with streaks, mistake review, and league ranking.',
  web: {bundler: 'metro', favicon: './assets/favicon.png'},
});
