import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {
  AdsConsentPrivacyOptionsRequirementStatus,
  AdsConsentStatus,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';

import My from '../../app/(tabs)/my';
import {useAdConsentStore} from '../../src/stores/adConsentStore';

const mockShowPrivacyOptionsForm = jest.fn<Promise<AdsConsentInfo>, []>();
const mockCheckPremium = jest.fn(() => Promise.resolve());
const mockTheme = {
  bg: {basic: '#ffffff', paper: '#ffffff'},
  role: {border: '#dddddd', primary: '#2563eb'},
  text: {placeholder: '#999999'},
};

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: jest.fn(),
  AdsConsent: {
    showPrivacyOptionsForm: () => mockShowPrivacyOptionsForm(),
  },
  AdsConsentPrivacyOptionsRequirementStatus: {
    NOT_REQUIRED: 'NOT_REQUIRED',
    REQUIRED: 'REQUIRED',
    UNKNOWN: 'UNKNOWN',
  },
  AdsConsentStatus: {OBTAINED: 'OBTAINED'},
  MaxAdContentRating: {G: 'G'},
}));

// babel-plugin-kstyled compiles styled.View`...` to styled(View).__withStyles().
jest.mock('kstyled', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    css: jest.requireActual<typeof import('kstyled')>('kstyled').css,
    styled: (Component: React.ElementType) => ({
      __withStyles: () =>
        function StyledComponent({
          children,
        }: {
          children?: React.ReactNode;
        }): JSX.Element {
          return React.createElement(Component, null, children);
        },
    }),
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const {Text} =
    jest.requireActual<typeof import('react-native')>('react-native');

  function TextComponent({
    children,
  }: {
    children?: React.ReactNode;
  }): JSX.Element {
    return React.createElement(Text, null, children);
  }

  return {
    Icon: () => null,
    SwitchToggle: () => null,
    Typography: {
      Body1: TextComponent,
      Body2: TextComponent,
      Body3: TextComponent,
    },
    useCPK: () => ({
      changeThemeType: jest.fn(),
      media: {isTablet: false},
      theme: mockTheme,
    }),
  };
});

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const {View} =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    FlashList: <T extends {title: string}>({
      data,
      renderItem,
    }: {
      data: T[];
      renderItem: (info: {item: T; index: number}) => React.ReactNode;
    }) =>
      React.createElement(
        View,
        null,
        data.map((item, index) =>
          React.createElement(
            React.Fragment,
            {key: item.title},
            renderItem({item, index}),
          ),
        ),
      ),
  };
});

jest.mock('expo-router', () => ({
  Redirect: () => null,
  Stack: {Screen: () => null},
  useRouter: () => ({navigate: jest.fn()}),
}));

jest.mock('expo-linking', () => ({openSettings: jest.fn()}));
jest.mock('expo-system-ui', () => ({setBackgroundColorAsync: jest.fn()}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => Promise.resolve({status: 'denied'}),
}));

jest.mock('react-native-mmkv', () => ({
  useMMKVBoolean: () => [false, jest.fn()],
}));

jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({showActionSheetWithOptions: jest.fn()}),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({isAuthenticated: true}),
  useMutation: () => jest.fn(),
  useQuery: () => undefined,
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    referral: {
      mutations: {generateReferralCode: 'generateReferralCode'},
      queries: {getMyReferralInfo: 'getMyReferralInfo'},
    },
    user: {queries: {currentUser: 'currentUser'}},
    quizSubmission: {queries: {amIAdmin: 'amIAdmin'}},
  },
}));

jest.mock('../../src/theme', () => ({
  dark: {bg: {basic: '#000000'}},
  light: {bg: {basic: '#ffffff'}},
}));

jest.mock('../../src/utils/storage', () => ({
  storage: {getString: () => undefined},
  Storage: {Locale: 'Locale', ThemeType: 'ThemeType'},
}));

jest.mock('../../src/utils/analytics', () => ({
  logEvent: jest.fn(),
  logScreenView: jest.fn(),
}));

jest.mock('../../src/utils/error', () => ({
  logError: jest.fn(),
}));

jest.mock('../../src/hooks/useLocale', () => ({
  useLocale: () => ({
    locale: 'en',
    setLocale: jest.fn(),
    supportedLocales: ['en'],
  }),
}));

jest.mock('../../src/stores/userStore', () => ({
  useUserStore: (
    selector: (state: {checkPremium: () => Promise<void>}) => unknown,
  ) => selector({checkPremium: mockCheckPremium}),
}));

jest.mock('../../app/_Tabs/components/MyCustomHeader', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../app/_Tabs/components/SectionHeader', () => ({
  __esModule: true,
  default: () => null,
}));

describe('My ad privacy choices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAdConsentStore.setState({
      canRequestAds: true,
      isMobileAdsReady: true,
      privacyOptionsRequired: false,
    });
  });

  it('hides the row when UMP does not require a privacy options entry point', async () => {
    const {getByLabelText, queryByLabelText} = await render(<My />);

    expect(getByLabelText('Dark Mode')).toBeTruthy();
    expect(queryByLabelText('Ad privacy choices')).toBeNull();
  });

  it('opens the privacy options form and applies the new consent when required', async () => {
    useAdConsentStore.setState({privacyOptionsRequired: true});
    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: false,
      isConsentFormAvailable: true,
      privacyOptionsRequirementStatus:
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      status: AdsConsentStatus.OBTAINED,
    });
    const {getByLabelText} = await render(<My />);

    await fireEvent.press(getByLabelText('Ad privacy choices'));

    await waitFor(() =>
      expect(useAdConsentStore.getState().isMobileAdsReady).toBe(false),
    );
    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1);
    expect(useAdConsentStore.getState()).toMatchObject({
      canRequestAds: false,
      privacyOptionsRequired: true,
    });
    expect(getByLabelText('Ad privacy choices')).toBeTruthy();
  });
});
