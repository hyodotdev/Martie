import {fireEvent, render, screen} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import {ThemeProvider, type DefaultTheme} from 'kstyled';
import {light} from '../../../../src/theme';
import BattlePlay, {
  canAnswer,
  hostLine,
  optionState,
  pickedBy,
} from '../../../../src/uis/Battle/BattlePlay';
import BattleResult, {myResult} from '../../../../src/uis/Battle/BattleResult';
import BattleRecordCard from '../../../../src/uis/Battle/BattleRecordCard';
import BattleLobby from '../../../../src/uis/Battle/BattleLobby';
import {
  battleErrorMessage,
  type BattleErrorReason,
} from '../../../../src/uis/Battle/battleMessages';
import {needsInviteAd} from '../../../../src/hooks/useBattleInvite';
import type {BattleRoom, BattleRound} from '../../../../src/uis/Battle/types';

// cpk-ui's provider waits for fonts the test setup never loads, so render
// its primitives as plain text.
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

const createTestElement = (child: JSX.Element): JSX.Element => (
  <ThemeProvider theme={{...light, colors: {}} as DefaultTheme}>
    {child}
  </ThemeProvider>
);

const round = (overrides: Partial<BattleRound> = {}): BattleRound => ({
  index: 0,
  question: 'Which planet is red?',
  options: [
    {key: 'mars', description: 'Mars'},
    {key: 'venus', description: 'Venus'},
  ],
  first: null,
  second: null,
  winner: null,
  correctOptionKey: null,
  answerDescription: null,
  ...overrides,
});

const room = (overrides: Partial<BattleRoom> = {}): BattleRoom => ({
  code: 'abcd2345',
  status: 'playing',
  myRole: 'host',
  headToHead: {wins: 0, losses: 0, draws: 0},
  host: {
    displayName: 'Hana',
    avatarUrl: null,
    ready: true,
    seenAt: 0,
    record: {wins: 0, losses: 0, draws: 0},
  },
  guest: {
    displayName: 'Gil',
    avatarUrl: null,
    ready: true,
    seenAt: 0,
    record: {wins: 0, losses: 0, draws: 0},
  },
  stake: 1,
  phase: 'question',
  phaseStartedAt: 0,
  phaseEndsAt: 15000,
  currentIndex: 0,
  totalQuestions: 10,
  hostScore: 0,
  guestScore: 0,
  outcome: null,
  endReason: null,
  forfeitedBy: null,
  rematchCode: null,
  round: round(),
  ...overrides,
});

describe('answer rules on the client', () => {
  const missed = {role: 'host' as const, optionKey: 'venus', correct: false};

  it('anyone may answer an open question; only the other player a second chance', () => {
    expect(canAnswer('question', round(), 'guest')).toBe(true);
    expect(canAnswer('second_chance', round({first: missed}), 'host')).toBe(false);
    expect(canAnswer('second_chance', round({first: missed}), 'guest')).toBe(true);
    expect(canAnswer('reveal', round(), 'guest')).toBe(false);
    expect(canAnswer('question', null, 'guest')).toBe(false);
  });

  it('marks wrong picks, the revealed answer and a pending pick', () => {
    const r = round({first: missed, correctOptionKey: 'mars'});
    expect(optionState('venus', r, null)).toBe('wrong');
    expect(optionState('mars', r, null)).toBe('correct');
    expect(optionState('mars', round(), 'mars')).toBe('pending');
    expect(optionState('mars', round(), null)).toBe('idle');
  });

  it('holds a buzz as judging until the verdict, and tracks who picked it', () => {
    const judged = round({first: {role: 'guest', optionKey: 'mars', correct: null}});
    expect(canAnswer('judging', judged, 'host')).toBe(false);
    expect(optionState('mars', judged, null)).toBe('judging');
    expect(pickedBy('mars', judged)).toBe('guest');
    expect(pickedBy('venus', judged)).toBeNull();
  });

  it('has Martie announce who buzzed and who scored', () => {
    const buzzedByGil = round({first: {role: 'guest', optionKey: 'mars', correct: null}});
    expect(
      hostLine(room({phase: 'judging', round: buzzedByGil}), 'host').message,
    ).toBe('Gil buzzed in! Is it right…?');
    expect(
      hostLine(room({phase: 'judging', round: buzzedByGil}), 'guest').message,
    ).toBe('You buzzed in! Is it right…?');
    const hostWon = round({winner: 'host', correctOptionKey: 'mars'});
    expect(hostLine(room({phase: 'reveal', round: hostWon}), 'host')).toEqual({
      mood: 'smart',
      message: 'You got it!',
    });
    expect(hostLine(room({phase: 'reveal', round: hostWon}), 'guest').message).toBe(
      'Hana got it!',
    );
  });

  it('maps the outcome to my result', () => {
    expect(myResult('host', 'host')).toBe('win');
    expect(myResult('host', 'guest')).toBe('loss');
    expect(myResult('draw', 'guest')).toBe('draw');
  });

  it('only free members on native watch the invite ad', () => {
    expect(needsInviteAd(false, 'ios')).toBe(true);
    expect(needsInviteAd(true, 'android')).toBe(false);
    expect(needsInviteAd(false, 'web')).toBe(false);
  });

  it('has a message for every error reason', () => {
    const reasons: BattleErrorReason[] = [
      'not_authenticated', 'no_profile', 'invalid_code', 'not_found', 'closed',
      'finished', 'started', 'full', 'host_offline', 'insufficient_bulbs',
      'opponent_insufficient_bulbs', 'opponent_offline', 'daily_limit',
      'no_quizzes', 'not_waiting', 'no_opponent', 'not_playing', 'not_in_round',
      'not_your_turn', 'too_late', 'same_option', 'invalid_option', 'network',
    ];
    for (const reason of reasons) {
      expect(battleErrorMessage(reason)).toEqual(expect.any(String));
      expect(battleErrorMessage(reason)).not.toBe('');
    }
  });
});

