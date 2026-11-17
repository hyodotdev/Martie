import {act, render} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';

import FirstQuizModal from '../../../src/modals/FirstQuizModal';

const mockPush = jest.fn();
const mockSetVisible = jest.fn();
const mockButtonPressHandlers: Record<string, () => void> = {};
let mockVisible = true;
let mockPathname = '/';

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
      Body3: TextComponent,
      Heading3: TextComponent,
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
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('../../../src/STRINGS', () => ({
  t: (key: string) => {
    const strings: Record<string, string> = {
      'common.next': 'Next',
      'common.skip': 'Skip',
      'daily.tryNow': 'Try Now',
      'onboarding.dailyLoopBody': 'Start with one short quiz every day.',
      'onboarding.dailyLoopTitle': 'A quick daily brain warm-up',
      'onboarding.progress': 'Onboarding progress',
      'onboarding.reviewBody': 'Review missed questions to make them stick.',
      'onboarding.reviewTitle': 'Turn mistakes into memory',
      'onboarding.streakBody': 'Return tomorrow to keep your streak alive.',
      'onboarding.streakTitle': 'Build a tiny learning streak',
    };

    return strings[key] ?? key;
  },
}));

jest.mock('../../../src/icons', () => ({
  IC_MARTIE_IMPRESSED: 'martie-impressed',
}));

jest.mock('../../../src/stores/firstQuizModalStore', () => ({
  useFirstQuizModalStore: () => ({
    setVisible: mockSetVisible,
    visible: mockVisible,
  }),
}));

jest.mock('../../../src/uis/ButtonMartie', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  return function ButtonMartie({onPress, text, ...props}: any) {
    mockButtonPressHandlers[text] = onPress;

    return React.createElement(
      Text,
      {
        accessibilityLabel: props.accessibilityLabel ?? text,
        accessibilityRole: props.accessibilityRole ?? 'button',
        onPress,
      },
      text,
    );
  };
});

describe('FirstQuizModal accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockButtonPressHandlers).forEach((key) => {
      delete mockButtonPressHandlers[key];
    });
    mockVisible = true;
    mockPathname = '/';
  });

  it('announces the onboarding sheet and first slide controls', () => {
    const {UNSAFE_getByProps, getByLabelText, getByTestId, getByText} = render(
      <FirstQuizModal />,
    );

    const modal = getByTestId('first-quiz-modal');
    const progress = getByTestId('first-quiz-progress');
    const illustration = UNSAFE_getByProps({testID: 'first-quiz-illustration'});

    expect(modal.props.accessibilityViewIsModal).toBe(true);
    expect(modal.props.importantForAccessibility).toBe('yes');
    expect(illustration.props.accessible).toBe(false);
    expect(illustration.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
    expect(
      getByText('A quick daily brain warm-up').props.accessibilityRole,
    ).toBe('header');
    expect(progress.props.accessibilityRole).toBe('progressbar');
    expect(progress.props.accessibilityLabel).toBe('Onboarding progress');
    expect(progress.props.accessibilityValue).toEqual({
      min: 1,
      max: 3,
      now: 1,
    });
    expect(getByLabelText('Next').props.accessibilityRole).toBe('button');
    expect(getByLabelText('Skip').props.accessibilityRole).toBe('button');
  });

  it('updates the progress announcement as slides advance', async () => {
    const {getByLabelText, getByTestId, getByText, queryByLabelText, rerender} =
      render(<FirstQuizModal />);

    await act(async () => {
      mockButtonPressHandlers.Next();
    });
    rerender(<FirstQuizModal />);

    expect(getByText('Build a tiny learning streak')).toBeTruthy();
    expect(getByTestId('first-quiz-progress').props.accessibilityValue).toEqual(
      {
        min: 1,
        max: 3,
        now: 2,
      },
    );

    await act(async () => {
      mockButtonPressHandlers.Next();
    });
    rerender(<FirstQuizModal />);

    expect(getByText('Turn mistakes into memory')).toBeTruthy();
    expect(getByTestId('first-quiz-progress').props.accessibilityValue).toEqual(
      {
        min: 1,
        max: 3,
        now: 3,
      },
    );
    expect(getByLabelText('Try Now').props.accessibilityRole).toBe('button');
    expect(queryByLabelText('Skip')).toBeNull();
  });

  it('does not render the sheet when hidden', () => {
    mockVisible = false;

    const {queryByTestId} = render(<FirstQuizModal />);

    expect(queryByTestId('first-quiz-modal')).toBeNull();
  });

  it('hides itself when a deep-linked quiz route is active', () => {
    mockPathname = '/daily-quiz';

    const {queryByTestId} = render(<FirstQuizModal />);

    expect(queryByTestId('first-quiz-modal')).toBeNull();
    expect(mockSetVisible).toHaveBeenCalledWith(false);
  });

  it('releases global visibility when the sheet unmounts', () => {
    const {unmount} = render(<FirstQuizModal />);
    mockSetVisible.mockClear();

    unmount();

    expect(mockSetVisible).toHaveBeenCalledWith(false);
  });
});
