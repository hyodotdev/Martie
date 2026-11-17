import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';

import ButtonMartie from '../../../src/uis/ButtonMartie';

const mockAudioPlayer = {id: 'audio-player'};
const mockOnPress = jest.fn();
const mockSafePlayAudioPlayer = jest.fn();
const mockSafeSeekAudioPlayerToStart = jest.fn();

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text, TouchableOpacity} = jest.requireActual('react-native');

  return {
    Button: ({
      accessibilityLabel,
      text,
      touchableHighlightProps,
      ...props
    }: {
      accessibilityLabel?: string;
      children?: ReactNode;
      text: string;
      touchableHighlightProps?: Record<string, unknown>;
    }) =>
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: accessibilityLabel ?? text,
          accessibilityRole: 'button',
          ...props,
          ...touchableHighlightProps,
        },
        React.createElement(Text, null, text),
      ),
  };
});

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => mockAudioPlayer),
}));

jest.mock('../../../src/sounds', () => ({
  AUDIO_PRESS: 'audio-press.mp3',
}));

jest.mock('../../../src/utils/audioPlayer', () => ({
  safePlayAudioPlayer: (...args: unknown[]) =>
    mockSafePlayAudioPlayer(...args),
  safeSeekAudioPlayerToStart: (...args: unknown[]) =>
    mockSafeSeekAudioPlayerToStart(...args),
}));

describe('ButtonMartie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('announces the visible text as a button by default', () => {
    const {getByLabelText} = render(
      <ButtonMartie onPress={mockOnPress} text="Continue" />,
    );

    const button = getByLabelText('Continue');

    expect(button.props.accessibilityRole).toBe('button');

    fireEvent.press(button);

    expect(mockSafeSeekAudioPlayerToStart).toHaveBeenCalledWith(
      mockAudioPlayer,
    );
    expect(mockSafePlayAudioPlayer).toHaveBeenCalledWith(mockAudioPlayer);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('preserves explicit accessibility props and exposes disabled state', () => {
    const {getByLabelText} = render(
      <ButtonMartie
        accessibilityLabel="Open daily challenge"
        accessibilityRole="link"
        accessibilityState={{busy: true}}
        disabled
        onPress={mockOnPress}
        text="Continue"
      />,
    );

    const button = getByLabelText('Open daily challenge');

    expect(button.props.accessibilityRole).toBe('link');
    expect(button.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });

    fireEvent.press(button);

    expect(mockSafeSeekAudioPlayerToStart).not.toHaveBeenCalled();
    expect(mockSafePlayAudioPlayer).not.toHaveBeenCalled();
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('lets an explicit disabled prop override nested accessibility state', () => {
    const {getByLabelText} = render(
      <ButtonMartie
        accessibilityState={{disabled: true}}
        disabled={false}
        onPress={mockOnPress}
        text="Continue"
      />,
    );

    const button = getByLabelText('Continue');

    expect(button.props.accessibilityState).toEqual({disabled: false});

    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('uses touchable accessibility label when no wrapper label is provided', () => {
    const {getByLabelText} = render(
      <ButtonMartie
        onPress={mockOnPress}
        text="Continue"
        touchableHighlightProps={{accessibilityLabel: 'Native label'}}
      />,
    );

    const button = getByLabelText('Native label');

    expect(button.props.accessibilityRole).toBe('button');
  });
});
