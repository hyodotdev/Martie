import {useCallback, useEffect, useRef, useState} from 'react';
import {
  AppState,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {styled} from 'kstyled';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  LevelPlayAdSize,
  LevelPlayBannerAdView,
  type LevelPlayBannerAdViewMethods,
  type LevelPlayBannerAdViewListener,
} from 'unity-levelplay-mediation';

import {levelPlayConfig} from '../utils/levelPlayConfig';
import {logError} from '../utils/error';
import {logEvent} from '../utils/analytics';

type Props = {style?: StyleProp<ViewStyle>};

const LOAD_TIMEOUT_MS = 60000;

export default function BannerAd({style}: Props): JSX.Element {
  const {width} = useWindowDimensions();
  const {bottom, left, right} = useSafeAreaInsets();
  const availableWidth = Math.floor(width - left - right);
  const [resolvedSize, setResolvedSize] = useState<{
    width: number;
    size: LevelPlayAdSize;
  } | null>(null);
  const adSize =
    resolvedSize?.width === availableWidth ? resolvedSize.size : null;

  useEffect(() => {
    let cancelled = false;
    // SDK 9.3.0's explicit-width iOS bridge mismatches its TurboModule signature.
    const adaptiveSize =
      Platform.OS === 'ios'
        ? LevelPlayAdSize.createAdaptiveAdSize()
        : LevelPlayAdSize.createAdaptiveAdSize(availableWidth);
    void adaptiveSize
      .then((size) => {
        if (!cancelled)
          setResolvedSize({
            width: availableWidth,
            size: size ?? LevelPlayAdSize.BANNER,
          });
      })
      .catch((error: unknown) => {
        logError(error, 'levelplay_banner_size_error');
        if (!cancelled)
          setResolvedSize({
            width: availableWidth,
            size: LevelPlayAdSize.BANNER,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [availableWidth]);

  return adSize ? (
    <LoadedBanner
      key={`${availableWidth}:${adSize.height}`}
      adSize={adSize}
      style={style}
    />
  ) : (
    <Container style={{height: bottom}} pointerEvents="none" />
  );
}

function LoadedBanner({
  adSize,
  style,
}: Props & {adSize: LevelPlayAdSize}): JSX.Element {
  const bannerRef = useRef<LevelPlayBannerAdViewMethods>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const loadedRef = useRef(false);
  // The native view drops a load requested before its first layout, when
  // its ad unit and size are not applied yet.
  const layoutReadyRef = useRef(false);
  const appStateRef = useRef(AppState.currentState ?? 'active');
  const {bottom} = useSafeAreaInsets();
  const [height, setHeight] = useState(0);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = null;
  }, []);

  const loadAd = useCallback(
    function load(): void {
      if (!layoutReadyRef.current || appStateRef.current !== 'active') return;
      clearLoadTimeout();
      // A dropped request reports neither a load nor a failure: ask again.
      loadTimeoutRef.current = setTimeout(load, LOAD_TIMEOUT_MS);
      bannerRef.current?.loadAd();
    },
    [clearLoadTimeout],
  );

  const retry = useCallback(() => {
    if (retryRef.current || appStateRef.current !== 'active') return;
    const delay = Math.min(3000 * 2 ** attemptsRef.current, 30000);
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      attemptsRef.current += 1;
      loadAd();
    }, delay);
  }, [loadAd]);

  useEffect(() => {
    const banner = bannerRef.current;
    const subscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;
      if (state === 'active') {
        banner?.resumeAutoRefresh();
        if (!loadedRef.current && !retryRef.current) loadAd();
      } else {
        banner?.pauseAutoRefresh();
        if (retryRef.current) clearTimeout(retryRef.current);
        retryRef.current = null;
        clearLoadTimeout();
      }
    });
    return () => {
      subscription.remove();
      if (retryRef.current) clearTimeout(retryRef.current);
      clearLoadTimeout();
      banner?.destroy();
    };
  }, [clearLoadTimeout, loadAd]);

  const listener: LevelPlayBannerAdViewListener = {
    onAdLoaded: (info) => {
      clearLoadTimeout();
      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = null;
      attemptsRef.current = 0;
      loadedRef.current = true;
      setHeight(info.adSize?.height ?? adSize.height);
      logEvent('ad_banner_loaded', {
        adProvider: 'levelplay',
        network: info.adNetwork,
      });
    },
    onAdLoadFailed: (error) => {
      clearLoadTimeout();
      if (error.errorCode === 509) {
        logEvent('ad_banner_no_fill', {adProvider: 'levelplay'});
      } else {
        logError(error, 'levelplay_banner_load_failed');
      }
      loadedRef.current = false;
      setHeight(0);
      retry();
    },
    onAdDisplayFailed: (_info, error) => {
      clearLoadTimeout();
      logError(error, 'levelplay_banner_display_failed');
      loadedRef.current = false;
      setHeight(0);
      retry();
    },
  };

  return (
    <Container
      testID="banner-container"
      pointerEvents={height ? 'auto' : 'none'}
      style={[
        {
          height: height + bottom,
          paddingBottom: bottom,
          opacity: height ? 1 : 0,
        },
        style,
      ]}
    >
      <LevelPlayBannerAdView
        ref={bannerRef}
        adUnitId={levelPlayConfig.bannerAdUnitId}
        adSize={adSize}
        placementName={null}
        listener={listener}
        onLayout={() => {
          if (layoutReadyRef.current) return;
          layoutReadyRef.current = true;
          loadAd();
        }}
        style={{width: adSize.width, height: adSize.height}}
      />
    </Container>
  );
}

const Container = styled.View`
  width: 100%;
  background-color: ${({theme}) => theme.bg.basic};
  overflow: hidden;
  justify-content: center;
  align-items: center;
`;
