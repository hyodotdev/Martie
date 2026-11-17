import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

import SignInRequireModal from '../../../src/modals/SignInRequireModal';
import StreakRecoveryModal from '../../../src/modals/StreakRecoveryModal';

const mockGrantRecovery = jest.fn();
const mockLogEvent = jest.fn();
const mockNavigate = jest.fn();
const mockSetSignInRequireVisible = jest.fn();
const mockStorageGetString = jest.fn();
const mockStorageSet = jest.fn();
const mockUseStreakRecoveryQuery = jest.fn();
let mockSignInRequireVisible = true;

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
  const {Text} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Typography: {
      Body2: TextComponent,
      Heading4: TextComponent,
      Heading5: TextComponent,
    },
  };
});

jest.mock('expo-image', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    Image: (props: any) => React.createElement(View, props),
  };
});

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Soft: 'Soft',
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('convex/react', () => ({
  useMutation: () => mockGrantRecovery,
  useQuery: () => mockUseStreakRecoveryQuery(),
}));

jest.mock('../../../convex/_generated/api', () => ({
  api: {
    dailyChallenge: {
      mutations: {
        grantRecoveryFreeze: 'dailyChallenge.mutations.grantRecoveryFreeze',
      },
      queries: {
        getStreakRecoveryState: 'dailyChallenge.queries.getStreakRecoveryState',
      },
    },
  },
}));

jest.mock('../../../src/STRINGS', () => ({
  t: (key: string, params?: Record<string, number>) =>
    params?.count === undefined ? key : `${key} ${params.count}`,
}));

jest.mock('../../../src/icons', () => ({
  IC_MARTIE_SMILE: 'martie-smile',
}));

jest.mock('../../../src/stores/signInRequireModalStore', () => ({
  useSignInRequireModalStore: () => ({
    setVisible: mockSetSignInRequireVisible,
    visible: mockSignInRequireVisible,
  }),
}));

jest.mock('../../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    LOGIN_PROMPT_ACCEPTED: 'login_prompt_accepted',
    LOGIN_PROMPT_DISMISSED: 'login_prompt_dismissed',
    STREAK_RECOVERY_ACCEPTED: 'streak_recovery_accepted',
    STREAK_RECOVERY_SHOWN: 'streak_recovery_shown',
  },
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

jest.mock('../../../src/utils/error', () => ({
  logError: jest.fn(),
}));

jest.mock('../../../src/utils/storage', () => ({
  Storage: {
    StreakRecoveryLastSeenAt: 'streak-recovery-last-seen-at',
  },
  storage: {
    getString: (...args: unknown[]) => mockStorageGetString(...args),
    set: (...args: unknown[]) => mockStorageSet(...args),
  },
}));

jest.mock('../../../src/utils/streakDate', () => ({
  streakToday: () => '2026-06-29',
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    success: jest.fn(),
  },
}));

jest.mock('../../../src/uis/GestureHandlerButton', () => {
  const React = jest.requireActual('react');
  const {Pressable, Text} = jest.requireActual('react-native');

  return {
    GestureHandlerButton: ({
      disabled,
      loading,
      onPress,
      text,
      ...props
    }: any) =>
      React.createElement(
        Pressable,
        {
          ...props,
          disabled: disabled || loading,
          onPress,
        },
        React.createElement(Text, null, text),
      ),
  };
});

describe('recovery modal accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInRequireVisible = true;
    mockStorageGetString.mockReturnValue(undefined);
    mockUseStreakRecoveryQuery.mockReturnValue({
      currentStreak: 7,
      eligible: true,
    });
    mockGrantRecovery.mockReturnValue(new Promise(() => {}));
  });

  it('announces the sign-in requirement sheet and actions', () => {
    const {getByLabelText, getByTestId, getByText} = render(
      <SignInRequireModal />,
    );

    const modal = getByTestId('sign-in-require-modal');

    expect(modal.props.accessibilityViewIsModal).toBe(true);
    expect(modal.props.importantForAccessibility).toBe('yes');
    expect(getByText('signIn.title').props.accessibilityRole).toBe('header');
    expect(getByLabelText('signIn.doLater').props.accessibilityRole).toBe(
      'button',
    );
    expect(getByLabelText('signIn.doLogin').props.accessibilityRole).toBe(
      'button',
    );
  });

  it('announces the streak recovery sheet and initial action states', async () => {
    const {findByTestId, getByLabelText, getByText} = render(
      <StreakRecoveryModal />,
    );

    const modal = await findByTestId('streak-recovery-modal');

    expect(modal.props.accessibilityViewIsModal).toBe(true);
    expect(modal.props.importantForAccessibility).toBe('yes');
    expect(getByText('daily.streakRecoveryTitle').props.accessibilityRole).toBe(
      'header',
    );
    expect(
      getByLabelText('daily.streakRecoveryDismiss').props.accessibilityState,
    ).toEqual({disabled: false});
    expect(
      getByLabelText('daily.streakRecoveryAccept').props.accessibilityState,
    ).toEqual({
      busy: false,
      disabled: false,
    });
  });

  it('reports when streak recovery should block banner ads', async () => {
    const onVisibilityChange = jest.fn();
    const {findByTestId} = render(
      <StreakRecoveryModal onVisibilityChange={onVisibilityChange} />,
    );

    await findByTestId('streak-recovery-modal');

    expect(onVisibilityChange).toHaveBeenLastCalledWith(true);
  });

  it('locks streak recovery acceptance while the grant is pending', async () => {
    const {findByLabelText, getByLabelText} = render(<StreakRecoveryModal />);
    const acceptButton = await findByLabelText('daily.streakRecoveryAccept');

    fireEvent.press(acceptButton);
    fireEvent.press(acceptButton);

    expect(mockGrantRecovery).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        getByLabelText('daily.streakRecoveryAccept').props.accessibilityState,
      ).toEqual({
        busy: true,
        disabled: true,
      });
    });
    expect(
      getByLabelText('daily.streakRecoveryDismiss').props.accessibilityState,
    ).toEqual({disabled: true});
  });

  it('does not navigate when recovery grant resolves after unmount', async () => {
    let resolveGrant!: (value: {
      currentStreak: number;
      success: boolean;
    }) => void;
    mockGrantRecovery.mockReturnValue(
      new Promise((resolve) => {
        resolveGrant = resolve;
      }),
    );

    const {findByLabelText, unmount} = render(<StreakRecoveryModal />);
    const acceptButton = await findByLabelText('daily.streakRecoveryAccept');

    fireEvent.press(acceptButton);
    unmount();

    await act(async () => {
      resolveGrant({currentStreak: 7, success: true});
      await Promise.resolve();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockStorageSet).not.toHaveBeenCalled();
    expect(mockLogEvent).not.toHaveBeenCalledWith(
      'streak_recovery_accepted',
      expect.anything(),
    );
  });
});