describe('BattlePlay', () => {
  it('sends the chosen option for the current question', async () => {
    const onAnswer = jest.fn();
    render(
      createTestElement(
        <BattlePlay
          room={room()}
          myRole="host"
          offsetMs={0}
          pendingOptionKey={null}
          onAnswer={onAnswer}
        />,
      ),
    );
    expect(await screen.findByText('Which planet is red?')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Mars'));
    expect(onAnswer).toHaveBeenCalledWith(0, 'mars');
  });

  it('locks the options after I missed and the other player answers', async () => {
    const onAnswer = jest.fn();
    render(
      createTestElement(
        <BattlePlay
          room={room({
            phase: 'second_chance',
            round: round({first: {role: 'host', optionKey: 'venus', correct: false}}),
          })}
          myRole="host"
          offsetMs={0}
          pendingOptionKey={null}
          onAnswer={onAnswer}
        />,
      ),
    );
    fireEvent.press(await screen.findByLabelText('Mars'));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe('BattleResult', () => {
  it('offers to join the rematch the other player opened', async () => {
    const onJoinRematch = jest.fn();
    render(
      createTestElement(
        <BattleResult
          room={room({
            status: 'finished',
            outcome: 'guest',
            hostScore: 3,
            guestScore: 5,
            rematchCode: 'wxyz2345',
            round: null,
          })}
          myRole="host"
          isBusy={false}
          onRematch={jest.fn()}
          onJoinRematch={onJoinRematch}
          onHome={jest.fn()}
        />,
      ),
    );
    fireEvent.press(await screen.findByText('Join the rematch'));
    expect(onJoinRematch).toHaveBeenCalledWith('wxyz2345');
  });
});

describe('battle records', () => {
  it('shows my lifetime record with win rate and streaks', async () => {
    render(
      createTestElement(
        <BattleRecordCard
          stats={{wins: 7, losses: 2, draws: 1, streak: 3, bestStreak: 4}}
        />,
      ),
    );
    expect(await screen.findByText('Win rate 70%')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('🔥 3 wins in a row')).toBeTruthy();
    expect(screen.getByText('Best: 4 in a row')).toBeTruthy();
  });

  it('shows the head-to-head after a match, or a first meeting', async () => {
    const finished = (headToHead: BattleRoom['headToHead']) =>
      createTestElement(
        <BattleResult
          room={room({status: 'finished', outcome: 'host', round: null, headToHead})}
          myRole="host"
          isBusy={false}
          onRematch={jest.fn()}
          onJoinRematch={jest.fn()}
          onHome={jest.fn()}
        />,
      );
    const {unmount} = render(finished({wins: 3, losses: 1, draws: 0}));
    expect(await screen.findByText('⚔️ Record vs Gil')).toBeTruthy();
    expect(screen.getByText('3W 1L 0D')).toBeTruthy();
    unmount();

    render(finished({wins: 0, losses: 0, draws: 0}));
    expect(await screen.findByText('Your first match!')).toBeTruthy();
  });
});

describe('BattleLobby', () => {
  const lobby = () =>
    createTestElement(
      <BattleLobby
        room={room({
          status: 'waiting',
          round: null,
          headToHead: {wins: 2, losses: 1, draws: 0},
          guest: {
            displayName: 'Gil',
            avatarUrl: null,
            ready: false,
            seenAt: 0,
            record: {wins: 5, losses: 3, draws: 2},
          },
        })}
        myRole="host"
        offsetMs={0}
        isBusy={false}
        onReady={jest.fn()}
        onShare={jest.fn()}
      />,
    );

  it('keeps seats compact and opens the profile on a tap', async () => {
    render(lobby());
    const seat = await screen.findByLabelText('Gil, Offline');
    expect(screen.queryByText('5W 3L 2D')).toBeNull();

    fireEvent.press(seat);
    expect(await screen.findByText('Win rate 50%')).toBeTruthy();
    // The lobby's own head-to-head card plus the one in the profile.
    expect(screen.getAllByText('⚔️ Record vs Gil')).toHaveLength(2);
    // A tapped profile stays open until the backdrop is tapped.
    fireEvent(seat, 'pressOut');
    expect(screen.getByText('Win rate 50%')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close profile'));
    expect(screen.queryByText('Win rate 50%')).toBeNull();
  });

  it('shows a held profile only while the finger stays down', async () => {
    render(lobby());
    const seat = await screen.findByLabelText('Gil, Offline');
    fireEvent(seat, 'longPress');
    expect(await screen.findByText('Win rate 50%')).toBeTruthy();
    fireEvent(seat, 'pressOut');
    expect(screen.queryByText('Win rate 50%')).toBeNull();
  });
});
