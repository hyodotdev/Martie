import {act, render, screen} from '@testing-library/react-native';
import type {ComponentProps, ReactElement, ReactNode} from 'react';
import {ThemeProvider} from 'kstyled';
import {StyleSheet} from 'react-native';
import {useReducedMotion} from 'react-native-reanimated';
import MartieCommentator from '../../../src/uis/MartieCommentator';
import {
  answerMood,
  commentaryLine,
  pickVariant,
} from '../../../src/uis/MartieCommentator/lines';

// Counts sprite mounts, so a test can tell a pose change from a remount.
let mockImageMounts = 0;

// Name each frame after its pose so the test can ask which one is showing.
jest.mock('../../../src/icons', () => ({
  SPRITE_MARTIE_MC: {
    talkOpen: 'talkOpen',
    talkClosed: 'talkClosed',
    think: 'think',
    cheer: 'cheer',
    shock: 'shock',
    nervous: 'nervous',
  },
}));
jest.mock('expo-image', () => ({
  Image: ({source, style}: {source: string; style: object}) => {
    const {useEffect} = jest.requireActual('react');
    const {View} = jest.requireActual('react-native');
    useEffect(() => {
      mockImageMounts += 1;
    }, []);
    return <View testID={source} style={style} />;
  },
}));

type Theme = ComponentProps<typeof ThemeProvider>['theme'];

// Just the colors the speech bubble reads.
const theme = {
  role: {border: '#d9d9d9'},
  bg: {bubble: '#ffffff'},
  text: {basic: '#222222', label: '#888888'},
} as unknown as Theme;

function Themed({children}: {children: ReactNode}): JSX.Element {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

async function renderThemed(ui: ReactElement) {
  return await render(ui, {wrapper: Themed});
}

const POSES = ['talkOpen', 'talkClosed', 'think', 'cheer', 'shock', 'nervous'];

function shownFrame(): string | undefined {
  return POSES.find(
    (pose) =>
      StyleSheet.flatten(
        // The sprite is decorative, so it is hidden from accessibility.
        screen.getByTestId(pose, {includeHiddenElements: true}).props.style,
      ).opacity === 1,
  );
}

// The part of the line not typed yet, kept invisible to hold the width.
function untyped(): string {
  return screen.getByTestId('commentator-untyped').props.children;
}

describe('MartieCommentator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockImageMounts = 0;
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // He lands, shows typing dots, then starts his line.
  async function startSpeaking() {
    await act(() => jest.advanceTimersByTime(700));
    await act(() => jest.advanceTimersByTime(550));
  }

  it('thinks, shows typing dots, then talks the question in', async () => {
    await renderThemed(
      <MartieCommentator mood="question" seed="quiz-1" size={150} />,
    );
    expect(shownFrame()).toBe('think');
    expect(screen.queryByText('•••')).toBeNull();

    await act(() => jest.advanceTimersByTime(700));
    expect(screen.getByText('•••')).toBeTruthy();
    expect(shownFrame()).toBe('think');

    await act(() => jest.advanceTimersByTime(550));
    expect(screen.queryByText('•••')).toBeNull();
    expect(shownFrame()).toBe('talkOpen');
    await act(() => jest.advanceTimersByTime(130));
    expect(shownFrame()).toBe('talkClosed');

    const line = commentaryLine('question', 'quiz-1');
    for (let i = 0; i <= line.length; i++) {
      await act(() => jest.advanceTimersByTime(38));
    }
    expect(untyped()).toBe('');
    expect(shownFrame()).toBe('think');
    expect(screen.getByLabelText(line)).toBeTruthy();
  });

  it('types the line out without changing what it reads aloud', async () => {
    const line = commentaryLine('correct', 'quiz-2');
    await renderThemed(<MartieCommentator mood="correct" seed="quiz-2" size={150} />);
    expect(untyped()).toBe(line);
    expect(screen.getByLabelText(line)).toBeTruthy();

    await startSpeaking();
    // Each character schedules the next after a render, so step through.
    for (let i = 0; i <= line.length; i++) {
      await act(() => jest.advanceTimersByTime(38));
    }
    expect(untyped()).toBe('');
    expect(screen.getByLabelText(line)).toBeTruthy();
  });

  it('catches up instead of dragging the line out on a slow device', async () => {
    const line = commentaryLine('correct', 'quiz-7');
    await renderThemed(<MartieCommentator mood="correct" seed="quiz-7" size={150} />);
    await startSpeaking();
    await act(() => jest.advanceTimersByTime(38));

    // The JS thread stalls past the whole line before the next tick lands.
    jest.setSystemTime(Date.now() + 38 * line.length);
    await act(() => jest.advanceTimersByTime(38));
    expect(untyped()).toBe('');
  });

  it('jumps straight to the reaction pose for answers', async () => {
    const {rerender} = await renderThemed(
      <MartieCommentator mood="correct" seed="quiz-3" size={150} />,
    );
    expect(shownFrame()).toBe('cheer');

    await rerender(<MartieCommentator mood="wrong" seed="quiz-3" size={150} />);
    expect(shownFrame()).toBe('shock');
  });

  it('panics with a new line once time runs low', async () => {
    const line = commentaryLine('hurry', 'quiz-4');
    const {rerender} = await renderThemed(
      <MartieCommentator mood="question" seed="quiz-4" size={150} />,
    );
    await startSpeaking();
    const mounts = mockImageMounts;
    await rerender(<MartieCommentator mood="hurry" seed="quiz-4" size={150} />);

    expect(shownFrame()).toBe('nervous');
    expect(screen.getByLabelText(line)).toBeTruthy();
    // He is already on screen, so the new line starts with typing dots.
    expect(screen.getByText('•••')).toBeTruthy();
    expect(untyped()).toBe(line);
    // The frames stay loaded through the pose change.
    expect(mockImageMounts).toBe(mounts);
  });

  it('owns up to the clock when time runs out', async () => {
    await renderThemed(<MartieCommentator mood="timeout" seed="quiz-6" size={150} />);

    expect(shownFrame()).toBe('nervous');
    expect(
      screen.getByLabelText(commentaryLine('timeout', 'quiz-6')),
    ).toBeTruthy();
  });

  it('skips the wait, lip flap and typing when motion is reduced', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    await renderThemed(
      <MartieCommentator mood="question" seed="quiz-5" size={150} />,
    );

    expect(shownFrame()).toBe('think');
    expect(screen.queryByText('•••')).toBeNull();
    expect(untyped()).toBe('');
  });
});

describe('answerMood', () => {
  it('tells a timeout apart from a wrong pick', () => {
    expect(answerMood(true, 'quiz_opt1')).toBe('correct');
    expect(answerMood(false, 'quiz_opt2')).toBe('wrong');
    expect(answerMood(false, 'wrong')).toBe('timeout');
  });
});

describe('pickVariant', () => {
  it('is stable for a seed and stays in range', () => {
    for (const seed of ['a', 'quiz-1', 'k17abc', '']) {
      const pick = pickVariant(seed, 3);
      expect(pick).toBe(pickVariant(seed, 3));
      expect(pick).toBeGreaterThanOrEqual(0);
      expect(pick).toBeLessThan(3);
    }
  });

  it('spreads seeds across every line', () => {
    const picks = new Set(
      Array.from({length: 30}, (_, i) => pickVariant(`quiz-${i}`, 3)),
    );
    expect(picks.size).toBe(3);
  });
});
