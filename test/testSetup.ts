/**
 * monkey patching the locale to avoid the error:
 * Something went wrong initializing the native ReactLocalization module
 * https://gist.github.com/MoOx/08b465c3eac9e36e683929532472d1e0
 */
import type {GlobalWithFetchMock} from 'jest-fetch-mock';

const customGlobal: GlobalWithFetchMock = global as GlobalWithFetchMock &
  // eslint-disable-next-line no-undef
  typeof globalThis;

// eslint-disable-next-line @typescript-eslint/no-require-imports
customGlobal.fetch = require('jest-fetch-mock');
customGlobal.fetchMock = customGlobal.fetch;

global.__reanimatedWorkletInit = jest.fn();

jest.mock('unity-levelplay-mediation');

jest.mock('expo-router');
jest.mock('@expo/react-native-action-sheet');
jest.mock('expo-font', () => {
  return {useFonts: () => []};
});
jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest'),
);
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// const customGlobal: any = global;
// customGlobal.fetch = require('jest-fetch-mock');
// customGlobal.fetchMock = customGlobal.fetch;

if (!global.Window) {
  Object.defineProperty(global, 'Window', {
    value: window.constructor,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(() => Promise.resolve()),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(() => Promise.resolve()),
  logScreenView: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-google-mobile-ads', () => {
  return {
    TestIds: {
      Banner: 'Banner',
    },
    AdEventType: {
      LOADED: 'LOADED',
      CLOSED: 'CLOSED',
    },
    InterstitialAd: {
      createForAdRequest: jest.fn(() => ({
        load: jest.fn(),
        show: jest.fn(),
        onAdEvent: jest.fn(),
      })),
    },
    RewardedInterstitialAd: {
      createForAdRequest: jest.fn(() => ({
        load: jest.fn(),
        show: jest.fn(),
        onAdEvent: jest.fn(),
      })),
    },
  };
});

jest.mock('@notifee/react-native', () => ({
  createTriggerNotification: jest.fn(),
  displayNotification: jest.fn(),
  getTriggerNotificationIds: jest.fn(),
  cancelTriggerNotification: jest.fn(),
  cancelTriggerNotifications: jest.fn(),
  cancelDisplayedNotifications: jest.fn(),
  createChannel: jest.fn(),
  getChannel: jest.fn(),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  requestPermission: jest.fn(() => Promise.resolve(true)),
  getNotificationSettings: jest.fn(),
  SDK_VERSION: 'TEST',
}));

jest.mock('react-native-keyboard-controller', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-keyboard-controller/jest'),
);

jest.mock('convex/react', () => {
  return {
    ConvexProvider: ({children}: {children: React.ReactNode}) => {
      return children;
    },
    ConvexReactClient: jest.fn().mockReturnValue({}),
  };
});

jest.mock('expo-iap', () => ({
  useIAP: jest.fn(),
  requestPurchase: jest.fn(),
  requestSubscription: jest.fn(),
  getAvailablePurchases: jest.fn(),
  hasActiveSubscriptions: jest.fn(() => Promise.resolve(false)),
  fetchProducts: jest.fn(),
  isBillingProgramAvailableAndroid: jest.fn(() =>
    Promise.resolve({isAvailable: false}),
  ),
  createBillingProgramReportingDetailsAndroid: jest.fn(() =>
    Promise.resolve({externalTransactionToken: ''}),
  ),
  ErrorCode: {
    E_USER_CANCELLED: 'E_USER_CANCELLED',
    E_ALREADY_OWNED: 'E_ALREADY_OWNED',
  },
}));
