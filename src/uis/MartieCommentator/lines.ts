import {t} from '../../STRINGS';

export type CommentatorMood = 'question' | 'hurry' | 'correct' | 'wrong';

/** The same seed always picks the same line, so a re-render never swaps it. */
export function pickVariant(seed: string, count: number): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % count;
}

export function commentaryLine(mood: CommentatorMood, seed: string): string {
  switch (mood) {
    case 'question':
      return [
        t('commentator.question1'),
        t('commentator.question2'),
        t('commentator.question3'),
      ][pickVariant(seed, 3)];
    case 'hurry':
      return [t('commentator.hurry1'), t('commentator.hurry2')][
        pickVariant(seed, 2)
      ];
    case 'correct':
      return [
        t('commentator.correct1'),
        t('commentator.correct2'),
        t('commentator.correct3'),
      ][pickVariant(seed, 3)];
    case 'wrong':
      return [
        t('commentator.wrong1'),
        t('commentator.wrong2'),
        t('commentator.wrong3'),
      ][pickVariant(seed, 3)];
  }
}
