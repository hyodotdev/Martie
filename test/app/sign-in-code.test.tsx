import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {pressWithoutWaiting} from '../pressWithoutWaiting';
import type {ReactNode} from 'react';
import React from 'react';

const mockBack = jest.fn();
const mockDismissAll = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockSignInWithReviewCode = jest.fn();
const mockSendSignInLink = jest.fn();
const mockSetSession = jest.fn();
const mockSavePendingSignInLink = jest.fn();
const mockToastSuccess = jest.fn();
const mockCreateUserProfile = jest.fn();
const mockLogError = jest.fn();
let mockEmailParam: string | undefined = 'USER%40Example.COM';
let mockIsAuthenticated = false;

jest.mock('kstyled', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');

  const createStyled = (Component: any) => {
    const createComponent = () => {
      function StyledComponent({children, ...props}: {children?: ReactNode}) {
        return React.createElement(Component, props, children);
      }

      return StyledComponent;
    };
    const template = () => createComponent();
    template.__withStyles = () => createComponent();
    return template;
  };

  const styled = new Proxy(createStyled, {
    get: (_target, componentName: string) =>
      createStyled(ReactNative[componentName]),
  });

  return {
    styled,
    css: jest.requireActual('kstyled').css,
  };
});

jest.mock('expo-router', () => ({
  Stack: {Screen: () => null},
  useIsFocused: () => true,
  useLocalSearchParams: () => ({email: mockEmailParam}),
  useRouter: () => ({
    back: mockBack,
    dismissAll: mockDismissAll,
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TextInput, TouchableOpacity, View} =
    jest.requireActual('react-native');

  const TextComponent = ({
    children,
    onPress,
  }: {
    children: ReactNode;
    onPress?: () => void;
  }) => React.createElement(Text, {onPress}, children);

  return {
    Button: ({
      accessibilityLabel,
      accessibilityRole,
      disabled,
      loading,
      onPress,
      text,
    }: {
      accessibilityLabel?: string;
      accessibilityRole?: string;
      disabled?: boolean;
      loading?: boolean;
      onPress: () => void;
      text: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel,
          accessibilityRole,
          accessibilityState: {busy: !!loading, disabled: !!disabled},
          disabled,
          onPress,
          testID: 'submit-button',
        },
        React.createElement(Text, null, text),
      ),
    CustomPressable: ({
      accessibilityLabel,
      accessibilityRole,
      children,
      onPress,
    }: {
      accessibilityLabel?: string;
      accessibilityRole?: string;
      children: ReactNode;
      onPress: () => void;
    }) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel,
          accessibilityRole,
          onPress,
          testID: 'back-button',
        },
        children,
      ),
    EditText: ({
      error,
      onChangeText,
      placeholder,
      value,
    }: {
      error?: string;
      onChangeText: (text: string) => void;
      placeholder?: string;
      value: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(TextInput, {
          onChangeText,
          placeholder,
          testID: 'code-input',
          value,
        }),
        !!error && React.createElement(Text, {testID: 'code-error'}, error),
      ),
    Icon: () => React.createElement(Text),
    Typography: {
      Body2: TextComponent,
      Body3: TextComponent,
      Heading2: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {basic: '#ffffff'},
        role: {success: '#00aa55'},
        text: {label: '#777777'},
      },
    }),
  };
});

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({
    setSession: mockSetSession,
  }),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({isAuthenticated: mockIsAuthenticated}),
  useMutation: (ref: string) =>
    ref === 'emailAuth.signInWithReviewCode'
      ? mockSignInWithReviewCode
      : ref === 'emailAuth.sendSignInLink'
        ? mockSendSignInLink
        : mockCreateUserProfile,
}));

