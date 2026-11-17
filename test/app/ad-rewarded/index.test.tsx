import {render} from '@testing-library/react-native';
import AdRewarded from '../../../app/ad-rewarded';

// Mock the dependencies
let mockUserEmail: string | null | undefined = 'test@example.com';

jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => {
    if (mockUserEmail === undefined) return undefined;
    return mockUserEmail ? {email: mockUserEmail} : null;
  }),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(() => Promise.resolve()),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(() => Promise.resolve()),
  logScreenView: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string) => key),
}));

// Mock components to return actual React elements
jest.mock('../../../src/features/adReward/LevelPlayReward', () => {
  return {
    __esModule: true,
    default: function LevelPlayReward() {
      const React = jest.requireActual('react');
      return React.createElement(
        'View',
        {testID: 'levelplay-reward'},
        'LevelPlay Reward',
      );
    },
  };
});

jest.mock('../../../src/uis/CustomLoadingIndicator', () => {
  return {
    __esModule: true,
    default: function CustomLoadingIndicator() {
      const React = jest.requireActual('react');
      return React.createElement(
        'View',
        {testID: 'loading-indicator'},
        'Loading...',
      );
    },
  };
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

describe('AdRewarded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when user data is undefined', () => {
    mockUserEmail = undefined;
    const {getByTestId} = render(<AdRewarded />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders LevelPlay for regular logged-in users', () => {
    mockUserEmail = 'test@example.com';
    const {getByTestId} = render(<AdRewarded />);
    expect(getByTestId('levelplay-reward')).toBeTruthy();
  });

  it('renders LevelPlay for reviewer emails', () => {
    mockUserEmail = 'reviewer@example.com';
    const {getByTestId} = render(<AdRewarded />);
    expect(getByTestId('levelplay-reward')).toBeTruthy();
  });

  it('renders LevelPlay for non-logged users', () => {
    mockUserEmail = null;
    const {getByTestId} = render(<AdRewarded />);
    expect(getByTestId('levelplay-reward')).toBeTruthy();
  });
});
