import {act, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';

import DailyQuizPage from '../../app/daily-quiz';

const mockReplace = jest.fn();
const mockLogError = jest.fn();
const mockUseQuery = jest.fn();
let mockDailyChallenge: Record<string, unknown> | undefined = {
  category: {name: 'SCIENCE'},
  quizzes: [],
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

  return {
    css: jest.requireActual('kstyled').css,
    styled,
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    IconButton: ({onPress, touchableHighlightProps}: any) =>
      React.createElement(TouchableOpacity, {
        onPress,
        ...touchableHighlightProps,
      }),
    Typography: {
      Heading5: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {basic: '#ffffff'},
        role: {danger: '#dc2626'},
        text: {basic: '#111827'},
      },
    }),
  };
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn()),
  }),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: jest.fn(),
}));

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    pause: jest.fn(),
    play: jest.fn(),
    seekTo: jest.fn(),
    volume: 1,
  }),
}));

jest.mock('react-native-mmkv', () => ({
  useMMKVNumber: () => [0.5, jest.fn()],
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
  }),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: false,
  }),
  useMutation: () => jest.fn(() => Promise.resolve()),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    dailyChallenge: {
      mutations: {
        completeDailyChallenge:
          'dailyChallenge.mutations.completeDailyChallenge',
      },
      queries: {
        getToday: 'dailyChallenge.queries.getToday',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  getLocale: () => 'en',
  t: (key: string) => key,
}));

jest.mock('../../src/hoc/withErrorBoundary', () => ({
  withErrorBoundary: (Component: any) => Component,
}));

jest.mock('../../src/uis/CustomLoadingIndicator', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function CustomLoadingIndicator() {
    return React.createElement(View, {testID: 'loading-indicator'});
  };
});

jest.mock('../../src/uis/ProgressBar', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function ProgressBar() {
    return React.createElement(View, {testID: 'progress-bar'});
  };
});

jest.mock('../../src/uis/ProgressCircle', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function ProgressCircle() {
    return React.createElement(View, {testID: 'progress-circle'});
  };
});

jest.mock('../../src/uis/QuizView', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function QuizView(props: any) {
    return React.createElement(View, {testID: 'quiz-view', ...props});
  };
});

jest.mock('../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    CATEGORY_ABANDONED: 'category_abandoned',
    CATEGORY_SELECTED: 'category_selected',
    DAILY_QUIZ_ABANDONED: 'daily_quiz_abandoned',
    DAILY_QUIZ_COMPLETED: 'daily_quiz_completed',
    DAILY_QUIZ_STARTED: 'daily_quiz_started',
    ONBOARDING_FINISHED: 'onboarding_finished',
    QUIZ_CORRECT: 'quiz_correct',
    QUIZ_WRONG: 'quiz_wrong',
  },
  logEvent: jest.fn(),
  logScreenView: jest.fn(),
}));

jest.mock('../../src/utils/audioPlayer', () => ({
  safeIsAudioPlayerPlaying: jest.fn(() => false),
  safePauseAudioPlayer: jest.fn(),
  safePlayAudioPlayer: jest.fn(),
  safeSeekAudioPlayerToStart: jest.fn(),
  safeSetAudioPlayerLoop: jest.fn(),
  safeSetAudioPlayerVolume: jest.fn(),
  stopAudioPlayer: jest.fn(),
}));

jest.mock('../../src/utils/dailyReturn', () => ({
  saveDailyCompletionSummary: jest.fn(),
}));

jest.mock('../../src/utils/error', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock('../../src/utils/storage', () => ({
  Storage: {
    DidFinishFirstDaily: 'DidFinishFirstDaily',
    GuestDailyResult: 'GuestDailyResult',
    Volume: 'Volume',
  },
  storage: {
    getBoolean: jest.fn(() => false),
    set: jest.fn(),
  },
}));

jest.mock('../../src/utils/timerUtils', () => ({
  createSafeTimer: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: jest.fn(),
}));

describe('DailyQuizPage fallback routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockDailyChallenge = {
      category: {name: 'SCIENCE'},
      quizzes: [],
    };
    mockUseQuery.mockImplementation((query: string) => {
      if (query === 'dailyChallenge.queries.getToday')
        return mockDailyChallenge;
      return undefined;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns to the tabs home route when the daily quiz payload is empty', async () => {
    await render(<DailyQuizPage />);

    await act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      'DailyQuiz.emptyPayload',
    );
  });
});