jest.mock('../../src/utils/signInLink', () => ({
  savePendingSignInLink: (...args: unknown[]) =>
    mockSavePendingSignInLink(...args),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    emailAuth: {
      sendSignInLink: 'emailAuth.sendSignInLink',
      signInWithReviewCode: 'emailAuth.signInWithReviewCode',
    },
    dailyChallenge: {
      mutations: {
        completeDailyChallenge:
          'dailyChallenge.mutations.completeDailyChallenge',
      },
    },
    referral: {
      mutations: {
        applyReferral: 'referral.mutations.applyReferral',
      },
    },
    user: {
      mutations: {
        createUserProfile: 'user.mutations.createUserProfile',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  getLocale: () => 'en',
  t: (key: string) => key,
}));

jest.mock('../../src/utils/analytics', () => ({
  LOG_EVENTS: {SIGNUP_COMPLETED: 'signup_completed'},
  logEvent: jest.fn(),
  logScreenView: jest.fn(),
  registerAnalyticsSuperProperties: jest.fn(),
}));

jest.mock('../../src/utils/error', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock('../../src/utils/storage', () => ({
  Storage: {
    DidFireSignupCompleted: 'DidFireSignupCompleted',
    GuestDailyResult: 'GuestDailyResult',
    PendingReferralCode: 'PendingReferralCode',
  },
  storage: {
    delete: jest.fn(),
    getBoolean: jest.fn(),
    getString: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('../../src/utils/acquisition', () => ({
  getAcquisitionSource: jest.fn(),
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    error: jest.fn(),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

// eslint-disable-next-line import/first
import SignInCode from '../../app/sign-in-code';
// eslint-disable-next-line import/first
import {
  logEvent,
  registerAnalyticsSuperProperties,
} from '../../src/utils/analytics';
// eslint-disable-next-line import/first
import {Storage, storage} from '../../src/utils/storage';
// eslint-disable-next-line import/first
import {getAcquisitionSource} from '../../src/utils/acquisition';

describe('SignInCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailParam = 'USER%40Example.COM';
    mockIsAuthenticated = false;
  });

  it('returns to tabs home when the email parameter is missing', async () => {
    mockEmailParam = undefined;

    await render(<SignInCode />);

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
  });

  it('uses tabs home for the missing-email navigation fallback', async () => {
    const error = new Error('replace failed');
    mockEmailParam = undefined;
    mockReplace.mockImplementationOnce(() => {
      throw error;
    });

    await render(<SignInCode />);

    expect(mockLogError).toHaveBeenCalledWith(error, 'sign-in-code-no-email');
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)');
  });

  it('resends the link and keeps the new device secret', async () => {
    mockSendSignInLink.mockResolvedValue({
      success: true,
      browserSecret: 'new-secret',
    });

    const {getByTestId} = await render(<SignInCode />);
    await fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockSavePendingSignInLink).toHaveBeenCalledWith({
        email: 'user@example.com',
        browserSecret: 'new-secret',
      });
    });
    expect(mockSendSignInLink).toHaveBeenCalledWith({
      email: 'user@example.com',
      locale: 'en',
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('signInLink.resent');
  });

  it('locks review code verification after the first submit press', async () => {
    mockSignInWithReviewCode.mockReturnValue(new Promise(() => {}));

    const {getByLabelText, getByTestId} = await render(<SignInCode />);

    await fireEvent.press(getByLabelText('signInLink.useCode'));
    await fireEvent.changeText(getByTestId('code-input'), '12345678');
    await pressWithoutWaiting(
      getByTestId('submit-button'),
      getByTestId('submit-button'),
    );

    expect(mockSignInWithReviewCode).toHaveBeenCalledTimes(1);
    expect(mockSignInWithReviewCode).toHaveBeenCalledWith({
      code: '12345678',
      email: 'user@example.com',
    });

    await waitFor(() => {
      expect(getByTestId('submit-button').props.accessibilityState).toEqual({
        busy: true,
        disabled: true,
      });
    });
  });

  it('shows an error for a wrong review code', async () => {
    mockSignInWithReviewCode.mockResolvedValue({
      status: 'error',
      error: 'INCORRECT_CODE',
    });

    const {getByLabelText, getByTestId} = await render(<SignInCode />);

    await fireEvent.press(getByLabelText('signInLink.useCode'));
    await fireEvent.changeText(getByTestId('code-input'), '12345678');
    await fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(getByTestId('code-error').props.children).toBe('signInCode.error');
    });
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('labels back navigation for assistive tech', async () => {
    const {getByLabelText} = await render(<SignInCode />);

    expect(getByLabelText('common.back').props.accessibilityRole).toBe(
      'button',
    );
  });

  it('unlocks review code verification when profile creation fails', async () => {
    mockSignInWithReviewCode.mockResolvedValue({
      status: 'complete',
      tokens: {accessToken: 'a', refreshToken: 'r'},
    });
    mockCreateUserProfile.mockRejectedValue(new Error('profile failed'));

    const {getByLabelText, getByTestId, rerender} = await render(
      <SignInCode />,
    );

    await fireEvent.press(getByLabelText('signInLink.useCode'));
    await fireEvent.changeText(getByTestId('code-input'), '12345678');
    await fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        accessToken: 'a',
        refreshToken: 'r',
      });
    });

    mockIsAuthenticated = true;
    await rerender(<SignInCode />);

    await waitFor(() => {
      expect(getByTestId('code-error').props.children).toBe('signInCode.error');
      expect(getByTestId('submit-button').props.accessibilityState).toEqual({
        busy: false,
        disabled: false,
      });
    });

    await fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockSignInWithReviewCode).toHaveBeenCalledTimes(2);
    });
  });

  it('returns existing profiles home without firing a new signup event', async () => {
    mockIsAuthenticated = true;
    mockCreateUserProfile.mockResolvedValue({isNew: false});

    await render(<SignInCode />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/my'));
    expect(logEvent).not.toHaveBeenCalled();
    expect(registerAnalyticsSuperProperties).toHaveBeenCalledWith({
      acquisition_source: 'organic',
    });
  });

  it('tracks a new Firebase acquisition signup once and completes navigation', async () => {
    mockIsAuthenticated = true;
    mockCreateUserProfile.mockResolvedValue({isNew: true});
    (getAcquisitionSource as jest.Mock).mockReturnValue('shorts_ko');
    (storage.getBoolean as jest.Mock).mockReturnValue(false);

    const {rerender} = await render(<SignInCode />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/my'));
    await rerender(<SignInCode />);
    expect(registerAnalyticsSuperProperties).toHaveBeenCalledWith({
      acquisition_source: 'shorts_ko',
    });
    expect(storage.set).toHaveBeenCalledWith(
      Storage.DidFireSignupCompleted,
      true,
    );
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith('signup_completed', {
      source: 'shorts_ko',
      method: 'email_link',
    });
  });
});
