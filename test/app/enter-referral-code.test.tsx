import {fireEvent, render, waitFor} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

const mockBack = jest.fn();
const mockApplyReferral = jest.fn();
const mockToastSuccess = jest.fn();
const mockLogEvent = jest.fn();

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {promise, resolve, reject};
}

jest.mock('kstyled', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');

  const createStyled = (Component: any) => {
    const createComponent = () => {
      function StyledComponent({
        children,
        ...props
      }: {
        children?: ReactNode;
      }) {
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
    back: mockBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    SafeAreaView: ({children, ...props}: {children?: ReactNode}) =>
      React.createElement(View, props, children),
  };
});

jest.mock('react-native-keyboard-controller', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    KeyboardAvoidingView: ({children, ...props}: {children?: ReactNode}) =>
      React.createElement(View, props, children),
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TextInput, TouchableOpacity, View} =
    jest.requireActual('react-native');

  const TextComponent = ({children}: {children: ReactNode}) =>
    React.createElement(Text, null, children);

  return {
    Button: ({
      disabled,
      loading,
      onPress,
      text,
    }: {
      disabled?: boolean;
      loading?: boolean;
      onPress: () => void;
      text: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityState: {busy: !!loading, disabled: !!disabled},
          disabled,
          onPress,
          testID: 'submit-button',
        },
        React.createElement(Text, null, text),
      ),
    EditText: ({
      error,
      onChangeText,
      onSubmitEditing,
      placeholder,
      value,
    }: {
      error?: string;
      onChangeText: (text: string) => void;
      onSubmitEditing?: () => void;
      placeholder?: string;
      value: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(TextInput, {
          onChangeText,
          onSubmitEditing,
          placeholder,
          testID: 'code-input',
          value,
        }),
        !!error && React.createElement(Text, {testID: 'code-error'}, error),
      ),
    Icon: () => React.createElement(Text),
    Typography: {
      Body1: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {basic: '#ffffff', paper: '#ffffff'},
        role: {
          border: '#dddddd',
          danger: '#cc0000',
          primary: '#3366ff',
          selectedBg: '#eef2ff',
          selectedBorder: '#ccd6ff',
        },
        text: {basic: '#111111', placeholder: '#777777'},
      },
    }),
  };
});

jest.mock('convex/react', () => ({
  useMutation: () => mockApplyReferral,
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    referral: {
      mutations: {
        applyReferral: 'referral.mutations.applyReferral',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string) => key,
}));

jest.mock('../../src/utils/analytics', () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {Soft: 'Soft'},
}));

// eslint-disable-next-line import/first
import EnterReferralCode from '../../app/enter-referral-code';

describe('EnterReferralCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('locks referral submission after the first press', async () => {
    const deferred = createDeferred<{success: true}>();
    mockApplyReferral.mockReturnValue(deferred.promise);

    const {getByTestId} = await render(<EnterReferralCode />);

    await fireEvent.changeText(getByTestId('code-input'), 'ABC-1234');
    await fireEvent.press(getByTestId('submit-button'));
    await fireEvent(getByTestId('code-input'), 'submitEditing');
    await fireEvent.press(getByTestId('submit-button'));

    expect(mockApplyReferral).toHaveBeenCalledTimes(1);
    expect(mockApplyReferral).toHaveBeenCalledWith({
      referralCode: 'abc1234',
    });

    await waitFor(() => {
      expect(getByTestId('submit-button').props.accessibilityState).toEqual({
        busy: true,
        disabled: true,
      });
    });

    deferred.resolve({success: true});

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('referral.reward');
      expect(mockLogEvent).toHaveBeenCalledWith('referral_applied');
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  it('unlocks referral submission after a validation error', async () => {
    mockApplyReferral
      .mockResolvedValueOnce({success: false, error: 'invalid_code'})
      .mockResolvedValueOnce({success: false, error: 'self_referral'});

    const {getByTestId} = await render(<EnterReferralCode />);

    await fireEvent.changeText(getByTestId('code-input'), 'wrongcode');
    await fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(getByTestId('code-error').props.children).toBe(
        'referral.invalidCode',
      );
      expect(getByTestId('submit-button').props.accessibilityState).toEqual({
        busy: false,
        disabled: false,
      });
    });

    await fireEvent.press(getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockApplyReferral).toHaveBeenCalledTimes(2);
      expect(getByTestId('code-error').props.children).toBe(
        'referral.selfReferral',
      );
    });
  });
});
