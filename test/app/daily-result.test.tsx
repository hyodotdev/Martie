import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';

import DailyResult from '../../app/daily-result';

const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
const mockJoinLeague = jest.fn(() => Promise.resolve());
const mockLogEvent = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetSignInRequireModalVisible = jest.fn();
let mockIsAuthenticated = false;
let mockMyLeague: null | {id: string} = null;
let mockSearchParams = {
  correctCount: '4',
  totalQuestions: '5',
  totalTimeMs: '45000',
} as {
  correctCount?: string;
  returnToHome?: string;
  totalQuestions?: string;
  totalTimeMs?: string;
};

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
  const css = jest.requireActual('kstyled').css;

  return {
    css,
    styled,
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  const renderText = ({children, ...props}: {children?: ReactNode}) =>
    React.createElement(Text, props, children);

  return {
    Typography: {
      Body2: renderText,
      Body3: renderText,
      Heading2: renderText,
    },
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
          paper: '#f9fafb',
        },
        role: {
          border: '#e5e7eb',
        },
        text: {
          basic: '#111827',
          placeholder: '#6b7280',
        },
      },
    }),
  };
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    back: mockBack,
    canGoBack: mockCanGoBack,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
  }),
  useMutation: () => mockJoinLeague,
  useQuery: (query: string) => {
    if (query === 'user.queries.currentUser') return null;
    if (query === 'league.queries.getMyLeague') return mockMyLeague;
    if (query === 'dailyChallenge.queries.getToday') {
      return {
        category: {name: 'SCIENCE'},
        challengeNumber: 42,
        userResults: [
          {isCorrect: true},
          {isCorrect: true},
          {isCorrect: true},
          {isCorrect: true},
          {isCorrect: false},
        ],
      };
    }
    if (query === 'article.queries.getByCategory') {
      return {
        key: 'science-basics',
      };
    }

    return undefined;
  },
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    article: {
      queries: {
        getByCategory: 'article.queries.getByCategory',
      },
    },
    dailyChallenge: {
      queries: {
        getToday: 'dailyChallenge.queries.getToday',
      },
    },
    league: {
      mutations: {
        joinLeague: 'league.mutations.joinLeague',
      },
      queries: {
        getMyLeague: 'league.queries.getMyLeague',
      },
    },
    user: {
      queries: {
        currentUser: 'user.queries.currentUser',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  getLocale: () => 'en',
  t: (key: string, params?: Record<string, number | string>) => {
    const strings: Record<string, string> = {
      'common.loading': 'Loading',
      'common.return': 'Return',
      'daily.joinLeagueBody': 'Join the weekly league.',
      'daily.joinLeagueButton': 'Join League',
      'daily.joinLeagueTitle': 'Turn this score into a rank',
      'daily.learnMoreAbout': `Learn more about ${params?.category ?? ''}`,
      'daily.saveProgressBody': 'Sign in to keep this result.',
      'daily.saveProgressButton': 'Save my progress',
      'daily.saveProgressTitle': "Keep today's result",
      'daily.streak': `${params?.count ?? 0} day streak`,
      'daily.tomorrowPlanBody': 'A fresh challenge opens tomorrow.',
      'daily.tomorrowPlanBodyWithReview': `Review ${params?.count ?? 0} misses tomorrow.`,
      'daily.tomorrowPlanTitle': 'Your next session is ready',
      'error.tryAgain': 'Try again',
      'league.joinLeague': 'Join League',
    };

    return strings[key] ?? key;
  },
}));

jest.mock('../../src/utils/categoriesMap', () => ({
  categoriesMap: [{localizedString: 'Science', name: 'SCIENCE'}],
}));

jest.mock('../../src/uis/ShareCard/DailyShareCard', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function DailyShareCard() {
    return React.createElement(View, {testID: 'daily-share-card'});
  };
});

jest.mock('../../src/uis/ButtonMartie', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  return function ButtonMartie({
    accessibilityLabel,
    accessibilityRole = 'button',
    accessibilityState,
    onPress,
    text,
  }: any) {
    return React.createElement(
      TouchableOpacity,
      {
        accessibilityLabel: accessibilityLabel ?? text,
        accessibilityRole,
        accessibilityState,
        onPress,
      },
      React.createElement(Text, null, text),
    );
  };
});

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: jest.fn(),
  }),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Soft: 'soft',
  },
}));

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const React = jest.requireActual('react');
    const {View} = jest.requireActual('react-native');
    return React.createElement(View, props);
  },
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../../src/hoc/withErrorBoundary', () => ({
  withErrorBoundary: (Component: any) => Component,
}));

