import {fireEvent, render, screen} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import {ThemeProvider, type DefaultTheme} from 'kstyled';
import {useQuery} from 'convex/react';
import {light} from '../../../../src/theme';
import BattleEntryCard from '../../../../src/uis/Battle/BattleEntryCard';

jest.mock('cpk-ui', () => {
  const {Text} = jest.requireActual('react-native');
  const {light: theme} = jest.requireActual('../../../../src/theme');
  const Plain = ({children}: {children?: ReactNode}) => <Text>{children}</Text>;
  return {
    Typography: new Proxy({}, {get: () => Plain}),
    useCPK: () => ({theme}),
  };
});
jest.mock('../../../../src/uis/ButtonMartie', () => ({
  __esModule: true,
  default: ({onPress, text}: {onPress: () => void; text: string}) => {
    const {Text, TouchableOpacity} = jest.requireActual('react-native');
    return (
      <TouchableOpacity accessibilityRole="button" onPress={onPress}>
        <Text>{text}</Text>
      </TouchableOpacity>
    );
  },
}));
jest.mock('convex/react', () => ({
  useConvexAuth: () => ({isAuthenticated: true, isLoading: false}),
  useQuery: jest.fn(),
}));

const card = (onPress = jest.fn()) => (
  <ThemeProvider theme={{...light, colors: {}} as DefaultTheme}>
    <BattleEntryCard onPress={onPress} />
  </ThemeProvider>
);

describe('BattleEntryCard', () => {
  it('shows where I stand once I have played', async () => {
    (useQuery as jest.Mock).mockReturnValue({
      wins: 7,
      losses: 2,
      draws: 1,
      streak: 3,
      bestStreak: 4,
    });
    const onPress = jest.fn();
    render(card(onPress));
    expect(await screen.findByText('7W 2L 1D')).toBeTruthy();
    expect(screen.getByText('Win rate 70%')).toBeTruthy();
    expect(screen.getByText('🔥 3 wins in a row')).toBeTruthy();

    fireEvent.press(screen.getByText('Challenge a friend'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('pitches the battle before the first match', async () => {
    (useQuery as jest.Mock).mockReturnValue({
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      bestStreak: 0,
    });
    render(card());
    expect(
      await screen.findByText(
        'Invite a friend and answer first. 10 questions, the winner takes the bulbs.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('0W 0L 0D')).toBeNull();
  });
});
