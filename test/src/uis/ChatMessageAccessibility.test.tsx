import {render} from '@testing-library/react-native';
import React from 'react';
import {ThemeProvider} from 'kstyled';

import type {ChatMessage} from '../../../src/types';
import ChatMessageListEmpty from '../../../src/uis/ChatMessageListEmpty';
import ChatMessageListItem from '../../../src/uis/ChatMessageListItem';

const theme = {
  bg: {
    basic: '#ffffff',
    paper: '#f9fafb',
  },
  role: {
    border: '#e5e7eb',
    primary: '#2563eb',
  },
  text: {
    basic: '#111827',
    disabled: '#9ca3af',
    placeholder: '#6b7280',
  },
};

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  return {
    Typography: {
      Body2: ({children, ...props}: {children: React.ReactNode}) =>
        React.createElement(Text, props, children),
    },
    useCPK: () => ({theme}),
  };
});

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('../../../src/icons', () => ({
  IC_MARTIE: 1,
}));

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'chat.martieMessageAccessibility': `Martie replied: ${params?.message}`,
      'chat.martieThinkingAccessibility': 'Martie is thinking',
      'chat.userMessageAccessibility': `You said: ${params?.message}`,
      'common.thinking': "I'm thinking...",
    };

    return translations[key] ?? key;
  }),
}));

const renderWithTheme = async (ui: React.ReactElement) =>
  await render(<ThemeProvider theme={theme as any}>{ui}</ThemeProvider>);

const chatMessage = (override: Partial<ChatMessage>): ChatMessage =>
  ({
    _id: 'chat-message-id',
    _creationTime: 123,
    message: '',
    reply: '',
    ...override,
  }) as ChatMessage;

describe('Chat message accessibility', () => {
  it('announces human and Martie chat bubbles with speaker context', async () => {
    const {getByLabelText} = await renderWithTheme(
      <ChatMessageListItem
        item={chatMessage({
          message: 'What is photosynthesis?',
          reply: 'Plants turn light into energy.',
        })}
      />,
    );

    const humanMessage = getByLabelText('You said: What is photosynthesis?');
    const martieMessage = getByLabelText(
      'Martie replied: Plants turn light into energy.',
    );

    expect(humanMessage.props.accessibilityRole).toBe('text');
    expect(martieMessage.props.accessibilityRole).toBe('text');
  });

  it('announces the temporary Martie reply as busy progress', async () => {
    const {getByLabelText} = await renderWithTheme(
      <ChatMessageListItem
        item={chatMessage({
          message: 'Explain this quiz',
          reply: "I'm thinking...",
        })}
      />,
    );

    const thinkingBubble = getByLabelText('Martie is thinking');

    expect(thinkingBubble.props.accessibilityRole).toBe('progressbar');
    expect(thinkingBubble.props.accessibilityState).toEqual({busy: true});
  });

  it('keeps parsed URLs interactive by using separate speaker prefixes', async () => {
    const {getAllByLabelText, queryByLabelText} = await renderWithTheme(
      <ChatMessageListItem
        item={chatMessage({
          message: 'Read https://example.com',
          reply: 'Open https://martie.example',
        })}
      />,
    );

    const humanPrefix = getAllByLabelText('You said: ');
    const martiePrefix = getAllByLabelText('Martie replied: ');

    expect(humanPrefix[0].props.accessibilityRole).toBe('text');
    expect(martiePrefix[0].props.accessibilityRole).toBe('text');
    expect(queryByLabelText('You said: Read https://example.com')).toBeNull();
    expect(
      queryByLabelText('Martie replied: Open https://martie.example'),
    ).toBeNull();
  });

  it('announces the empty chat placeholder as pending progress', async () => {
    const {getByLabelText} = await renderWithTheme(<ChatMessageListEmpty />);

    const emptyPlaceholder = getByLabelText('Martie is thinking');

    expect(emptyPlaceholder.props.accessibilityRole).toBe('progressbar');
    expect(emptyPlaceholder.props.accessibilityState).toEqual({busy: true});
  });
});
