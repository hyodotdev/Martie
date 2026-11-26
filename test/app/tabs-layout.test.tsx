import React from 'react';
import {render} from '@testing-library/react-native';
import {View} from 'react-native';

const mockTabsScreen = jest.fn((_props: {name: string}) => null);
const mockTabs = Object.assign(
  jest.fn(({children}: {children: React.ReactNode}) => (
    <View accessibilityLabel="tab navigator">{children}</View>
  )),
  {
    Screen: mockTabsScreen,
  },
);

jest.mock('expo-router/js-tabs', () => ({
  __esModule: true,
  default: mockTabs,
  Tabs: mockTabs,
}));

jest.mock('cpk-ui', () => ({
  useCPK: () => ({
    theme: {
      bg: {basic: '#fff'},
      role: {primary: '#f04f6d'},
      text: {basic: '#111', placeholder: '#777'},
    },
  }),
}));

jest.mock('kstyled', () => ({
  css: jest.requireActual('kstyled').css,
}));

jest.mock('../../src/stores/signInRequireModalStore', () => ({
  useSignInRequireModalStore: () => ({
    setVisible: jest.fn(),
  }),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
  useQuery: () => ({
    _id: 'user-id',
    currentStreak: 3,
    displayName: 'Martie Tester',
    email: 'tester@example.com',
    featherCount: 12,
    level: 4,
    longestStreak: 5,
  }),
}));

jest.mock('../../src/uis/TabMySvgIcon', () => () => null);
jest.mock('../../src/uis/TabIndexSvgIcon', () => () => null);
jest.mock('../../src/uis/TabArticleSvgIcon', () => () => null);
jest.mock('../../src/uis/CustomLoadingIndicator', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const {Text} =
    jest.requireActual<typeof import('react-native')>('react-native');

  return function MockCustomLoadingIndicator(): JSX.Element {
    return React.createElement(Text, null, 'Loading Martie');
  };
});

jest.mock('../../convex/_generated/api', () => ({
  api: {
    user: {
      queries: {
        currentUser: 'currentUser',
      },
    },
  },
}));

const mockLogEvent = jest.fn();
const mockSetUser = jest.fn();
const mockUpdateUserAnalyticsProperties = jest.fn();

jest.mock('../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    LOGIN_PROMPT_SHOWN: 'login_prompt_shown',
    TAB_CHANGED: 'tab_changed',
  },
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
  setUser: (...args: unknown[]) => mockSetUser(...args),
  updateUserAnalyticsProperties: (...args: unknown[]) =>
    mockUpdateUserAnalyticsProperties(...args),
}));

jest.mock('../../src/stores/userStore', () => ({
  useUserStore: () => ({
    isPremium: false,
  }),
}));

jest.mock('../../src/hooks/useLocale', () => ({
  useLocale: () => ({
    locale: 'en',
  }),
}));

describe('TabLayout router compatibility', () => {
  beforeEach(() => {
    mockTabs.mockClear();
    mockTabsScreen.mockClear();
    mockLogEvent.mockClear();
    mockSetUser.mockClear();
    mockUpdateUserAnalyticsProperties.mockClear();
  });

  it('uses Expo Router JS tabs for the native tab layout', async () => {
    const TabLayout = jest.requireActual<{
      default: React.ComponentType;
    }>('../../app/(tabs)/_layout').default;
    const {getByLabelText} = await render(<TabLayout />);

    expect(getByLabelText('tab navigator')).toBeTruthy();
    expect(mockTabs).toHaveBeenCalledWith(
      expect.objectContaining({safeAreaInsets: {bottom: 0}}),
      undefined,
    );
    expect(
      jest.requireActual<{unstable_settings: {anchor: string}}>(
        '../../app/(tabs)/_layout',
      ).unstable_settings,
    ).toEqual({anchor: 'index'});
    expect(mockTabsScreen.mock.calls.map(([props]) => props.name)).toEqual([
      'index',
      'articles',
      'my',
    ]);
  });
});
