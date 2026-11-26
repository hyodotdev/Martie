import {render} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

import ReviewQuizPage from '../../app/review-quiz';

const mockReplace = jest.fn();
const mockSetVolume = jest.fn();
const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
let mockVolume: number | undefined = 0.5;

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
    IconButton: ({
      accessibilityLabel,
      onPress,
      testID,
      touchableHighlightProps,
    }: any) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel,
          accessibilityRole: 'button',
          onPress,
          testID,
          ...touchableHighlightProps,
        },
        React.createElement(Text, null, accessibilityLabel),
      ),
    Typography: {
      Body4: TextComponent,
      Heading5: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
        },
        role: {
          danger: '#dc2626',
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
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn()),
  }),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('convex/react', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    reviewQueue: {
      mutations: {
        submitReview: 'reviewQueue.mutations.submitReview',
      },
      queries: {
        getPendingReviews: 'reviewQueue.queries.getPendingReviews',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  getLocale: () => 'en',
  t: (key: string, params?: Record<string, number>) => {
    const strings: Record<string, string> = {
      'common.changeVolume': 'Change sound volume',
      'common.return': 'Return',
      'common.volumeHigh': 'Sound volume high',
      'common.volumeMedium': 'Sound volume medium',
      'common.volumeMuted': 'Sound muted',
      'discover.reviewEmpty': 'No mistakes to review!',
      'discover.reviewMastered': 'Mastered! Great job!',
      'discover.reviewProgressAccessibility': `Review ${params?.current ?? 0} of ${params?.total ?? 0}, stage ${params?.stage ?? 0} of 3`,
      'discover.reviewReset': "Let's try again later",
      'discover.reviewStage': `Stage ${params?.stage ?? 0}/3`,
      'discover.reviewTimerAccessibility': `${params?.seconds ?? 0} seconds remaining`,
      'discover.reviewTitle': 'Review Mistakes',
    };

    return strings[key] ?? key;
  },
}));

jest.mock('../../src/hoc/withErrorBoundary', () => ({
  withErrorBoundary: (Component: any) => Component,
}));

jest.mock('../../src/uis/ButtonMartie', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  return function ButtonMartie({onPress, text}: any) {
    return React.createElement(
      TouchableOpacity,
      {
        accessibilityLabel: text,
        accessibilityRole: 'button',
        onPress,
      },
      React.createElement(Text, null, text),
    );
  };
});

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

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    pause: jest.fn(),
    play: jest.fn(),
    seekTo: jest.fn(),
    volume: 1,
  }),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Soft: 'Soft',
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
  }),
}));

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: jest.fn(),
  })),
  useMMKVNumber: () => [mockVolume, mockSetVolume],
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: {
    success: jest.fn(),
  },
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

jest.mock('../../src/utils/timerUtils', () => ({
  createSafeTimer: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('../../src/sounds', () => ({
  AUDIO_PIANO: 'piano.mp3',
  AUDIO_TIMER: 'timer.mp3',
}));

const reviewQuiz = {
  answerKey: 'answer',
  description: 'What should be reviewed?',
  key: 'question',
  options: [
    {
      description: 'Correct answer',
      isAnswer: true,
      key: 'answer',
    },
    {
      description: 'Wrong answer',
      isAnswer: false,
      key: 'wrong',
    },
  ],
};

describe('ReviewQuizPage accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVolume = 0.5;
    mockUseMutation.mockReturnValue(jest.fn(() => Promise.resolve()));
  });

  it('announces the empty review state and return action', async () => {
    mockUseQuery.mockReturnValue([]);

    const {getByLabelText} = await render(<ReviewQuizPage />);

    expect(
      getByLabelText('No mistakes to review!').props.accessibilityRole,
    ).toBe('text');
    expect(getByLabelText('Return').props.accessibilityRole).toBe('button');
  });

  it('announces review progress, timer, and volume controls', async () => {
    mockUseQuery.mockReturnValue([
      {
        quiz: reviewQuiz,
        reviewId: 'review-1',
        reviewStage: 1,
      },
      {
        quiz: reviewQuiz,
        reviewId: 'review-2',
        reviewStage: 0,
      },
    ]);

    const {getByLabelText} = await render(<ReviewQuizPage />);

    expect(
      getByLabelText('Review 1 of 2, stage 2 of 3').props.accessibilityRole,
    ).toBe('text');

    expect(getByLabelText('15 seconds remaining').props.accessibilityRole).toBe(
      'timer',
    );

    const volumeButton = getByLabelText('Sound volume medium');
    expect(volumeButton.props).toMatchObject({
      accessibilityHint: 'Change sound volume',
      accessibilityRole: 'button',
    });
  });

  it('uses a consistent high-volume fallback before volume is saved', async () => {
    mockVolume = undefined;
    mockUseQuery.mockReturnValue([
      {
        quiz: reviewQuiz,
        reviewId: 'review-1',
        reviewStage: 0,
      },
    ]);

    const {getByLabelText} = await render(<ReviewQuizPage />);

    expect(getByLabelText('Sound volume high').props.accessibilityRole).toBe(
      'button',
    );
  });
});
