import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';
import {Linking} from 'react-native';

import Chat from '../../app/chat';
import {logError} from '../../src/utils/error';

const mockUseModelStatus = jest.fn();
const mockSearchParams: {question?: string} = {};

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
  const {Pressable, Text} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Button: ({
      accessibilityLabel,
      onPress,
      text,
      touchableHighlightProps,
    }: any) =>
      React.createElement(
        Pressable,
        {
          accessibilityLabel: accessibilityLabel ?? text,
          accessibilityRole:
            touchableHighlightProps?.accessibilityRole ?? 'button',
          onPress,
        },
        typeof text === 'string'
          ? React.createElement(Text, null, text)
          : text,
      ),
    Typography: {
      Body2: TextComponent,
      Body3: TextComponent,
      Heading5: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
          disabled: '#e5e7eb',
        },
        role: {
          primary: '#2563eb',
        },
        text: {
          label: '#6b7280',
        },
      },
    }),
  };
});

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    FlashList: () => React.createElement(View, {testID: 'chat-list'}),
  };
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Soft: 'Soft',
  },
}));

jest.mock('../../src/hooks/useModelStatus', () => ({
  useModelStatus: () => mockUseModelStatus(),
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string) => {
    const strings: Record<string, string> = {
      'chat.aiNotSupported': 'AI is not supported',
      'chat.aiNotSupportedDesc': 'Search the web instead.',
      'chat.checkingAi': 'Checking AI',
      'chat.downloadModel': 'Download model',
      'chat.downloadingModel': 'Downloading model',
      'chat.needsSetup': 'Set up Martie AI',
      'chat.needsSetupDesc': 'Download the model to ask Martie.',
      'chat.searchOnGoogle': 'Search on Google',
    };

    return strings[key] ?? key;
  },
}));

jest.mock('../../src/utils/error', () => ({
  logError: jest.fn(),
}));

jest.mock('../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    AI_CHAT_MESSAGE_SENT: 'ai_chat_message_sent',
  },
  logEvent: jest.fn(),
}));

jest.mock('../../src/uis/ChatInput', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function ChatInput() {
    return React.createElement(View, {testID: 'chat-input'});
  };
});

jest.mock('../../src/uis/ChatMessageListEmpty', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function ChatMessageListEmpty() {
    return React.createElement(View, {testID: 'chat-empty'});
  };
});

jest.mock('../../src/uis/ChatMessageListItem', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function ChatMessageListItem() {
    return React.createElement(View, {testID: 'chat-message'});
  };
});

function setModelStatus(
  override: Partial<ReturnType<typeof baseModelStatus>>,
) {
  mockUseModelStatus.mockReturnValue({
    ...baseModelStatus(),
    ...override,
  });
}

function baseModelStatus() {
  return {
    downloadModel: jest.fn(),
    downloadProgress: 0,
    isChecking: false,
    isDownloading: false,
    isError: false,
    isNotSupported: false,
    isReady: false,
    needsSetup: false,
  };
}

describe('Chat fallback accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.question = undefined;
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('announces unsupported AI fallback with an external search link', async () => {
    mockSearchParams.question = 'What%20is%20ATP%3F';
    setModelStatus({isNotSupported: true});

    const {container, getByLabelText, getByText} = await render(<Chat />);

    expect(getByText('AI is not supported').props.accessibilityRole).toBe(
      'header',
    );

    const searchLink = getByLabelText('Search on Google');
    expect(searchLink.props.accessibilityRole).toBe('link');

    const [icon] = container.queryAll((node) => node.type === 'Image');
    expect(icon.props).toMatchObject({
      accessibilityElementsHidden: true,
      accessible: false,
      importantForAccessibility: 'no',
    });

    await fireEvent.press(searchLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.google.com/search?q=What%20is%20ATP%3F',
    );
  });

  it('logs blocked external search attempts without leaving the fallback', async () => {
    const error = new Error('blocked');
    mockSearchParams.question = 'blocked';
    jest.spyOn(Linking, 'openURL').mockRejectedValue(error);
    setModelStatus({isError: true});

    const {getByLabelText} = await render(<Chat />);

    await fireEvent.press(getByLabelText('Search on Google'));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(
        error,
        'FAILED_CHAT_GOOGLE_SEARCH',
      );
    });
  });

  it('announces AI capability checks as busy progress', async () => {
    setModelStatus({isChecking: true});

    const {getByLabelText} = await render(<Chat />);
    const progress = getByLabelText('Checking AI');

    expect(progress.props.accessibilityRole).toBe('progressbar');
    expect(progress.props.accessibilityState).toEqual({busy: true});
  });

  it('announces model download progress with a numeric value', async () => {
    setModelStatus({downloadProgress: 0.42, isDownloading: true});

    const {getByLabelText, getByText} = await render(<Chat />);

    expect(getByText('Downloading model').props.accessibilityRole).toBe(
      'header',
    );

    const progress = getByLabelText('Downloading model');
    expect(progress.props.accessibilityRole).toBe('progressbar');
    expect(progress.props.accessibilityState).toEqual({busy: true});
    expect(progress.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 42,
    });
    expect(getByText('42%')).toBeTruthy();
  });

  it('announces setup CTA and runs the model download action', async () => {
    const downloadModel = jest.fn();
    setModelStatus({downloadModel, needsSetup: true});

    const {getByLabelText, getByText} = await render(<Chat />);

    expect(getByText('Set up Martie AI').props.accessibilityRole).toBe(
      'header',
    );

    const downloadButton = getByLabelText('Download model');
    expect(downloadButton.props.accessibilityRole).toBe('button');

    await fireEvent.press(downloadButton);

    expect(downloadModel).toHaveBeenCalledTimes(1);
  });
});
