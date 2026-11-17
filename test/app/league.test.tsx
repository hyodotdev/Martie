import {render} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';

import LeaguePage from '../../app/league';

const mockUseQuery = jest.fn();

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
  const {Text} = jest.requireActual('react-native');

  const TextComponent = ({children, ...props}: any) =>
    React.createElement(Text, props, children);

  return {
    Typography: {
      Body2: TextComponent,
      Body3: TextComponent,
      Heading2: TextComponent,
      Heading4: TextComponent,
      Heading5: TextComponent,
    },
    useCPK: () => ({
      theme: {
        bg: {
          basic: '#ffffff',
          paper: '#f8fafc',
        },
        text: {
          basic: '#111111',
        },
      },
    }),
  };
});

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return {
    FlashList: ({data, ListFooterComponent, renderItem}: any) =>
      React.createElement(
        View,
        null,
        ...(data ?? []).map((item: unknown, index: number) =>
          React.createElement(
            View,
            {key: index},
            renderItem({index, item}),
          ),
        ),
        ListFooterComponent,
      ),
  };
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../../convex/_generated/api', () => ({
  api: {
    league: {
      queries: {
        getMyLeague: 'league.queries.getMyLeague',
      },
    },
  },
}));

jest.mock('../../src/STRINGS', () => ({
  t: (key: string, params?: Record<string, number | string>) => {
    const strings: Record<string, string> = {
      'league.currentUser': 'You',
      'league.demoteZone': 'Demotion zone',
      'league.demoteZoneWithThreshold': `Demotion zone, bottom ${params?.count ?? 0}`,
      'league.diamond': 'Diamond',
      'league.notJoined': 'Join the league to compete!',
      'league.promoteZone': 'Promotion zone',
      'league.promoteZoneWithThreshold': `Promotion zone, top ${params?.count ?? 0}`,
      'league.rank': `${params?.rank ?? 0}th / ${params?.total ?? 0}`,
      'league.rankAccessibility': `Rank ${params?.rank ?? 0} of ${params?.total ?? 0}`,
      'league.title': 'League',
      'league.weeklyXp': `+${params?.xp ?? 0} XP`,
    };

    return strings[key] ?? key;
  },
}));

jest.mock('../../src/hoc/withErrorBoundary', () => ({
  withErrorBoundary: (Component: any) => Component,
}));

jest.mock('../../src/uis/CustomLoadingIndicator', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function CustomLoadingIndicator() {
    return React.createElement(View, {testID: 'loading'});
  };
});

jest.mock('../../src/uis/ShareCard/LeagueShareCard', () => {
  const React = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');

  return function LeagueShareCard() {
    return React.createElement(View, {testID: 'league-share-card'});
  };
});

jest.mock('../../src/utils/analytics', () => ({
  logScreenView: jest.fn(),
}));

describe('LeaguePage accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      members: [
        {
          displayName: 'TopUser',
          isBot: false,
          isMe: false,
          odI: 'user-1',
          rank: 1,
          tier: 'diamond',
          weeklyXp: 300,
        },
        {
          displayName: 'Hyo',
          isBot: false,
          isMe: true,
          odI: 'user-2',
          rank: 2,
          tier: 'diamond',
          weeklyXp: 250,
        },
        {
          displayName: 'MiddleUser',
          isBot: false,
          isMe: false,
          odI: 'user-3',
          rank: 3,
          tier: 'diamond',
          weeklyXp: 120,
        },
        {
          displayName: 'StableUser',
          isBot: false,
          isMe: false,
          odI: 'user-4',
          rank: 4,
          tier: 'diamond',
          weeklyXp: 80,
        },
        {
          displayName: 'BottomUser',
          isBot: false,
          isMe: false,
          odI: 'user-5',
          rank: 5,
          tier: 'diamond',
          weeklyXp: 10,
        },
        {
          displayName: 'LastUser',
          isBot: false,
          isMe: false,
          odI: 'user-6',
          rank: 6,
          tier: 'diamond',
          weeklyXp: 0,
        },
      ],
      myRank: 2,
      promoteThreshold: 2,
      demoteThreshold: 4,
      tier: 'diamond',
      totalMembers: 6,
      weekStart: '2026-07-06',
      weeklyXp: 250,
    });
  });

  it('announces league heading, zones, and member rows', () => {
    const {getByLabelText, getByTestId, getByText} = render(<LeaguePage />);

    const header = getByLabelText('Diamond League, Rank 2 of 6');
    expect(header.props.accessibilityRole).toBe('header');

    const zoneGuide = getByLabelText(
      'Promotion zone, top 2, Demotion zone, bottom 2',
    );
    expect(zoneGuide.props.accessibilityRole).toBe('text');
    expect(getByText('↑ Promotion zone, top 2')).toBeTruthy();
    expect(getByText('↓ Demotion zone, bottom 2')).toBeTruthy();

    const meRow = getByLabelText(
      'Rank 2 of 6, Hyo, +250 XP, You, Promotion zone',
    );
    expect(meRow.props.accessibilityRole).toBe('text');
    expect(meRow.props.accessibilityState).toEqual({selected: true});
    expect(getByText('Hyo (You)')).toBeTruthy();

    const demoteRow = getByLabelText(
      'Rank 5 of 6, BottomUser, +10 XP, Demotion zone',
    );
    expect(demoteRow.props.accessibilityRole).toBe('text');
    expect(demoteRow.props.accessibilityState).toBeUndefined();

    expect(getByTestId('league-share-card')).toBeTruthy();
  });

  it('renders the not-joined state without a leaderboard', () => {
    mockUseQuery.mockReturnValue(null);

    const {getByText, queryByTestId} = render(<LeaguePage />);

    expect(getByText('Join the league to compete!')).toBeTruthy();
    expect(queryByTestId('league-share-card')).toBeNull();
  });

  it('omits demotion labels when the zone would overlap promotion ranks', () => {
    mockUseQuery.mockReturnValue({
      members: [
        {
          displayName: 'TopUser',
          isBot: false,
          isMe: false,
          odI: 'user-1',
          rank: 1,
          tier: 'diamond',
          weeklyXp: 300,
        },
        {
          displayName: 'Hyo',
          isBot: false,
          isMe: true,
          odI: 'user-2',
          rank: 2,
          tier: 'diamond',
          weeklyXp: 250,
        },
        {
          displayName: 'MiddleUser',
          isBot: false,
          isMe: false,
          odI: 'user-3',
          rank: 3,
          tier: 'diamond',
          weeklyXp: 120,
        },
        {
          displayName: 'LastUser',
          isBot: false,
          isMe: false,
          odI: 'user-4',
          rank: 4,
          tier: 'diamond',
          weeklyXp: 10,
        },
      ],
      myRank: 2,
      promoteThreshold: 5,
      demoteThreshold: 4,
      tier: 'diamond',
      totalMembers: 4,
      weekStart: '2026-07-06',
      weeklyXp: 250,
    });

    const {getByLabelText, queryByLabelText, queryByText} = render(
      <LeaguePage />,
    );

    expect(getByLabelText('Promotion zone, top 4')).toBeTruthy();
    expect(queryByText('↓ Demotion zone, bottom 0')).toBeNull();
    expect(
      queryByLabelText('Rank 4 of 4, LastUser, +10 XP, Demotion zone'),
    ).toBeNull();
    expect(
      getByLabelText('Rank 4 of 4, LastUser, +10 XP, Promotion zone'),
    ).toBeTruthy();
  });
});
