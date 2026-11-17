import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {ThemeProvider} from 'kstyled';

import {light} from '../../../src/theme';
import DailyShareCard from '../../../src/uis/ShareCard/DailyShareCard';
import {shareToSocial} from '../../../src/utils/socialShare';

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('/tmp/mock-daily-share.png')),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 'Light',
    Soft: 'Soft',
  },
  impactAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/utils/analytics', () => ({
  LOG_EVENTS: {
    SHARE_COMPLETED: 'share_completed',
    SHARE_INITIATED: 'share_initiated',
    SHARE_SHEET_CLOSED: 'share_sheet_closed',
  },
  logEvent: jest.fn(),
}));

jest.mock('../../../src/utils/socialShare', () => ({
  shareToSocial: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/STRINGS', () => ({
  t: (key: string, params?: Record<string, string | number>) => {
    const strings: Record<string, string> = {
      'daily.correctCount': '{{correct}}/{{total}}',
      'shareCard.questionCorrect': 'Question {{number}} correct',
      'shareCard.questionIncorrect': 'Question {{number}} incorrect',
      'shareCard.shareImage': 'Share Image',
      'shareCard.shareText': 'Share Text',
      'shareCard.shareToPlatform': 'Share to {{platform}}',
      'shareCard.streak': '{{count}} days',
      'shareCard.time': '{{seconds}}s',
      'shareCard.title': "Today's Martie #{{number}}",
    };

    const template = strings[key] ?? key;
    return template.replace(/{{(\w+)}}/g, (_, token: string) =>
      String(params?.[token] ?? ''),
    );
  },
}));

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  const renderText = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Icon: ({name, ...props}: any) =>
      React.createElement(Text, props, name ?? null),
    Typography: {
      Body3: renderText,
    },
    useCPK: () => ({
      theme: {
        bg: {paper: '#ffffff'},
        role: {
          border: '#e5e7eb',
          danger: '#ef4444',
          success: '#16a34a',
        },
        text: {
          basic: '#111827',
          placeholder: '#6b7280',
        },
      },
    }),
  };
});

jest.mock('../../../src/uis/ButtonMartie', () => ({
  __esModule: true,
  default: ({onPress, text, ...props}: any) => {
    const React = jest.requireActual('react');
    const {Text, TouchableOpacity} = jest.requireActual('react-native');

    return React.createElement(
      TouchableOpacity,
      {
        accessibilityLabel: props.accessibilityLabel ?? text,
        accessibilityRole: props.accessibilityRole ?? 'button',
        onPress,
      },
      React.createElement(Text, null, text),
    );
  },
}));

const renderCard = () =>
  render(
    <ThemeProvider theme={light as any}>
      <DailyShareCard
        challengeNumber={42}
        currentStreak={2}
        results={[
          {isCorrect: true},
          {isCorrect: false},
          {isCorrect: true},
          {isCorrect: false},
          {isCorrect: true},
        ]}
        totalTimeMs={21400}
      />
    </ThemeProvider>,
  );

describe('DailyShareCard accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('announces the visual result card as one score summary', () => {
    const {getByLabelText} = renderCard();

    const summary = getByLabelText(
      "Today's Martie #42, 3/5, 21s, 2 days, Question 1 correct, Question 2 incorrect, Question 3 correct, Question 4 incorrect, Question 5 correct",
    );

    expect(summary.props.accessible).toBe(true);
    expect(summary.props.accessibilityRole).toBe('image');
  });

  it('announces each social share destination and keeps platform routing', async () => {
    const {getByLabelText} = renderCard();

    const twitter = getByLabelText('Share to X');
    const line = getByLabelText('Share to LINE');
    const kakao = getByLabelText('Share to Kakao');

    expect(twitter.props.accessibilityRole).toBe('button');
    expect(line.props.accessibilityRole).toBe('button');
    expect(kakao.props.accessibilityRole).toBe('button');

    fireEvent.press(line);

    await waitFor(() => {
      expect(shareToSocial).toHaveBeenCalledWith(
        expect.objectContaining({
          extras: {
            challengeNumber: 42,
            correctCount: 3,
            currentStreak: 2,
          },
          platform: 'line',
          source: 'daily_result',
        }),
      );
    });
  });
});
