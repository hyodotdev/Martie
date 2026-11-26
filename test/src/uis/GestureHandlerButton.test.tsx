import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {Text} from 'react-native';

import {GestureHandlerButton} from '../../../src/uis/GestureHandlerButton';

const theme = {
  bg: {
    basic: '#ffffff',
    disabled: '#e5e7eb',
  },
  button: {
    primary: {
      bg: '#2563eb',
      text: '#ffffff',
    },
    disabled: {
      bg: '#f3f4f6',
      text: '#9ca3af',
    },
  },
  text: {
    basic: '#111827',
    contrast: '#ffffff',
  },
};

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  const Body2 = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    LoadingIndicator: () => React.createElement(Text, null, 'loading'),
    Typography: {
      Body2,
    },
    useCPK: () => ({theme}),
  };
});

// Gesture Handler 3 delivers presses as native gesture events, which a test
// renderer cannot send, so the button becomes a plain view with its handlers.
jest.mock('react-native-gesture-handler', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');
  return {
    RectButton: ({children, onPress, ...props}: any) =>
      React.createElement(
        View,
        {
          ...props,
          // Tests pass `{pointerInside: false}` to lift the finger outside.
          onPress: (event?: {pointerInside?: boolean}) =>
            onPress?.(event?.pointerInside !== false),
        },
        children,
      ),
  };
});

jest.mock('cpk-ui/utils/guards', () => ({
  cloneElemWithDefaultColors: ({element}: {element?: JSX.Element}) => element,
}));

describe('GestureHandlerButton', () => {
  it('forwards accessibility props to the press target', async () => {
    const onPress = jest.fn();
    const {getByLabelText} = await render(
      <GestureHandlerButton
        accessibilityLabel="Update Now"
        accessibilityRole="button"
        onPress={onPress}
        text={<Text>Update Now</Text>}
      />,
    );

    const button = getByLabelText('Update Now');

    expect(button.props.accessibilityRole).toBe('button');

    await fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores a press released outside the button', async () => {
    const onPress = jest.fn();
    const {getByLabelText} = await render(
      <GestureHandlerButton
        accessibilityLabel="Update Now"
        onPress={onPress}
        text={<Text>Update Now</Text>}
      />,
    );

    await fireEvent.press(getByLabelText('Update Now'), {pointerInside: false});

    expect(onPress).not.toHaveBeenCalled();
  });

  it('preserves external active state handlers', async () => {
    const onActiveStateChange = jest.fn();
    const {getByLabelText} = await render(
      <GestureHandlerButton
        accessibilityLabel="Update Now"
        onActiveStateChange={onActiveStateChange}
        onPress={jest.fn()}
        text="Update Now"
      />,
    );

    await fireEvent(getByLabelText('Update Now'), 'activeStateChange', true);

    expect(onActiveStateChange).toHaveBeenCalledWith(true);
  });
});
