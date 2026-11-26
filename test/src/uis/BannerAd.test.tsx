import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import type {TestInstance} from 'test-renderer';
import {AppState, Platform, type AppStateStatus} from 'react-native';
import {ThemeProvider, type DefaultTheme} from 'kstyled';
import {LevelPlayAdSize} from 'unity-levelplay-mediation';
import {light} from '../../../src/theme';
import BannerAd from '../../../src/uis/BannerAd';
import {bannerMethods} from '../../../__mocks__/unity-levelplay-mediation';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 34, left: 0}),
}));
jest.mock('../../../src/utils/analytics', () => ({logEvent: jest.fn()}));
jest.mock('../../../src/utils/error', () => ({logError: jest.fn()}));

const layout = (view: TestInstance) =>
  fireEvent(view, 'layout', {
    nativeEvent: {layout: {x: 0, y: 0, width: 320, height: 50}},
  });

const setup = async () => {
  const result = await render(
    <ThemeProvider theme={{...light, colors: {}} as DefaultTheme}>
      <BannerAd />
    </ThemeProvider>,
  );
  await waitFor(() => expect(result.getByTestId('banner-ad')).toBeTruthy());
  await layout(result.getByTestId('banner-ad'));
  return result;
};

const initialAppState = AppState.currentState;

describe('LevelPlay banner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      writable: true,
      value: 'active',
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    AppState.currentState = initialAppState;
  });

  it('loads once and only reserves ad space after loading', async () => {
    const {getByTestId} = await setup();
    expect(bannerMethods.loadAd).toHaveBeenCalledTimes(1);
    expect(getByTestId('banner-container').props.pointerEvents).toBe('none');
    await act(() =>
      getByTestId('banner-ad').props.listener.onAdLoaded({
        adNetwork: 'ironSource',
        adSize: {height: 50},
      }),
    );
    expect(getByTestId('banner-container').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({height: 84, paddingBottom: 34, opacity: 1}),
      ]),
    );
    expect(getByTestId('banner-container').props.pointerEvents).toBe('auto');
  });

  it('waits for the native layout before the first request', async () => {
    const result = await render(
      <ThemeProvider theme={{...light, colors: {}} as DefaultTheme}>
        <BannerAd />
      </ThemeProvider>,
    );
    await waitFor(() => expect(result.getByTestId('banner-ad')).toBeTruthy());
    expect(bannerMethods.loadAd).not.toHaveBeenCalled();
    await layout(result.getByTestId('banner-ad'));
    await layout(result.getByTestId('banner-ad'));
    expect(bannerMethods.loadAd).toHaveBeenCalledTimes(1);
  });

  it('requests again when the SDK never answers', async () => {
    jest.useFakeTimers();
    await setup();
    expect(bannerMethods.loadAd).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTime(60000));
    expect(bannerMethods.loadAd).toHaveBeenCalledTimes(2);
  });

  it('keeps the native banner mounted and retries with capped backoff', async () => {
    const {getByTestId} = await setup();
    jest.useFakeTimers();
    bannerMethods.loadAd.mockClear();
    for (const delay of [3000, 6000, 12000, 24000, 30000]) {
      await act(() =>
        getByTestId('banner-ad').props.listener.onAdLoadFailed({
          errorCode: 509,
          errorMessage: 'no fill',
        }),
      );
      await act(() => jest.advanceTimersByTime(delay));
    }
    expect(bannerMethods.loadAd).toHaveBeenCalledTimes(5);
  });

  it('destroys the native banner and cancels pending retry on navigation', async () => {
    const {getByTestId, unmount} = await setup();
    jest.useFakeTimers();
    await act(() =>
      getByTestId('banner-ad').props.listener.onAdLoadFailed({errorCode: 509}),
    );
    bannerMethods.loadAd.mockClear();
    await unmount();
    await act(() => jest.advanceTimersByTime(30000));
    expect(bannerMethods.loadAd).not.toHaveBeenCalled();
    expect(bannerMethods.destroy).toHaveBeenCalledTimes(1);
  });

  it('defers failed banner requests until the app returns to the foreground', async () => {
    let changeState: (state: AppStateStatus) => void = () => {};
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        changeState = listener;
        return {remove: jest.fn()};
      });
    const {getByTestId} = await setup();
    jest.useFakeTimers();
    await act(() =>
      getByTestId('banner-ad').props.listener.onAdLoadFailed({errorCode: 509}),
    );
    bannerMethods.loadAd.mockClear();
    await act(() => changeState('background'));
    await act(() => jest.advanceTimersByTime(30000));
    expect(bannerMethods.loadAd).not.toHaveBeenCalled();
    // A late SDK failure in the background must not start another request.
    await act(() =>
      getByTestId('banner-ad').props.listener.onAdLoadFailed({errorCode: 509}),
    );
    await act(() => jest.advanceTimersByTime(30000));
    expect(bannerMethods.loadAd).not.toHaveBeenCalled();
    await act(() => changeState('active'));
    expect(bannerMethods.pauseAutoRefresh).toHaveBeenCalledTimes(1);
    expect(bannerMethods.resumeAutoRefresh).toHaveBeenCalledTimes(1);
    expect(bannerMethods.loadAd).toHaveBeenCalledTimes(1);
  });

  it('uses the SDK banner size when adaptive sizing fails', async () => {
    jest
      .mocked(LevelPlayAdSize.createAdaptiveAdSize)
      .mockRejectedValueOnce(new Error('size unavailable'));
    const {getByTestId} = await setup();
    expect(getByTestId('banner-ad').props.adSize).toEqual({
      width: 320,
      height: 50,
    });
  });

  it('avoids the crashing explicit-width TurboModule call on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await setup();
    expect(LevelPlayAdSize.createAdaptiveAdSize).toHaveBeenCalledWith();
  });
});
