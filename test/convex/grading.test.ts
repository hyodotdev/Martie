import {
  displayedOptions,
  isCorrectOption,
} from '../../convex/quizResult/grading';

const options = [
  {key: 'a', isAnswer: true},
  {key: 'b'},
  {key: 'c'},
  {key: 'd'},
];

describe('displayedOptions', () => {
  it('shows a quiz in the same order every time', () => {
    expect(displayedOptions('quiz1', options)).toEqual(
      displayedOptions('quiz1', options),
    );
  });

  it('keeps every option', () => {
    expect(
      displayedOptions('quiz1', options)
        .map((option) => option.key)
        .sort(),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not always put the answer in one place', () => {
    const answerPositions = new Set(
      Array.from({length: 40}, (_, i) =>
        displayedOptions(`quiz${i}`, options).findIndex(
          (option) => option.isAnswer,
        ),
      ),
    );
    expect(answerPositions.size).toBe(4);
  });

  it('grades the position the player tapped in the order they saw', () => {
    const shown = displayedOptions('quiz1', options);
    const tapped = shown.findIndex((option) => option.isAnswer);
    expect(isCorrectOption(displayedOptions('quiz1', options), tapped)).toBe(
      true,
    );
  });
});
