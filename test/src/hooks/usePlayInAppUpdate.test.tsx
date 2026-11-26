import {renderHook, waitFor} from '@testing-library/react-native';
import {Platform} from 'react-native';

import {usePlayInAppUpdate} from '../../../src/hooks/usePlayInAppUpdate';

const mockCheckForUpdate = jest.fn();
const mockStartUpdate = jest.fn();
let mockIapStore = 'google';

jest.mock('expo-in-app-updates', () => ({
  checkForUpdate: () => mockCheckForUpdate(),
  startUpdate: (immediate: boolean) => mockStartUpdate(immediate),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return {extra: {iapStore: mockIapStore}};
    },
  },
}));

const setDev = (value: boolean) =>
  Object.defineProperty(globalThis, '__DEV__', {configurable: true, value});

const update = {
  updateAvailable: true,
  flexibleAllowed: true,
  immediateAllowed: true,
};

describe('usePlayInAppUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIapStore = 'google';
    setDev(false);
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    mockCheckForUpdate.mockResolvedValue(update);
    mockStartUpdate.mockResolvedValue(true);
  });

  afterAll(() => setDev(true));

  it('starts the immediate update when this version must update', async () => {
    await renderHook(() => usePlayInAppUpdate(true));

    await waitFor(() => expect(mockStartUpdate).toHaveBeenCalledWith(true));
  });

  it('starts a flexible update otherwise', async () => {
    await renderHook(() => usePlayInAppUpdate(false));

    await waitFor(() => expect(mockStartUpdate).toHaveBeenCalledWith(false));
  });

  it('waits for the force-update version before checking', async () => {
    const {rerender} = await renderHook(
      ({force}: {force: boolean | undefined}) => usePlayInAppUpdate(force),
      {initialProps: {force: undefined}},
    );
    expect(mockCheckForUpdate).not.toHaveBeenCalled();

    await rerender({force: true});

    await waitFor(() => expect(mockStartUpdate).toHaveBeenCalledWith(true));
    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
  });

  it('checks only once per launch', async () => {
    const {rerender} = await renderHook(
      ({force}: {force: boolean}) => usePlayInAppUpdate(force),
      {initialProps: {force: false}},
    );
    await waitFor(() => expect(mockStartUpdate).toHaveBeenCalledTimes(1));

    await rerender({force: true});

    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
  });

  it('does nothing when Play has no update', async () => {
    mockCheckForUpdate.mockResolvedValue({updateAvailable: false});

    await renderHook(() => usePlayInAppUpdate(true));

    await waitFor(() => expect(mockCheckForUpdate).toHaveBeenCalled());
    expect(mockStartUpdate).not.toHaveBeenCalled();
  });

  it.each(['amazon', 'horizon'])('skips %s builds', async (store) => {
    mockIapStore = store;

    await renderHook(() => usePlayInAppUpdate(true));

    expect(mockCheckForUpdate).not.toHaveBeenCalled();
  });

  it('skips iOS and development builds', async () => {
    Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});
    await renderHook(() => usePlayInAppUpdate(true));

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    setDev(true);
    await renderHook(() => usePlayInAppUpdate(true));

    expect(mockCheckForUpdate).not.toHaveBeenCalled();
  });

  it('keeps the app running when the Play check fails', async () => {
    mockCheckForUpdate.mockRejectedValue(new Error('ERR_CHECK_FOR_UPDATE'));

    await renderHook(() => usePlayInAppUpdate(true));

    await waitFor(() => expect(mockCheckForUpdate).toHaveBeenCalled());
    expect(mockStartUpdate).not.toHaveBeenCalled();
  });
});
