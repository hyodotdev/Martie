import {act, fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';

import QuizFinal from '../../app/quiz-final';

const mockReplace = jest.fn();
const mockToastError = jest.fn();
const mockUpdateBulbCount = jest.fn(() => Promise.resolve());
const mockClearAnswers = jest.fn();
const mockLogEvent = jest.fn();
const mockPlay = jest.fn();
let mockBulbCount = 2;
let mockSearchParams = {
  hasPassed: 'true',
  lastQuizId: 'quiz-1',
  lastQuizKey: 'quiz-key-1',
  point: '80',
  quizCount: '10',
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
    styled,
    css,
  };
});

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  const renderText = ({children, ...props}: {children?: ReactNode}) =>
    React.createElement(Text, props, children);

  return {
    Button: ({disabled, onPress, text}: any) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: text,
          disabled,
          onPress,
        },
        React.createElement(Text, null, text),
      ),
    Typography: {
      Body3: renderText,
      Heading1: renderText,
      Heading5: renderText,
    },
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
          bubble: '#f3f4f6',
        },
        role: {
          border: '#e5e7eb',
          danger: '#ef4444',
          success: '#16a34a',
          warning: '#f59e0b',
        },
        text: {
          basic: '#111827',
        },
      },
    }),
  };
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({
    ...mockSearchParams,
  }),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: mockPlay,
  }),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const React = jest.requireActual('react');
    const {View} = jest.requireActual('react-native');
    return React.createElement(View, props);
  },
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('file://quiz-result.png')),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
  }),
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({
    isAuthenticated: true,
  }),
  useMutation: () => jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/hooks/useBulbManager', () => ({
  useBulbManager: () => ({
    bulbCount: mockBulbCount,
    updateBulbCount: mockUpdateBulbCount,
  }),
}));

jest.mock('../../src/stores/answersStore', () => ({
  useAnswerStore: () => ({
    clearAnswers: mockClearAnswers,
  }),
}));

jest.mock('../../src/stores/quizStore', () => ({
  __esModule: true,
  default: () => ({
    setLastQuizKeyCursor: jest.fn(),
  }),
}));

jest.mock('../../src/stores/userStore', () => ({
  useUserStore: {
    getState: () => ({
      isPremium: false,
    }),
  },
}));

jest.mock('../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    CAPTURE_QUIZ_RESULT: 'capture_quiz_result',
    PRACTICE_QUIZ_COMPLETION_SYNCED: 'practice_quiz_completion_synced',
    PRACTICE_QUIZ_FINAL_ACTION: 'practice_quiz_final_action',
  },
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
  logScreenView: jest.fn(),
}));

jest.mock('../../src/utils/error', () => ({
  logError: jest.fn(),
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string, params?: Record<string, number>) => {
    const strings: Record<string, string> = {
      'common.done': 'Done',
      'common.martieScore': 'Martie Score',
      'common.notEnoughBulb': 'Not enough bulbs',
      'common.playNextLevel': 'Play Next Level',
      'common.replay': 'Replay',
      'common.screenCapture': 'Screen Capture',
      'quiz.quizPassPlaceholder': 'Keep learning with Martie.',
      'quiz.scoreBad': 'Try again',
      'quiz.scoreExcellent': 'Excellent',
      'quiz.scoreGood': 'Good',
    };

    if (key === 'common.numPoints') {
      return `${params?.points ?? 0}points`;
    }

    return strings[key] ?? key;
  },
}));

jest.mock('../../src/icons', () => ({
  IC_BULB: 1,
  IC_MARTIE_BASIC: 2,
  IC_MARTIE_IMPRESSED: 3,
  IC_MARTIE_SWEAT: 4,
}));

jest.mock('../../src/sounds', () => ({
  AUDIO_LOSE: 'lose.mp3',
  AUDIO_WIN: 'win.mp3',
}));

jest.mock('../../src/uis/CustomLoadingIndicator', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  return function CustomLoadingIndicator() {
    return React.createElement(Text, null, 'Loading');
  };
});

describe('QuizFinal', () => {
  let originalRequestAnimationFrame: typeof global.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof global.cancelAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockBulbCount = 2;
    mockSearchParams = {
      hasPassed: 'true',
      lastQuizId: 'quiz-1',
      lastQuizKey: 'quiz-key-1',
      point: '80',
      quizCount: '10',
    };
    originalRequestAnimationFrame = global.requestAnimationFrame;
    originalCancelAnimationFrame = global.cancelAnimationFrame;
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
    jest.useRealTimers();
  });

  it('spends a bulb once when play next level is pressed rapidly', () => {
    const {getByLabelText} = render(<QuizFinal />);
    const playNextButton = getByLabelText('Play Next Level');

    act(() => {
      fireEvent.press(playNextButton);
      fireEvent.press(playNextButton);
    });

    expect(mockUpdateBulbCount).toHaveBeenCalledTimes(1);
    expect(mockUpdateBulbCount).toHaveBeenCalledWith(1, 'subtract');

    expect(mockLogEvent).toHaveBeenCalledWith('practice_quiz_final_action', {
      action: 'play_next_or_replay',
      hasPassed: true,
      point: 80,
    });
  });

  it('replaces the tabs home route when done is pressed', () => {
    const {getByLabelText, getByText} = render(<QuizFinal />);

    fireEvent.press(getByLabelText('Done'));

    expect(getByText('Loading')).toBeTruthy();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('returns home when play next level has no bulbs', () => {
    mockBulbCount = 0;
    const {getByLabelText} = render(<QuizFinal />);

    fireEvent.press(getByLabelText('Play Next Level'));

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockToastError).toHaveBeenCalledWith('Not enough bulbs', {
      duration: 3000,
    });
    expect(mockUpdateBulbCount).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('keeps replay on the practice quiz route', () => {
    mockSearchParams = {
      ...mockSearchParams,
      hasPassed: 'false',
      point: '20',
    };
    const {getByLabelText} = render(<QuizFinal />);

    fireEvent.press(getByLabelText('Replay'));

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/quiz');
  });
});
