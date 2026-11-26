import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';
import {ThemeProvider} from 'kstyled';

import ChatInput from '../../../src/uis/ChatInput';

const theme = {
  bg: {
    basic: '#ffffff',
  },
  role: {
    border: '#e5e7eb',
  },
  text: {
    basic: '#111827',
    disabled: '#9ca3af',
  },
};

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Pressable, Text, View} = jest.requireActual('react-native');

  return {
    CustomPressable: ({
      children,
      ...props
    }: {
      children: ReactNode;
    }) => React.createElement(Pressable, props, children),
    EditText: ({
      endElement,
      placeholder,
    }: {
      endElement?: ReactNode;
      placeholder?: string;
    }) =>
      React.createElement(
        View,
        {accessibilityLabel: placeholder, testID: 'chat-input'},
        endElement,
      ),
    Icon: ({name}: {name: string}) => React.createElement(Text, null, name),
    useCPK: () => ({theme}),
  };
});

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string) => key),
}));

const renderChatInput = async (
  props: Partial<React.ComponentProps<typeof ChatInput>> = {},
) =>
  await render(
    <ThemeProvider theme={theme as any}>
      <ChatInput
        createChatMessage={jest.fn()}
        message="hello"
        setMessage={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );

describe('ChatInput', () => {
  it('announces the send icon button and submits the message', async () => {
    const createChatMessage = jest.fn();
    const {getByLabelText} = await renderChatInput({createChatMessage});

    const sendButton = getByLabelText('common.send');

    expect(sendButton.props.accessibilityRole).toBe('button');
    expect(sendButton.props.accessibilityState).toEqual({disabled: false});

    await fireEvent.press(sendButton);

    expect(createChatMessage).toHaveBeenCalledTimes(1);
  });

  it('announces the disabled send state without submitting', async () => {
    const createChatMessage = jest.fn();
    const {getByLabelText} = await renderChatInput({
      createChatMessage,
      disabled: true,
    });

    const sendButton = getByLabelText('common.send');

    expect(sendButton.props.accessibilityState).toEqual({disabled: true});

    await fireEvent.press(sendButton);

    expect(createChatMessage).not.toHaveBeenCalled();
  });

  it('announces response generation as a busy progress indicator', async () => {
    const {getByLabelText, queryByLabelText} = await renderChatInput({
      loading: true,
    });

    const loadingIndicator = getByLabelText('common.thinking');

    expect(loadingIndicator.props.accessibilityRole).toBe('progressbar');
    expect(loadingIndicator.props.accessibilityState).toEqual({busy: true});
    expect(queryByLabelText('common.send')).toBeNull();
  });
});
