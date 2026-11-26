import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {ThemeProvider} from 'kstyled';

import DailyChallengeCard from '../../../src/uis/DailyChallenge/DailyChallengeCard';
import LeagueProgressCard from '../../../src/uis/League/LeagueProgressCard';

const theme = {
  bg: {
    basic: '#ffffff',
    paper: '#ffffff',
  },
  role: {
    border: '#e5e7eb',
    danger: '#ef4444',
    primary: '#2563eb',
    success: '#16a34a',
  },
  text: {
    basic: '#111827',
    label: '#374151',
    placeholder: '#9ca3af',
  },
};

jest.mock('cpk-ui', () => {
  const React = jest.requireActual('react');
  const {Text} = jest.requireActual('react-native');

  const renderText = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Typography: {
      Body2: renderText,
      Body3: renderText,
      Body4: renderText,
      Heading5: renderText,
    },
    useCPK: () => ({theme}),
  };
});

jest.mock('../../../src/STRINGS', () => ({
  t: jest.fn((key: string, params?: Record<string, number>) => {
    const strings: Record<string, string> = {
      'daily.completed': 'Completed',
      'daily.shareResult': 'Share Result',
      'daily.title': "Today's Quiz",
      'daily.tryNow': 'Try Now',
      'league.bronze': 'Bronze',
      'league.diamond': 'Diamond',
      'league.gold': 'Gold',
      'league.joinLeague': 'Join League',
      'league.master': 'Master',
      'league.notJoined': 'Join the league to compete!',
      'league.silver': 'Silver',
      'league.title': 'League',
    };

    if (key === 'daily.questionsCount') {
      return `${params?.count ?? 0} questions`;
    }

    if (key === 'daily.correctCount') {
      return `${params?.correct ?? 0}/${params?.total ?? 0}`;
    }

    if (key === 'league.rank') {
      return `${params?.rank ?? 0}th / ${params?.total ?? 0}`;
    }

    if (key === 'league.weeklyXp') {
      return `+${params?.xp ?? 0} XP`;
    }

    return strings[key] ?? key;
  }),
}));

jest.mock('../../../src/uis/ButtonMartie', () => ({
  __esModule: true,
  default: ({disabled, onPress, text}: any) => {
    const React = jest.requireActual('react');
    const {Text, TouchableOpacity} = jest.requireActual('react-native');

    return React.createElement(
      TouchableOpacity,
      {
        accessibilityLabel: text,
        disabled,
        onPress,
      },
      React.createElement(Text, null, text),
    );
  },
}));

const renderWithTheme = async (children: JSX.Element) =>
  await render(<ThemeProvider theme={theme as any}>{children}</ThemeProvider>);

describe('home card accessibility', () => {
  it('announces the daily challenge action with category context', async () => {
    const onPress = jest.fn();

    const {getByLabelText} = await renderWithTheme(
      <DailyChallengeCard
        categoryName="Science"
        challengeNumber={42}
        isCompleted={false}
        onPress={onPress}
        onShare={jest.fn()}
        userResults={[]}
      />,
    );

    const card = getByLabelText(
      "Today's Quiz, #42, Science, 5 questions",
    );

    expect(card.props.accessibilityRole).toBe('button');

    await fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces the joined league card with rank and XP context', async () => {
    const onPress = jest.fn();

    const {getByLabelText} = await renderWithTheme(
      <LeagueProgressCard
        isLoading={false}
        myRank={3}
        onPress={onPress}
        tier="gold"
        totalMembers={25}
        weeklyXp={180}
      />,
    );

    const card = getByLabelText('Gold League, 3th / 25, +180 XP');

    expect(card.props.accessibilityRole).toBe('button');

    await fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces the join league card as a button', async () => {
    const {getByLabelText} = await renderWithTheme(
      <LeagueProgressCard
        isLoading={false}
        myRank={0}
        onPress={jest.fn()}
        tier={null}
        totalMembers={0}
        weeklyXp={0}
      />,
    );

    const card = getByLabelText('Join League, Join the league to compete!');

    expect(card.props.accessibilityRole).toBe('button');
  });

  it('marks the league skeleton as busy progress', async () => {
    const {getByLabelText} = await renderWithTheme(
      <LeagueProgressCard
        isLoading={true}
        myRank={0}
        onPress={jest.fn()}
        tier={null}
        totalMembers={0}
        weeklyXp={0}
      />,
    );

    const skeleton = getByLabelText('League');

    expect(skeleton.props.accessible).toBe(true);
    expect(skeleton.props.accessibilityRole).toBe('progressbar');
    expect(skeleton.props.accessibilityState).toEqual({busy: true});
  });
});
