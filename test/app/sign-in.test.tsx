import {fireEvent, render, waitFor} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

const mockNavigate = jest.fn();
const mockBack = jest.fn();
const mockSignIn = jest.fn(() => Promise.resolve());
const mockCheckIsDeletedUser = jest.fn(() =>
  Promise.resolve({isDeleted: false}),
);
const mockToastError = jest.fn();

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
  useRouter: () => ({
    navigate: mockNavigate,
    back: mockBack,
  }),
}));

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const React = jest.requireActual('react');
    const {View} = jest.requireActual('react-native');
    return React.createElement(View, props);
  },
}));

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TextInput, TouchableOpacity, View} =
    jest.requireActual('react-native');

  return {
    Button: ({
      accessibilityLabel,
      accessibilityRole,
      loading,
      onPress,
      text,
    }: {
      accessibilityLabel?: string;
      accessibilityRole?: string;
      loading?: boolean;
      onPress: () => void;
      text: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel,
          accessibilityRole,
          accessibilityState: {busy: !!loading},
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
          testID: 'close-button',
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
          testID: 'email-input',
          value,
        }),
        !!error && React.createElement(Text, {testID: 'email-error'}, error),
      ),
    Icon: () => React.createElement(Text),
    Typography: {
      Body4: ({
        accessibilityLabel,
        accessibilityRole,
        children,
        onPress,
      }: {
        accessibilityLabel?: string;
        accessibilityRole?: string;
        children: ReactNode;
        onPress?: () => void;
      }) =>
        React.createElement(
          Text,
          {accessibilityLabel, accessibilityRole, onPress},
          children,
        ),
    },
    useCPK: () => ({
      theme: {
        bg: {basic: '#ffffff'},
        text: {basic: '#111111', label: '#777777'},
      },
    }),
  };
});

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({
    signIn: mockSignIn,
  }),
}));

jest.mock('convex/react', () => ({
  useMutation: () => mockCheckIsDeletedUser,
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    user: {
      mutations: {
        checkIsDeletedUser: 'user.mutations.checkIsDeletedUser',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  getLocale: () => 'en',
  t: (key: string, params?: Record<string, string>) => {
    if (key === 'common.policyAgreement') {
      return `${params?.termsOfService} ${params?.privacyPolicy}`;
    }
    return key;
  },
}));

jest.mock('../../src/icons', () => ({
  IC_WORDMARK: 1,
}));

jest.mock('../../src/utils/analytics', () => ({
  logScreenView: jest.fn(),
}));

jest.mock('../../src/utils/error', () => ({
  logError: jest.fn(),
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// eslint-disable-next-line import/first
import SignIn from '../../app/sign-in';

describe('SignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckIsDeletedUser.mockResolvedValue({isDeleted: false});
  });

  it('validates email before checking deleted accounts', async () => {
    const {getByTestId} = render(<SignIn />);

    fireEvent.changeText(getByTestId('email-input'), 'bad-email');
    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(getByTestId('email-error').props.children).toBe(
        'signIn.emailError',
      );
    });
    expect(mockCheckIsDeletedUser).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('normalizes email before otp request and route params', async () => {
    const {getByTestId} = render(<SignIn />);

    fireEvent.changeText(getByTestId('email-input'), ' USER@Example.COM ');
    fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockCheckIsDeletedUser).toHaveBeenCalledWith({
        email: 'USER@Example.COM',
      });
    });
    expect(mockSignIn).toHaveBeenCalledWith('resend-otp', {
      email: 'user@example.com',
    });
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/sign-in-code',
      params: {email: 'user@example.com'},
    });
  });

  it('labels close and policy links for assistive tech', () => {
    const {getByLabelText, getByTestId} = render(<SignIn />);

    expect(getByTestId('close-button').props.accessibilityRole).toBe('button');
    expect(getByLabelText('common.cancel')).toBeTruthy();
    expect(
      getByLabelText('common.termsOfService').props.accessibilityRole,
    ).toBe('link');
    expect(getByLabelText('common.privacyPolicy').props.accessibilityRole).toBe(
      'link',
    );
  });
});
