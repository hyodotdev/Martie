/**
 * 스트릭 계산 로직 유닛 테스트
 */

function calculateNewStreak(params: {
  lastStreakDate: string | undefined;
  currentStreak: number;
  streakFreezeCount: number;
  today: string;
}): {newStreak: number; freezeUsed: boolean} {
  const {lastStreakDate, currentStreak, streakFreezeCount, today} = params;

  const todayDate = new Date(today);
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  if (lastStreakDate === today) {
    return {newStreak: currentStreak, freezeUsed: false};
  }

  if (lastStreakDate === yesterday) {
    return {newStreak: currentStreak + 1, freezeUsed: false};
  }

  if (lastStreakDate && lastStreakDate < yesterday) {
    if (streakFreezeCount > 0) {
      return {newStreak: currentStreak + 1, freezeUsed: true};
    }
    return {newStreak: 1, freezeUsed: false};
  }

  return {newStreak: 1, freezeUsed: false};
}

describe('스트릭 로직', () => {
  describe('calculateNewStreak', () => {
    it('처음 퀴즈를 풀면 스트릭 1로 시작한다', () => {
      const result = calculateNewStreak({
        lastStreakDate: undefined,
        currentStreak: 0,
        streakFreezeCount: 0,
        today: '2026-04-12',
      });

      expect(result.newStreak).toBe(1);
      expect(result.freezeUsed).toBe(false);
    });

    it('어제 풀었으면 스트릭이 1 증가한다', () => {
      const result = calculateNewStreak({
        lastStreakDate: '2026-04-11',
        currentStreak: 5,
        streakFreezeCount: 0,
        today: '2026-04-12',
      });

      expect(result.newStreak).toBe(6);
      expect(result.freezeUsed).toBe(false);
    });

    it('오늘 이미 풀었으면 스트릭이 변하지 않는다', () => {
      const result = calculateNewStreak({
        lastStreakDate: '2026-04-12',
        currentStreak: 5,
        streakFreezeCount: 0,
        today: '2026-04-12',
      });

      expect(result.newStreak).toBe(5);
      expect(result.freezeUsed).toBe(false);
    });

    it('하루 빠지고 프리즈가 없으면 스트릭이 1로 리셋된다', () => {
      const result = calculateNewStreak({
        lastStreakDate: '2026-04-10',
        currentStreak: 10,
        streakFreezeCount: 0,
        today: '2026-04-12',
      });

      expect(result.newStreak).toBe(1);
      expect(result.freezeUsed).toBe(false);
    });

    it('하루 빠졌지만 프리즈가 있으면 스트릭이 유지되고 프리즈를 소모한다', () => {
      const result = calculateNewStreak({
        lastStreakDate: '2026-04-10',
        currentStreak: 10,
        streakFreezeCount: 2,
        today: '2026-04-12',
      });

      expect(result.newStreak).toBe(11);
      expect(result.freezeUsed).toBe(true);
    });

    it('여러 날 빠지면 프리즈 없이 스트릭이 리셋된다', () => {
      const result = calculateNewStreak({
        lastStreakDate: '2026-04-05',
        currentStreak: 30,
        streakFreezeCount: 0,
        today: '2026-04-12',
      });

      expect(result.newStreak).toBe(1);
      expect(result.freezeUsed).toBe(false);
    });

    it('한번도 안 푼 유저가 처음 풀면 스트릭 1이다', () => {
      const result = calculateNewStreak({
        lastStreakDate: undefined,
        currentStreak: 0,
        streakFreezeCount: 3,
        today: '2026-04-12',
      });

      expect(result.newStreak).toBe(1);
      expect(result.freezeUsed).toBe(false);
    });
  });
});
