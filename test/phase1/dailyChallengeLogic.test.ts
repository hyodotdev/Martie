/**
 * 데일리 챌린지 로직 유닛 테스트
 */

function getCategoryIndex(date: string, totalCategories: number): number {
  const daysSinceEpoch = Math.floor(
    new Date(date).getTime() / (24 * 60 * 60 * 1000),
  );
  return daysSinceEpoch % totalCategories;
}

function getChallengeNumber(date: string, launchDate: string = '2026-04-12'): number {
  const launch = new Date(launchDate);
  const today = new Date(date);
  return (
    Math.floor(
      (today.getTime() - launch.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1
  );
}

function generateShareText(params: {
  challengeNumber: number;
  results: {isCorrect: boolean}[];
  timeSeconds: number;
  currentStreak: number;
  appUrl: string;
}): string {
  const {challengeNumber, results, timeSeconds, currentStreak, appUrl} = params;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const emojiResult = results
    .map((r) => (r.isCorrect ? '🟩' : '⬛'))
    .join('');

  return [
    `Today's Martie #${challengeNumber} 🐦`,
    '',
    `${emojiResult}  ${correctCount}/${results.length}`,
    `⏱ ${timeSeconds}s  🔥 ${currentStreak} days`,
    '',
    appUrl,
  ].join('\n');
}

function isSameDay(date1: string, date2: string): boolean {
  return date1.split('T')[0] === date2.split('T')[0];
}

describe('데일리 챌린지 로직', () => {
  describe('카테고리 로테이션 (getCategoryIndex)', () => {
    it('날짜마다 다른 카테고리를 선택한다', () => {
      const index1 = getCategoryIndex('2026-04-12', 20);
      const index2 = getCategoryIndex('2026-04-13', 20);
      expect(index1).not.toBe(index2);
    });

    it('20일 동안 모든 카테고리를 한 번씩 순환한다', () => {
      const indices = new Set<number>();
      for (let i = 0; i < 20; i++) {
        const date = new Date('2026-04-12');
        date.setDate(date.getDate() + i);
        indices.add(getCategoryIndex(date.toISOString().split('T')[0], 20));
      }
      expect(indices.size).toBe(20);
    });

    it('같은 날짜면 항상 같은 카테고리를 반환한다', () => {
      const index1 = getCategoryIndex('2026-04-12', 20);
      const index2 = getCategoryIndex('2026-04-12', 20);
      expect(index1).toBe(index2);
    });

    it('20일 후에 처음 카테고리로 돌아온다', () => {
      const index1 = getCategoryIndex('2026-04-12', 20);
      const date20Later = new Date('2026-04-12');
      date20Later.setDate(date20Later.getDate() + 20);
      const index2 = getCategoryIndex(
        date20Later.toISOString().split('T')[0],
        20,
      );
      expect(index1).toBe(index2);
    });

    it('인덱스가 0~19 범위 안에 있다', () => {
      for (let i = 0; i < 100; i++) {
        const date = new Date('2026-01-01');
        date.setDate(date.getDate() + i);
        const index = getCategoryIndex(
          date.toISOString().split('T')[0],
          20,
        );
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(20);
      }
    });
  });

  describe('챌린지 번호 (getChallengeNumber)', () => {
    it('출시일은 #1이다', () => {
      expect(getChallengeNumber('2026-04-12')).toBe(1);
    });

    it('출시 다음 날은 #2이다', () => {
      expect(getChallengeNumber('2026-04-13')).toBe(2);
    });

    it('출시 100일 후는 #100이다', () => {
      const date = new Date('2026-04-12');
      date.setDate(date.getDate() + 99);
      expect(
        getChallengeNumber(date.toISOString().split('T')[0]),
      ).toBe(100);
    });

    it('출시 전이면 0 이하를 반환한다', () => {
      expect(getChallengeNumber('2026-04-11')).toBeLessThanOrEqual(0);
    });
  });

  describe('공유 텍스트 생성 (generateShareText)', () => {
    it('정답/오답에 맞는 이모지 패턴을 생성한다', () => {
      const text = generateShareText({
        challengeNumber: 127,
        results: [
          {isCorrect: true},
          {isCorrect: true},
          {isCorrect: false},
          {isCorrect: true},
          {isCorrect: true},
        ],
        timeSeconds: 42,
        currentStreak: 23,
        appUrl: 'https://hyo.dev/martie',
      });

      expect(text).toContain('#127');
      expect(text).toContain('🟩🟩⬛🟩🟩');
      expect(text).toContain('4/5');
      expect(text).toContain('42s');
      expect(text).toContain('23 days');
      expect(text).toContain('https://hyo.dev/martie');
    });

    it('올클리어면 모두 녹색이다', () => {
      const text = generateShareText({
        challengeNumber: 1,
        results: Array(5).fill({isCorrect: true}),
        timeSeconds: 30,
        currentStreak: 1,
        appUrl: 'https://hyo.dev/martie',
      });

      expect(text).toContain('🟩🟩🟩🟩🟩');
      expect(text).toContain('5/5');
    });

    it('전부 틀리면 모두 검정이다', () => {
      const text = generateShareText({
        challengeNumber: 1,
        results: Array(5).fill({isCorrect: false}),
        timeSeconds: 60,
        currentStreak: 0,
        appUrl: 'https://hyo.dev/martie',
      });

      expect(text).toContain('⬛⬛⬛⬛⬛');
      expect(text).toContain('0/5');
    });
  });

  describe('같은 날 판별 (isSameDay)', () => {
    it('같은 날짜면 true를 반환한다', () => {
      expect(isSameDay('2026-04-12T10:00:00Z', '2026-04-12T23:59:59Z')).toBe(true);
    });

    it('다른 날짜면 false를 반환한다', () => {
      expect(isSameDay('2026-04-12T10:00:00Z', '2026-04-13T10:00:00Z')).toBe(false);
    });

    it('날짜만 있는 문자열도 처리한다', () => {
      expect(isSameDay('2026-04-12', '2026-04-12')).toBe(true);
    });
  });
});
