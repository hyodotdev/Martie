import {renderHook, waitFor} from '@testing-library/react-native';

import {useLegacySessionUpgrade} from '../../../src/hooks/useLegacySessionUpgrade';

const mockUpgradeLegacySession = jest.fn();
const mockLogError = jest.fn();

jest.mock('../../../src/utils/legacySession', () => ({
  upgradeLegacySession: (args: unknown) => mockUpgradeLegacySession(args),
}));

jest.mock('convex/browser', () => ({ConvexHttpClient: jest.fn()}));

jest.mock('../../../convex/_generated/api', () => ({
  api: {emailAuth: {upgradeLegacySession: 'emailAuth.upgradeLegacySession'}},
}));

jest.mock('../../../src/utils/error', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

describe('useLegacySessionUpgrade', () => {
  beforeEach(() => jest.clearAllMocks());

  it('holds Convex Auth 2 back until the old session is traded', async () => {
    let finish: () => void = () => {};
    mockUpgradeLegacySession.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );

    const {result} = await renderHook(() =>
      useLegacySessionUpgrade({convexUrl: 'https://x.convex.cloud', storage}),
    );

    expect(result.current).toBe(false);
    finish();
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('still lets the app start when the trade fails', async () => {
    mockUpgradeLegacySession.mockRejectedValue(new Error('offline'));

    const {result} = await renderHook(() =>
      useLegacySessionUpgrade({convexUrl: 'https://x.convex.cloud', storage}),
    );

    await waitFor(() => expect(result.current).toBe(true));
    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      'legacy-session-upgrade',
    );
  });
});
