import {render, waitFor} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

const mockReplace = jest.fn();
const mockSetSession = jest.fn();
const mockSignInWithLink = jest.fn();
const mockReadPending = jest.fn();
const mockClearPending = jest.fn();
let mockCode: string | undefined = 'link-code';

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

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');
  return {
    Button: ({onPress, text}: {onPress: () => void; text: string}) =>
      React.createElement(
        TouchableOpacity,
        {onPress, testID: 'retry-button'},
        React.createElement(Text, null, text),
      ),
    LoadingIndicator: () => React.createElement(Text, null, 'loading'),
    Typography: {
      Body1: ({children}: {children: ReactNode}) =>
        React.createElement(Text, {testID: 'message'}, children),
    },
  };
});

jest.mock('expo-router', () => ({
  Stack: {Screen: () => null},
  useLocalSearchParams: () => ({code: mockCode}),
  useRouter: () => ({replace: mockReplace}),
}));

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({setSession: mockSetSession}),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({isLoading: false}),
  useMutation: () => mockSignInWithLink,
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {emailAuth: {signInWithLink: 'emailAuth.signInWithLink'}},
}));

jest.mock('../../src/STRINGS', () => ({t: (key: string) => key}));
jest.mock('../../src/utils/analytics', () => ({logScreenView: jest.fn()}));
jest.mock('../../src/utils/error', () => ({logError: jest.fn()}));
jest.mock('../../src/hooks/useAfterSignIn', () => ({useAfterSignIn: jest.fn()}));
jest.mock('../../src/utils/signInLink', () => ({
  readPendingSignInLink: () => mockReadPending(),
  clearPendingSignInLink: () => mockClearPending(),
}));

// eslint-disable-next-line import/first
import SignInLink from '../../app/sign-in-link';

const TOKENS = {accessToken: 'a', refreshToken: 'r'};

describe('SignInLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCode = 'link-code';
    mockReadPending.mockReturnValue({
      email: 'user@example.com',
      browserSecret: 'device-secret',
    });
  });

  it('signs in with the link code and the secret kept on this device', async () => {
    mockSignInWithLink.mockResolvedValue({status: 'complete', tokens: TOKENS});

    const {getByTestId} = await render(<SignInLink />);

    await waitFor(() => expect(mockSetSession).toHaveBeenCalledWith(TOKENS));
    expect(mockSignInWithLink).toHaveBeenCalledWith({
      emailCode: 'link-code',
      browserSecret: 'device-secret',
    });
    expect(mockClearPending).toHaveBeenCalled();
    expect(getByTestId('message').props.children).toBe('signInLink.signingIn');
  });

  it('keeps the secret and offers a new sign-in for a dead link', async () => {
    mockSignInWithLink.mockResolvedValue({
      status: 'error',
      error: 'INVALID_CHALLENGE',
    });

    const {getByTestId} = await render(<SignInLink />);

    await waitFor(() =>
      expect(getByTestId('message').props.children).toBe('signInLink.expired'),
    );
    expect(mockClearPending).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(getByTestId('retry-button')).toBeTruthy();
  });

  it('explains a link opened on another device', async () => {
    mockReadPending.mockReturnValue(null);

    const {getByTestId} = await render(<SignInLink />);

    expect(getByTestId('message').props.children).toBe(
      'signInLink.otherDevice',
    );
    expect(mockSignInWithLink).not.toHaveBeenCalled();
  });
});
