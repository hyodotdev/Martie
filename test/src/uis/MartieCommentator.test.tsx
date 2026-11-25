import {act, render, screen} from '@testing-library/react-native';
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

  it('talks the question in, then settles into the thinking pose', () => {
    render(<MartieCommentator mood="question" seed="quiz-1" size={150} />);
    expect(shownFrame()).toBe('talkOpen');

    act(() => jest.advanceTimersByTime(130));
    expect(shownFrame()).toBe('talkClosed');

    act(() => jest.advanceTimersByTime(2000));
    expect(shownFrame()).toBe('think');
    expect(
      screen.getByLabelText(commentaryLine('question', 'quiz-1')),
    ).toBeTruthy();
  });

  it('types the line out without changing what it reads aloud', () => {
    const line = commentaryLine('correct', 'quiz-2');
    render(<MartieCommentator mood="correct" seed="quiz-2" size={150} />);
    expect(untyped()).toBe(line);
    expect(screen.getByLabelText(line)).toBeTruthy();

    // Each character schedules the next after a render, so step through.
    for (let i = 0; i <= line.length; i++) {
      act(() => jest.advanceTimersByTime(28));
    }
    expect(untyped()).toBe('');
    expect(screen.getByLabelText(line)).toBeTruthy();
  });

  it('jumps straight to the reaction pose for answers', () => {
    const {rerender} = render(
      <MartieCommentator mood="correct" seed="quiz-3" size={150} />,
    );
    expect(shownFrame()).toBe('cheer');

    rerender(<MartieCommentator mood="wrong" seed="quiz-3" size={150} />);
    expect(shownFrame()).toBe('shock');
  });

  it('panics with a new line once time runs low', () => {
    const line = commentaryLine('hurry', 'quiz-4');
    const {rerender} = render(
      <MartieCommentator mood="question" seed="quiz-4" size={150} />,
    );
    act(() => jest.advanceTimersByTime(300));
    const mounts = mockImageMounts;
    rerender(<MartieCommentator mood="hurry" seed="quiz-4" size={150} />);

    expect(shownFrame()).toBe('nervous');
    expect(screen.getByLabelText(line)).toBeTruthy();
    expect(untyped()).toBe(line);
    // The frames stay loaded through the pose change.
    expect(mockImageMounts).toBe(mounts);
  });

  it('owns up to the clock when time runs out', () => {
    render(<MartieCommentator mood="timeout" seed="quiz-6" size={150} />);

    expect(shownFrame()).toBe('nervous');
    expect(
      screen.getByLabelText(commentaryLine('timeout', 'quiz-6')),
    ).toBeTruthy();
  });

  it('skips the lip flap and typing when motion is reduced', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    render(<MartieCommentator mood="question" seed="quiz-5" size={150} />);

    expect(shownFrame()).toBe('think');
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
