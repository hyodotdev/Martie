import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {ThemeProvider} from 'kstyled';

import ReviewCard from '../../../src/uis/Discover/ReviewCard';

const theme = {
  bg: {
    paper: '#ffffff',
  },
};

const mockButtonMartie = jest.fn();

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  const renderText = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Typography: {
      Body2: renderText,
      Body3: renderText,
    },
  };
});

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string, params?: Record<string, number>) => {
    const strings: Record<string, string> = {
      'discover.reviewButton': 'Start Review',
      'discover.reviewEmpty': 'No mistakes to review!',
      'discover.reviewTitle': 'Review Mistakes',
    };

    if (key === 'discover.reviewCount') {
      return `${params?.count ?? 0} to review`;
    }

    return strings[key] ?? key;
  }),
}));

jest.mock('../../../src/uis/ButtonMartie', () => ({
  __esModule: true,
  default: (props: any) => {
    const React = jest.requireActual('react');
    const {Text} = jest.requireActual('react-native');

    mockButtonMartie(props);

    return React.createElement(
      Text,
      {
        accessibilityLabel: props.text,
        ...props.touchableHighlightProps,
      },
      props.text,
    );
  },
}));

const renderWithTheme = (children: JSX.Element) =>
  render(<ThemeProvider theme={theme as any}>{children}</ThemeProvider>);

describe('Discover ReviewCard accessibility', () => {
  beforeEach(() => {
    mockButtonMartie.mockClear();
  });

  it('announces the pending review card as one button with count context', () => {
    const onPress = jest.fn();

    const {getByLabelText} = renderWithTheme(
      <ReviewCard pendingCount={3} onPress={onPress} />,
    );

    const card = getByLabelText(
      'Review Mistakes, 3 to review, Start Review',
    );

    expect(card.props.accessibilityRole).toBe('button');

    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockButtonMartie).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Start Review',
        touchableHighlightProps: expect.objectContaining({
          accessibilityElementsHidden: true,
          accessible: false,
          importantForAccessibility: 'no-hide-descendants',
        }),
      }),
    );
  });

  it('announces the empty review state as static text', () => {
    const {getByLabelText} = renderWithTheme(
      <ReviewCard pendingCount={0} onPress={jest.fn()} />,
    );

    const emptyState = getByLabelText('No mistakes to review!');

    expect(emptyState.props.accessible).toBe(true);
    expect(emptyState.props.accessibilityRole).toBe('text');
    expect(mockButtonMartie).not.toHaveBeenCalled();
  });
});
