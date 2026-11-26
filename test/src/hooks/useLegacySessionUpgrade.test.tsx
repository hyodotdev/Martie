import {renderHook, waitFor} from '@testing-library/react-native';
import {Platform} from 'react-native';

import {useLegacySessionUpgrade} from '../../../src/hooks/useLegacySessionUpgrade';

const mockGetItem = jest.fn();
const mockDeleteItem = jest.fn();
const mockUpgrade = jest.fn();
const mockSetSession = jest.fn();
let mockAuth = {isLoading: false, isAuthenticated: false};

jest.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => mockGetItem(key),
  deleteItemAsync: (key: string) => mockDeleteItem(key),
}));

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({setSession: mockSetSession}),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => mockAuth,
  useMutation: () => mockUpgrade,
}));

jest.mock('../../../convex/_generated/api', () => ({
  api: {emailAuth: {upgradeLegacySession: 'emailAuth.upgradeLegacySession'}},
}));

jest.mock('../../../src/utils/error', () => ({logError: jest.fn()}));

const TOKENS = {accessToken: 'a', refreshToken: 'r'};

describe('useLegacySessionUpgrade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {isLoading: false, isAuthenticated: false};
    Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});
    mockDeleteItem.mockResolvedValue(undefined);
  });

  it('trades the stored session for a new one and drops the old keys', async () => {
    mockGetItem.mockResolvedValue('token|session');
    mockUpgrade.mockResolvedValue({status: 'complete', tokens: TOKENS});

    await renderHook(() => useLegacySessionUpgrade());

    await waitFor(() => expect(mockDeleteItem).toHaveBeenCalledTimes(4));
    expect(mockUpgrade).toHaveBeenCalledWith({refreshToken: 'token|session'});
    expect(mockSetSession).toHaveBeenCalledWith(TOKENS);
    expect(mockGetItem.mock.calls[0][0]).toMatch(/^__convexAuthRefreshToken_/);
  });

  it('drops a session the server no longer accepts', async () => {
    mockGetItem.mockResolvedValue('token|session');
    mockUpgrade.mockResolvedValue({status: 'error', error: 'INVALID_SESSION'});

    await renderHook(() => useLegacySessionUpgrade());

    await waitFor(() => expect(mockDeleteItem).toHaveBeenCalledTimes(4));
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('keeps the old keys to retry after a network failure', async () => {
    mockGetItem.mockResolvedValue('token|session');
    mockUpgrade.mockRejectedValue(new Error('offline'));

    await renderHook(() => useLegacySessionUpgrade());

    await waitFor(() => expect(mockUpgrade).toHaveBeenCalled());
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it('reads the web session from localStorage', async () => {
    Object.defineProperty(Platform, 'OS', {configurable: true, value: 'web'});
    const localStorageMock = {
      getItem: jest.fn((key: string) =>
        key.startsWith('__convexAuthRefreshToken_') ? 'token|session' : null,
      ),
      removeItem: jest.fn(),
    };
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });
    mockUpgrade.mockResolvedValue({status: 'complete', tokens: TOKENS});

    await renderHook(() => useLegacySessionUpgrade());

    await waitFor(() =>
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(4),
    );
    expect(mockUpgrade).toHaveBeenCalledWith({refreshToken: 'token|session'});
    expect(mockSetSession).toHaveBeenCalledWith(TOKENS);
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('does nothing without a stored session or while auth loads', async () => {
    mockGetItem.mockResolvedValue(null);
    await renderHook(() => useLegacySessionUpgrade());
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());
    expect(mockUpgrade).not.toHaveBeenCalled();

    mockGetItem.mockClear();
    mockAuth = {isLoading: true, isAuthenticated: false};
    await renderHook(() => useLegacySessionUpgrade());
    expect(mockGetItem).not.toHaveBeenCalled();
  });
});
