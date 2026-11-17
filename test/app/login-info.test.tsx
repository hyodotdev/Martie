import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import type {ReactElement, ReactNode} from 'react';
import React from 'react';

const mockDeleteUser = jest.fn();
const mockDismissAll = jest.fn();
const mockFlushAnalytics = jest.fn();
const mockLogError = jest.fn();
const mockReplace = jest.fn();
const mockResetAnalyticsUser = jest.fn();
const mockSignOut = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockAlertDialogClose = jest.fn();
const mockAlertDialogOpen = jest.fn();

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

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    FlashList: ({data, renderItem, ListHeaderComponent}: any) =>
      React.createElement(
        View,
        null,
        ListHeaderComponent ? React.createElement(ListHeaderComponent) : null,
        data.map((item: {title: string}, index: number) =>
          React.createElement(
            React.Fragment,
            {key: item.title},
            renderItem({item, index}),
          ),
        ),
      ),
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  const TextComponent = ({children}: {children?: ReactNode}) =>
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
          accessibilityLabel: text,
          accessibilityState: {busy: !!loading, disabled: !!disabled},
          disabled,
          onPress,
        },
        React.createElement(Text, null, text),
      ),
    Icon: () => React.createElement(Text),
    Typography: {
      Body1: TextComponent,
    },
    useCPK: () => ({
      alertDialog: {
        close: mockAlertDialogClose,
        open: mockAlertDialogOpen,
      },
      theme: {
        bg: {basic: '#ffffff', dialog: '#ffffff'},
        role: {border: '#dddddd', danger: '#cc0000'},
      },
    }),
  };
});

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({
    signOut: mockSignOut,
  }),
}));

jest.mock('convex/react', () => ({
  useMutation: () => mockDeleteUser,
  useQuery: () => ({email: 'user@example.com'}),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    user: {
      mutations: {
        deleteAccount: 'user.mutations.deleteAccount',
      },
      queries: {
        currentUser: 'user.queries.currentUser',
      },
    },
  },
}));

jest.mock('expo-router', () => ({
  Stack: {Screen: () => null},
  useRouter: () => ({
    dismissAll: mockDismissAll,
    replace: mockReplace,
  }),
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string) => key,
}));

jest.mock('../../src/utils/analytics', () => ({
  flushAnalytics: (...args: unknown[]) => mockFlushAnalytics(...args),
  logScreenView: jest.fn(),
  resetAnalyticsUser: (...args: unknown[]) =>
    mockResetAnalyticsUser(...args),
}));

jest.mock('../../src/utils/error', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {Soft: 'Soft'},
}));

jest.mock('../../src/uis/CustomLoadingIndicator', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  return function CustomLoadingIndicator() {
    return React.createElement(Text, null, 'Loading');
  };
});

// eslint-disable-next-line import/first
import LoginInfo from '../../app/login-info';

function getWithdrawAction(): ReactElement<{onPress: () => Promise<void>}> {
  const config = mockAlertDialogOpen.mock.calls[0][0];
  return config.actions[1];
}

describe('LoginInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteUser.mockResolvedValue({success: true});
    mockFlushAnalytics.mockResolvedValue(true);
    mockSignOut.mockResolvedValue(undefined);
  });

  it('waits for account deletion before showing success and signing out', async () => {
    const deferred = createDeferred<{success: true}>();
    mockDeleteUser.mockReturnValue(deferred.promise);

    const {getByText} = render(<LoginInfo />);

    fireEvent.press(getByText('loginInfo.withdraw'));

    const withdrawAction = getWithdrawAction();
    let withdrawPromise: Promise<void> | undefined;

    act(() => {
      withdrawPromise = withdrawAction.props.onPress();
    });

    expect(mockDeleteUser).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve({success: true});
      await withdrawPromise;
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'loginInfo.withdrawSuccess',
    );
    expect(mockAlertDialogClose).toHaveBeenCalledTimes(1);
    expect(mockFlushAnalytics).toHaveBeenCalledTimes(1);
    expect(mockResetAnalyticsUser).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('flushes analytics before regular sign out navigation', async () => {
    const {getByText} = render(<LoginInfo />);

    fireEvent.press(getByText('loginInfo.doSignOut'));

    await waitFor(() => {
      expect(mockFlushAnalytics).toHaveBeenCalledTimes(1);
      expect(mockResetAnalyticsUser).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockDismissAll).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('announces account actions as busy buttons while signing out', async () => {
    const deferred = createDeferred<boolean>();
    mockFlushAnalytics.mockReturnValue(deferred.promise);

    const {getByLabelText} = render(<LoginInfo />);

    expect(getByLabelText('loginInfo.doSignOut').props.accessibilityRole).toBe(
      'button',
    );
    expect(
      getByLabelText('loginInfo.doSignOut').props.accessibilityState,
    ).toEqual({busy: false, disabled: false});

    act(() => {
      fireEvent.press(getByLabelText('loginInfo.doSignOut'));
    });

    expect(
      getByLabelText('loginInfo.doSignOut').props.accessibilityState,
    ).toEqual({busy: true, disabled: true});
    expect(
      getByLabelText('loginInfo.withdraw').props.accessibilityState,
    ).toEqual({busy: true, disabled: true});

    await act(async () => {
      deferred.resolve(true);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('keeps account deletion success when sign out cleanup fails', async () => {
    const error = new Error('sign out failed');
    mockSignOut.mockRejectedValue(error);

    const {getByText} = render(<LoginInfo />);

    fireEvent.press(getByText('loginInfo.withdraw'));

    const withdrawAction = getWithdrawAction();

    await act(async () => {
      await withdrawAction.props.onPress();
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'loginInfo.withdrawSuccess',
    );
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith(error, 'login-info-signout');
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('keeps the user signed in when account deletion fails', async () => {
    const error = new Error('delete failed');
    mockDeleteUser.mockRejectedValue(error);

    const {getByText} = render(<LoginInfo />);

    fireEvent.press(getByText('loginInfo.withdraw'));

    const withdrawAction = getWithdrawAction();

    await act(async () => {
      await withdrawAction.props.onPress();
    });

    expect(mockLogError).toHaveBeenCalledWith(error, 'login-info-withdraw');
    expect(mockToastError).toHaveBeenCalledWith('error.tryAgain');
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockAlertDialogClose).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
