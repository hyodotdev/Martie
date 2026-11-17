/**
 * Feather(깃털) 보상 로직 유닛 테스트
 */

// awardFeather 판단 로직 (convex/feather/helpers.ts에서 추출)
function shouldAwardFeather(params: {
  quizCreatorUserId: string | undefined;
  solverId: string;
}): boolean {
  if (!params.quizCreatorUserId) return false;
  if (params.quizCreatorUserId === params.solverId) return false;
  return true;
}

// featherCount 증분 계산
function calculateNewFeatherCount(
  currentCount: number | undefined,
  increment: number,
): number {
  return (currentCount ?? 0) + increment;
}

// 데일리 퀴즈 Feather 적립 계산 (정답 수만큼)
function calculateDailyFeathers(
  results: {isCorrect: boolean; quizCreatorUserId?: string}[],
  solverId: string,
): number {
  return results.filter(
    (r) =>
      r.isCorrect &&
      r.quizCreatorUserId &&
      r.quizCreatorUserId !== solverId,
  ).length;
}

describe('Feather 보상 로직', () => {
  describe('shouldAwardFeather', () => {
    it('출제자가 있고 본인이 아니면 true', () => {
      expect(
        shouldAwardFeather({
          quizCreatorUserId: 'creator_001',
          solverId: 'solver_002',
        }),
      ).toBe(true);
    });

    it('출제자가 없으면 (시스템 퀴즈) false', () => {
      expect(
        shouldAwardFeather({
          quizCreatorUserId: undefined,
          solverId: 'solver_001',
        }),
      ).toBe(false);
    });

    it('본인이 자기 퀴즈를 풀면 false (self-award 방지)', () => {
      expect(
        shouldAwardFeather({
          quizCreatorUserId: 'user_001',
          solverId: 'user_001',
        }),
      ).toBe(false);
    });
  });

  describe('calculateNewFeatherCount', () => {
    it('기존 feather가 없으면 (undefined) 0에서 시작', () => {
      expect(calculateNewFeatherCount(undefined, 1)).toBe(1);
    });

    it('기존 feather에 정상 합산', () => {
      expect(calculateNewFeatherCount(10, 1)).toBe(11);
    });

    it('0에서 시작해도 정상 동작', () => {
      expect(calculateNewFeatherCount(0, 5)).toBe(5);
    });
  });

  describe('calculateDailyFeathers (데일리 퀴즈 Feather 합산)', () => {
    const solverId = 'solver_001';

    it('5문제 중 3문제 정답 + 출제자 있으면 3 Feather', () => {
      const results = [
        {isCorrect: true, quizCreatorUserId: 'creator_a'},
        {isCorrect: false, quizCreatorUserId: 'creator_b'},
        {isCorrect: true, quizCreatorUserId: 'creator_c'},
        {isCorrect: true, quizCreatorUserId: 'creator_d'},
        {isCorrect: false, quizCreatorUserId: 'creator_e'},
      ];
      expect(calculateDailyFeathers(results, solverId)).toBe(3);
    });

    it('시스템 퀴즈 (출제자 없음)는 Feather 0', () => {
      const results = [
        {isCorrect: true, quizCreatorUserId: undefined},
        {isCorrect: true, quizCreatorUserId: undefined},
        {isCorrect: true, quizCreatorUserId: undefined},
      ];
      expect(calculateDailyFeathers(results, solverId)).toBe(0);
    });

    it('본인 퀴즈를 풀어도 Feather 0', () => {
      const results = [
        {isCorrect: true, quizCreatorUserId: solverId},
        {isCorrect: true, quizCreatorUserId: solverId},
      ];
      expect(calculateDailyFeathers(results, solverId)).toBe(0);
    });

    it('혼합: 시스템 + UGC + 본인 퀴즈', () => {
      const results = [
        {isCorrect: true, quizCreatorUserId: undefined}, // 시스템 → 0
        {isCorrect: true, quizCreatorUserId: 'creator_a'}, // UGC 정답 → +1
        {isCorrect: false, quizCreatorUserId: 'creator_b'}, // UGC 오답 → 0
        {isCorrect: true, quizCreatorUserId: solverId}, // 본인 → 0
        {isCorrect: true, quizCreatorUserId: 'creator_c'}, // UGC 정답 → +1
      ];
      expect(calculateDailyFeathers(results, solverId)).toBe(2);
    });

    it('전부 오답이면 Feather 0', () => {
      const results = [
        {isCorrect: false, quizCreatorUserId: 'creator_a'},
        {isCorrect: false, quizCreatorUserId: 'creator_b'},
      ];
      expect(calculateDailyFeathers(results, solverId)).toBe(0);
    });
  });
});