jest.mock('../../src/stores/signInRequireModalStore', () => ({
  useSignInRequireModalStore: (selector: any) =>
    selector({
      setVisible: mockSetSignInRequireModalVisible,
    }),
}));

jest.mock('../../src/utils/analytics', () => ({
  isStreakMilestone: () => false,
  LOG_EVENTS: {
    LOGIN_PROMPT_SHOWN: 'login_prompt_shown',
    STREAK_MILESTONE: 'streak_milestone',
    STREAK_STATE: 'streak_state',
  },
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
  logScreenView: jest.fn(),
}));

jest.mock('../../src/utils/appReview', () => ({
  requestAppReviewIfEligible: jest.fn(),
}));

jest.mock('../../src/hooks/useNotificationPermissionFlow', () => ({
  requestFirstDailyNotificationPermission: jest.fn(() =>
    Promise.resolve(false),
  ),
}));

jest.mock('../../src/utils/notifee', () => ({
  createNextDailyReadyNotification: jest.fn(),
}));

jest.mock('../../src/utils/error', () => ({
  logError: jest.fn(),
}));

jest.mock('../../src/icons', () => ({
  IC_MARTIE_IMPRESSED: 1,
  IC_MARTIE_SWEAT: 2,
}));

jest.mock('../../src/sounds', () => ({
  AUDIO_LOSE: 'lose.mp3',
  AUDIO_WIN: 'win.mp3',
}));

describe('DailyResult', () => {
  let originalRequestAnimationFrame: typeof global.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof global.cancelAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    originalRequestAnimationFrame = global.requestAnimationFrame;
    originalCancelAnimationFrame = global.cancelAnimationFrame;
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    global.cancelAnimationFrame = jest.fn();
    mockIsAuthenticated = false;
    mockMyLeague = null;
    mockSearchParams = {
      correctCount: '4',
      totalQuestions: '5',
      totalTimeMs: '45000',
    };
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
    jest.useRealTimers();
  });

  it('announces the save progress action with card context', async () => {
    const {getByLabelText} = await render(<DailyResult />);

    const saveProgressButton = getByLabelText(
      "Save my progress. Keep today's result. Sign in to keep this result.",
    );

    expect(saveProgressButton.props.accessibilityRole).toBe('button');

    await fireEvent.press(saveProgressButton);

    expect(mockLogEvent).toHaveBeenCalledWith('login_prompt_shown', {
      source: 'daily_result_save_progress',
    });
    expect(mockSetSignInRequireModalVisible).toHaveBeenCalledWith(true);
  });

  it('announces the join league action with card context', async () => {
    mockIsAuthenticated = true;

    const {getByLabelText} = await render(<DailyResult />);

    const joinLeagueButton = getByLabelText(
      'Join League. Turn this score into a rank. Join the weekly league.',
    );

    expect(joinLeagueButton.props.accessibilityRole).toBe('button');

    await fireEvent.press(joinLeagueButton);

    await waitFor(() => expect(mockJoinLeague).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith('/league');
  });

  it('announces the related article card as a button', async () => {
    const {getByLabelText} = await render(<DailyResult />);

    const articleCard = getByLabelText('Learn more about Science');

    expect(articleCard.props.accessibilityRole).toBe('button');

    await fireEvent.press(articleCard);

    expect(mockLogEvent).toHaveBeenCalledWith('daily_to_article', {
      article_key: 'science-basics',
      category: 'SCIENCE',
    });
    expect(mockPush).toHaveBeenCalledWith({
      params: {key: 'science-basics'},
      pathname: '/article-detail',
    });
  });

  it('replaces home instead of going back after a completed daily quiz', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockSearchParams = {
      correctCount: '4',
      returnToHome: 'true',
      totalQuestions: '5',
      totalTimeMs: '45000',
    };

    const {getByText} = await render(<DailyResult />);

    await fireEvent.press(getByText('Return'));

    await act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
