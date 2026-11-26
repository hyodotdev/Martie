import {act, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';

import QuizPage from '../../app/quiz';

const mockReplace = jest.fn();
const mockClearAnswers = jest.fn();
const mockLogError = jest.fn();
let mockQuizzesState: {
  isLoading: boolean;
  lastQuiz?: Record<string, unknown>;
  quizzes: Record<string, unknown>[];
} = {
  isLoading: false,
  lastQuiz: undefined,
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

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    pause: jest.fn(),
    play: jest.fn(),
    seekTo: jest.fn(),
    volume: 1,
  }),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    getBoolean: jest.fn(),
    getString: jest.fn(),
    set: jest.fn(),
  })),
  useMMKVNumber: () => [0.5, jest.fn()],
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
  }),
}));

jest.mock('../../src/hooks/useQuizzes', () => ({
  useQuizzes: () => mockQuizzesState,
}));

jest.mock('../../src/stores/answersStore', () => ({
  useAnswerStore: () => ({
    answers: [],
    clearAnswers: mockClearAnswers,
  }),
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
    PRACTICE_QUIZ_COMPLETED: 'practice_quiz_completed',
    PRACTICE_QUIZ_FINISH_REQUESTED: 'practice_quiz_finish_requested',
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

jest.mock('../../src/utils/error', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock('../../src/utils/timerUtils', () => ({
  createSafeTimer: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

describe('QuizPage fallback routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockQuizzesState = {
      isLoading: false,
      lastQuiz: undefined,
      quizzes: [],
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns to the tabs home route when no practice quizzes are available', async () => {
    await render(<QuizPage />);

    await act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      'QuizPage.noQuizzes',
    );
  });

  it('returns to the tabs home route when the current practice quiz is invalid', async () => {
    mockQuizzesState = {
      isLoading: false,
      lastQuiz: {
        _id: 'quiz-1',
        key: 'quiz-key-1',
      },
      quizzes: [
        {
          _id: 'quiz-1',
          key: 'quiz-key-1',
          level: 1,
          options: [],
        },
      ],
    };

    await render(<QuizPage />);

    await act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      'QuizPage.invalidCurrentQuiz',
    );
  });
});
