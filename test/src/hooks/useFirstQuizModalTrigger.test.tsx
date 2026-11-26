import {act, renderHook} from '@testing-library/react-native';
import {useFirstQuizModalTrigger} from '../../../src/hooks/useFirstQuizModalTrigger';

let mockIsFocused = true;
let mockPathname = '/';
let mockWasShown = false;
let mockDidFinishFirstDaily: boolean | undefined = false;
let mockIsAuthenticated = true;
let mockIsAuthLoading = false;
let mockDailyChallenge: {isCompleted: boolean} | null | undefined = {
  isCompleted: false,
};
const mockSetVisible = jest.fn();
const mockSetTriggerPending = jest.fn();
const mockIsGuestDailyCompletedToday = jest.fn(() => false);
const mockUseQuery = jest.fn(
  (..._args: unknown[]) => mockDailyChallenge,
);

jest.mock('expo-router/react-navigation', () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
}));

jest.mock('react-native-mmkv', () => ({
  useMMKVBoolean: () => [mockDidFinishFirstDaily],
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsAuthLoading,
  }),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../../convex/_generated/api', () => ({
  api: {
    dailyChallenge: {
      queries: {
        getToday: 'dailyChallenge.queries.getToday',
      },
    },
  },
}));

jest.mock('../../../src/STRINGS', () => ({
  getLocale: () => 'en',
}));

jest.mock('../../../src/utils/guestDaily', () => ({
  isGuestDailyCompletedToday: () => mockIsGuestDailyCompletedToday(),
}));

jest.mock('../../../src/utils/storage', () => ({
  Storage: {
    DidFinishFirstDaily: 'DidFinishFirstDaily',
  },
}));

jest.mock('../../../src/stores/firstQuizModalStore', () => ({
  useFirstQuizModalStore: (
    selector: (state: {
      setVisible: (isVisible: boolean) => void;
      setTriggerPending: (isPending: boolean) => void;
      wasShown: boolean;
    }) => unknown,
  ) =>
    selector({
      setVisible: mockSetVisible,
      setTriggerPending: mockSetTriggerPending,
      wasShown: mockWasShown,
    }),
}));

describe('useFirstQuizModalTrigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsFocused = true;
    mockPathname = '/';
    mockWasShown = false;
    mockDidFinishFirstDaily = false;
    mockIsAuthenticated = true;
    mockIsAuthLoading = false;
    mockDailyChallenge = {isCompleted: false};
    mockIsGuestDailyCompletedToday.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for Convex auth to finish before showing the first daily modal', async () => {
    mockIsAuthLoading = true;

    const {rerender} = await renderHook(() => useFirstQuizModalTrigger());

    expect(mockUseQuery).toHaveBeenLastCalledWith(
      'dailyChallenge.queries.getToday',
      'skip',
    );

    await act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(mockSetVisible).not.toHaveBeenCalled();
    expect(mockSetTriggerPending).toHaveBeenLastCalledWith(true);

    mockIsAuthLoading = false;
    await rerender(undefined);

    expect(mockUseQuery).toHaveBeenLastCalledWith(
      'dailyChallenge.queries.getToday',
      {language: 'en'},
    );

    await act(() => {
      jest.advanceTimersByTime(599);
    });
    expect(mockSetVisible).not.toHaveBeenCalled();

    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockSetVisible).toHaveBeenCalledWith(true);
    expect(mockSetTriggerPending).toHaveBeenLastCalledWith(false);
  });

  it('skips the first daily modal while a deep-linked quiz route is active', async () => {
    mockPathname = '/daily-quiz';

    await renderHook(() => useFirstQuizModalTrigger());

    expect(mockUseQuery).toHaveBeenLastCalledWith(
      'dailyChallenge.queries.getToday',
      'skip',
    );

    await act(() => {
      jest.advanceTimersByTime(700);
    });

    expect(mockSetVisible).not.toHaveBeenCalled();
  });

  it('releases the banner gate when the daily challenge needs no modal', async () => {
    mockDailyChallenge = {isCompleted: true};

    await renderHook(() => useFirstQuizModalTrigger());

    expect(mockSetVisible).not.toHaveBeenCalled();
    expect(mockSetTriggerPending).toHaveBeenLastCalledWith(false);
  });
});
