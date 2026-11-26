import {useEffect, useRef, useState} from 'react';
import {AppState, Platform, StatusBar, View} from 'react-native';
import type {AppStateStatus} from 'react-native';
import {GestureHandlerRootView, RectButton} from 'react-native-gesture-handler';
import {styled, css} from 'kstyled';
import {Stack, usePathname, useRouter} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import RootProvider from '../src/providers';
import {Toasts} from '@backpackapp-io/react-native-toast';
import {Icon, setFontFamily, useCPK} from 'cpk-ui';
import {storage, Storage} from '../src/utils/storage';
import CustomLoadingIndicator from '../src/uis/CustomLoadingIndicator';
import {useFonts} from 'expo-font';
import {FONT_NANUM_B, FONT_NANUM_L, FONT_NANUM_R} from '../src/icons';
import SignInRequireModal from '../src/modals/SignInRequireModal';
import * as SecureStore from 'expo-secure-store';
import {ConvexAuthProvider} from '@convex-dev/auth/react';
import {ConvexReactClient} from 'convex/react';
import {api} from '../convex/_generated/api';
import {useLegacySessionUpgrade} from '../src/hooks/useLegacySessionUpgrade';
import {
  authStorageNamespace,
  type KeyValueStorage,
} from '../src/utils/legacySession';
import ErrorBoundary from 'react-native-error-boundary';
import DisplayNameModal from '../src/modals/DisplayNameModal';
import ForceUpdateModal from '../src/modals/ForceUpdateModal';
import FirstQuizModal from '../src/modals/FirstQuizModal';
import {useOtaUpdate} from '../src/hooks/useOtaUpdate';
import {useProductAnalytics} from '../src/hooks/useProductAnalytics';
import {useAlternativeBillingRecovery} from '../src/hooks/useAlternativeBillingRecovery';
import {
  logEvent,
  LOG_EVENTS,
  registerAnalyticsSuperProperties,
} from '../src/utils/analytics';
import {handleErrorConsole, logError} from '../src/utils/error';
import BannerAd from '../src/uis/BannerAd';
import {useIAP} from '../src/utils/iap';
import {ENABLE_ANDROID_ALTERNATIVE_BILLING} from '../src/utils/paymentMode';
import {useUserStore} from '../src/stores/userStore';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNotificationPermissionFlow} from '../src/hooks/useNotificationPermissionFlow';
import {
  ACQUISITION_CHANNELS,
  ensureFirstLaunchTimestamp,
  getAcquisitionSource,
  setAcquisitionSourceOnce,
} from '../src/utils/acquisition';
import StreakRecoveryModal from '../src/modals/StreakRecoveryModal';
import * as Linking from 'expo-linking';
import {shouldShowBannerAd} from '../src/utils/bannerAds';
import {useFirstQuizModalStore} from '../src/stores/firstQuizModalStore';
import {useSignInRequireModalStore} from '../src/stores/signInRequireModalStore';
import {useDisplayNameModalStore} from '../src/stores/displayNameModalState';
import {useAdConsentStore} from '../src/stores/adConsentStore';

SplashScreen.preventAutoHideAsync();

const appModuleStartedAt = Date.now();

function EmptyFallback(): null {
  return null;
}

setFontFamily({
  heading: {
    normal: 'NanumSquareRoundOTFR',
    bold: 'NanumSquareRoundOTFB',
    thin: 'NanumSquareRoundOTFF',
  },
  body: {
    normal: 'NanumSquareRoundOTFR',
    bold: 'NanumSquareRoundOTFB',
    thin: 'NanumSquareRoundOTFF',
  },
});

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const isNativeApp = Platform.OS === 'android' || Platform.OS === 'ios';

// Where Convex Auth keeps the session: secure storage in the app, and its
// default, localStorage, on the web.
const authStorage: KeyValueStorage = isNativeApp
  ? secureStorage
  : {
      getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
      setItem: async (key, value) =>
        globalThis.localStorage?.setItem(key, value),
      removeItem: async (key) => globalThis.localStorage?.removeItem(key),
    };

function pickFirstQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value.find((item) => item.length > 0);
  return value && value.length > 0 ? value : undefined;
}

function getSourceFromUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const {queryParams} = Linking.parse(url);
    if (!queryParams) return undefined;
    return (
      pickFirstQueryValue(queryParams.source) ??
      pickFirstQueryValue(queryParams.utm_source)
    );
  } catch {
    return undefined;
  }
}

function App(): JSX.Element | null {
  useProductAnalytics();
  useAlternativeBillingRecovery();

  const [appFontsLoaded] = useFonts({
    NanumSquareRoundOTFB: FONT_NANUM_B,
    NanumSquareRoundOTFR: FONT_NANUM_R,
    NanumSquareRoundOTFF: FONT_NANUM_L,
  });

  const {assetLoaded, theme} = useCPK();
  const {isChecking, checkUpdate} = useOtaUpdate();
  const {back, replace} = useRouter();
  const pathname = usePathname();
  const isDarkMode = storage.getBoolean(Storage.ThemeType);
  const {connected} = useIAP({
    enableBillingProgramAndroid: ENABLE_ANDROID_ALTERNATIVE_BILLING
      ? 'user-choice-billing'
      : undefined,
  });
  const {checkPremium, isPremium} = useUserStore();
  const {bottom} = useSafeAreaInsets();
  const isMobileAdsReady = useAdConsentStore((state) => state.isMobileAdsReady);
  const requestAdConsent = useAdConsentStore((state) => state.requestConsent);
  const didTrackAppStartTraceRef = useRef(false);
  const isFirstQuizModalVisible = useFirstQuizModalStore(
    (state) => state.visible,
  );
  const isFirstQuizModalTriggerPending = useFirstQuizModalStore(
    (state) => state.isTriggerPending,
  );
  const isSignInRequireModalVisible = useSignInRequireModalStore(
    (state) => state.visible,
  );
  const isDisplayNameModalVisible = useDisplayNameModalStore(
    (state) => state.visible,
  );
  const [isForceUpdateModalVisible, setForceUpdateModalVisible] =
    useState(false);
  const [isStreakRecoveryModalVisible, setStreakRecoveryModalVisible] =
    useState(false);
  const hasBlockingOverlay =
    isFirstQuizModalVisible ||
    (pathname === '/' && isFirstQuizModalTriggerPending) ||
    isSignInRequireModalVisible ||
    isDisplayNameModalVisible ||
    isForceUpdateModalVisible ||
    isStreakRecoveryModalVisible;
  const showBannerAd = shouldShowBannerAd(
    pathname,
    isPremium,
    hasBlockingOverlay,
  );

  useEffect(() => {
    // Consent settles before LevelPlay initializes or any ad loads.
    void requestAdConsent();
    const subscription = AppState.addEventListener('change', (state) => {
      const consent = useAdConsentStore.getState();
      if (
        state === 'active' &&
        consent.canRequestAds &&
        !consent.isMobileAdsReady
      ) {
        void requestAdConsent();
      }
    });
    return () => subscription.remove();
  }, [requestAdConsent]);

  useEffect(() => {
    const initializeIAP = async () => {
      if (!connected) {
        return;
      }

      try {
        // Check premium subscription status
        await checkPremium();
      } catch (error) {
        logError(error, 'iap_initialization_error');
      }
    };

    initializeIAP();
  }, [connected, checkPremium]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const source = getSourceFromUrl(await Linking.getInitialURL());
        if (source) {
          const isFirstTouch = setAcquisitionSourceOnce(source);
          const acquisitionSource = getAcquisitionSource() ?? source;
          registerAnalyticsSuperProperties({
            acquisition_source: acquisitionSource,
          });
          logEvent(LOG_EVENTS.ACQUISITION_SOURCE_CAPTURED, {
            source,
            acquisition_source: acquisitionSource,
            isFirstTouch,
          });
        }
      } catch {
        // Malformed URLs are harmless — just skip attribution.
      }

      const existingFirstLaunchAt = storage.getNumber(Storage.FirstLaunchAt);
      const firstLaunchAt = ensureFirstLaunchTimestamp();
      const isFirstLaunch = !existingFirstLaunchAt;
      const source = getAcquisitionSource() ?? ACQUISITION_CHANNELS.ORGANIC;

      logEvent(LOG_EVENTS.APP_LAUNCH, {
        isFirstLaunch,
        firstLaunchAt,
        source,
        platform: Platform.OS,
      });
      if (isFirstLaunch) {
        logEvent(LOG_EVENTS.FIRST_OPEN, {
          firstLaunchAt,
          source,
          platform: Platform.OS,
        });
      }

      try {
        await checkUpdate();
      } catch (e) {
        console.error('Failed to check update on startup:', e);
      }
    };

    initializeApp();
  }, [checkUpdate]);

  useNotificationPermissionFlow();

  // Acquisition source attribution — captures `?source=...` (or `?utm_source=...`)
  // from initial URL and any subsequent deep links opened while the app is
  // running. First-touch wins, so this is safe to run on every launch.
  useEffect(() => {
    const captureFromUrl = (url: string | null | undefined) => {
      const source = getSourceFromUrl(url);
      if (!source) return;
      const isFirstTouch = setAcquisitionSourceOnce(source);
      const acquisitionSource = getAcquisitionSource() ?? source;
      registerAnalyticsSuperProperties({
        acquisition_source: acquisitionSource,
      });
      logEvent(LOG_EVENTS.ACQUISITION_SOURCE_CAPTURED, {
        source,
        acquisition_source: acquisitionSource,
        isFirstTouch,
      });
    };

    const sub = Linking.addEventListener('url', ({url}) => captureFromUrl(url));
    return () => sub.remove();
  }, []);

  // Session lifecycle events — paired with AppState transitions so cohort
  // retention dashboards can compute true session length, not just launches.
  //
  // Debounced: a brief background-then-active flicker (e.g. opening the
  // share sheet, system permission dialog, push to a different app and
  // back) should not create a new session. We only end the session if the
  // user stays backgrounded past SESSION_END_GRACE_MS, and we bucket
  // durations to keep Firebase param cardinality manageable.
  const sessionStartedAtRef = useRef<number | null>(null);
  const sessionEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const SESSION_END_GRACE_MS = 30_000;

    const bucketDuration = (ms: number): string => {
      if (ms < 30_000) return '0-30s';
      if (ms < 120_000) return '30s-2m';
      if (ms < 600_000) return '2m-10m';
      if (ms < 1_800_000) return '10m-30m';
      return '30m+';
    };

    const startSession = () => {
      const startedAt = Date.now();
      sessionStartedAtRef.current = startedAt;
      logEvent(LOG_EVENTS.SESSION_START);
    };
    const endSession = () => {
      const startedAt = sessionStartedAtRef.current;
      if (startedAt == null) return;
      const durationMs = Date.now() - startedAt;
      sessionStartedAtRef.current = null;
      logEvent(LOG_EVENTS.SESSION_END, {
        durationMs,
        durationBucket: bucketDuration(durationMs),
      });
    };
    const cancelPendingEnd = () => {
      if (sessionEndTimerRef.current) {
        clearTimeout(sessionEndTimerRef.current);
        sessionEndTimerRef.current = null;
      }
    };
    const scheduleEnd = () => {
      cancelPendingEnd();
      sessionEndTimerRef.current = setTimeout(() => {
        sessionEndTimerRef.current = null;
        endSession();
      }, SESSION_END_GRACE_MS);
    };

    startSession();

    const handleChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // Returned from a brief excursion before grace expired — keep the
        // existing session alive instead of starting a new one.
        cancelPendingEnd();
        if (sessionStartedAtRef.current == null) startSession();
      } else if (nextState === 'background' || nextState === 'inactive') {
        scheduleEnd();
      }
    };
    const sub = AppState.addEventListener('change', handleChange);
    return () => {
      cancelPendingEnd();
      endSession();
      sub.remove();
    };
  }, []);

  useEffect(() => {
    StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
  }, [isDarkMode]);

  useEffect(() => {
    if (appFontsLoaded && assetLoaded && !isChecking) {
      if (!didTrackAppStartTraceRef.current) {
        didTrackAppStartTraceRef.current = true;
        logEvent('performance_trace', {
          trace_name: 'app_start',
          duration_ms: Date.now() - appModuleStartedAt,
          source: 'root_layout_ready',
        });
      }
      SplashScreen.hideAsync();
    }
  }, [appFontsLoaded, assetLoaded, isChecking]);

  if (!appFontsLoaded || !assetLoaded || isChecking) {
    return <CustomLoadingIndicator />;
  }

  return (
    <Container>
      <Content>
        <Stack
          screenOptions={{
            headerStyle: {backgroundColor: theme.bg.basic},
            contentStyle: {backgroundColor: theme.bg.basic},
            headerShadowVisible: false,
            headerTintColor: theme.text.label,
            headerTitleStyle: {
              fontWeight: 'bold',
              color: theme.text.basic,
            },
            headerLeft: ({canGoBack}) =>
              canGoBack && (
                <RectButton
                  hitSlop={{top: 8, left: 8, right: 8, bottom: 8}}
                  onPress={(pointerInside) =>
                    pointerInside && (canGoBack ? back() : replace('/'))
                  }
                  style={css`
                    padding: 8px;
                    border-radius: 48px;
                  `}
                >
                  <Icon name="CaretLeftBold" size={24} />
                </RectButton>
              ),
          }}
        >
          <Stack.Screen name="(tabs)" options={{headerShown: false}} />
          {/* Auth flow screens configured at layout level */}
          <Stack.Screen
            name="sign-in"
            options={{presentation: 'modal', headerShown: false}}
          />
          <Stack.Screen
            name="sign-in-code"
            options={{presentation: 'modal', headerShown: false}}
          />
          <Stack.Screen
            name="sign-in-link"
            options={{presentation: 'modal', headerShown: false}}
          />
          {/* The practice quiz replaces itself with this screen. Hiding the
              header here, not only from inside the screen, keeps iOS from
              pushing it with the default header and its raw route title. */}
          <Stack.Screen name="quiz-final" options={{headerShown: false}} />
          {/* Add modals or screens here */}
        </Stack>
      </Content>
      {!showBannerAd || !isMobileAdsReady ? (
        <View
          style={css`
            height: ${bottom + 'px'};
          `}
        />
      ) : (
        <BannerAd />
      )}
      <ForceUpdateModal onVisibilityChange={setForceUpdateModalVisible} />
      <SignInRequireModal />
      <DisplayNameModal />
      <FirstQuizModal />
      <ErrorBoundary
        FallbackComponent={EmptyFallback}
        onError={handleErrorConsole}
      >
        <StreakRecoveryModal
          onVisibilityChange={setStreakRecoveryModalVisible}
        />
      </ErrorBoundary>
      <Toasts />
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
`;

const Content = styled.View`
  flex: 1;
  background-color: ${({theme}) => theme.bg.basic};
  align-self: center;
  width: 100%;
`;

function RootLayout(): JSX.Element | null {
  const isDarkMode = storage.getBoolean(Storage.ThemeType);
  // The splash stays up until the session from before 2.8.0 is traded.
  const isAuthStorageReady = useLegacySessionUpgrade({
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL!,
    storage: authStorage,
  });
  if (!isAuthStorageReady) return null;

  return (
    <GestureHandlerRootView
      style={css`
        flex: 1;
        align-self: stretch;
      `}
    >
      <RootProvider initialThemeType={isDarkMode ? 'dark' : 'light'}>
        <ConvexAuthProvider
          client={convex}
          api={{
            refreshSession: api.emailAuth.refreshSession,
            signOut: api.emailAuth.signOut,
            isAuthenticated: api.emailAuth.isAuthenticated,
          }}
          storage={isNativeApp ? secureStorage : undefined}
          // Convex Auth 0.0.x used the same key names under the bare
          // deployment URL; `useLegacySessionUpgrade` trades those.
          storageNamespace={authStorageNamespace(
            process.env.EXPO_PUBLIC_CONVEX_URL!,
          )}
          // Martie has no OAuth sign-in to resume from a redirect.
          ambientSignIns={[]}
        >
          <App />
        </ConvexAuthProvider>
      </RootProvider>
    </GestureHandlerRootView>
  );
}

export default RootLayout;
