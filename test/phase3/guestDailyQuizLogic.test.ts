/**
 * 비로그인 유저 데일리 퀴즈 1회 제한 로직 유닛 테스트
 */

type GuestDailyResult = {
  date: string;
  results: {
    quizId: string;
    isCorrect: boolean;
    selectedOptionIndex: number;
    timeSpentMs: number;
  }[];
};

// 게스트 데일리 완료 여부 판단 (TabIndexMobile에서 추출)
function isGuestDailyCompleted(
  isAuthenticated: boolean,
  storedJson: string | undefined,
  today: string,
): boolean {
  if (isAuthenticated) return false;
  if (!storedJson) return false;
  try {
    const parsed: GuestDailyResult = JSON.parse(storedJson);
    return parsed.date === today;
  } catch {
    return false;
  }
}

// 전체 완료 여부 (서버 + 로컬 통합)
function isDailyCompleted(
  serverCompleted: boolean,
  guestCompleted: boolean,
): boolean {
  return serverCompleted || guestCompleted;
}

// 게스트 결과 서버 동기화 가능 여부
function canSyncGuestResult(
  guestJson: string | undefined,
  today: string,
): boolean {
  if (!guestJson) return false;
  try {
    const parsed: GuestDailyResult = JSON.parse(guestJson);
    return parsed.date === today && Array.isArray(parsed.results);
  } catch {
    return false;
  }
}

describe('비로그인 유저 데일리 퀴즈 로직', () => {
  const today = '2026-04-17';
  const yesterday = '2026-04-16';

  const sampleResults = [
    {quizId: 'q1', isCorrect: true, selectedOptionIndex: 0, timeSpentMs: 5000},
    {quizId: 'q2', isCorrect: false, selectedOptionIndex: 1, timeSpentMs: 8000},
    {quizId: 'q3', isCorrect: true, selectedOptionIndex: 2, timeSpentMs: 3000},
    {quizId: 'q4', isCorrect: true, selectedOptionIndex: 0, timeSpentMs: 6000},
    {quizId: 'q5', isCorrect: false, selectedOptionIndex: 3, timeSpentMs: 9000},
  ];

  describe('isGuestDailyCompleted', () => {
    it('로그인 유저면 항상 false (서버에서 관리)', () => {
      const stored = JSON.stringify({date: today, results: sampleResults});
      expect(isGuestDailyCompleted(true, stored, today)).toBe(false);
    });

    it('저장된 결과가 없으면 false', () => {
      expect(isGuestDailyCompleted(false, undefined, today)).toBe(false);
    });

    it('오늘 날짜 결과가 있으면 true', () => {
      const stored = JSON.stringify({date: today, results: sampleResults});
      expect(isGuestDailyCompleted(false, stored, today)).toBe(true);
    });

    it('어제 날짜 결과는 false (날짜 불일치)', () => {
      const stored = JSON.stringify({
        date: yesterday,
        results: sampleResults,
      });
      expect(isGuestDailyCompleted(false, stored, today)).toBe(false);
    });

    it('잘못된 JSON이면 false (크래시 안 남)', () => {
      expect(isGuestDailyCompleted(false, '{invalid', today)).toBe(false);
    });

    it('빈 문자열이면 false', () => {
      expect(isGuestDailyCompleted(false, '', today)).toBe(false);
    });
  });

  describe('isDailyCompleted (서버 + 로컬 통합)', () => {
    it('서버 완료 = true → true', () => {
      expect(isDailyCompleted(true, false)).toBe(true);
    });

    it('게스트 완료 = true → true', () => {
      expect(isDailyCompleted(false, true)).toBe(true);
    });

    it('둘 다 false → false', () => {
      expect(isDailyCompleted(false, false)).toBe(false);
    });

    it('둘 다 true → true', () => {
      expect(isDailyCompleted(true, true)).toBe(true);
    });
  });

  describe('canSyncGuestResult (로그인 후 동기화 가능 여부)', () => {
    it('오늘 날짜 + 유효한 결과 → true', () => {
      const stored = JSON.stringify({date: today, results: sampleResults});
      expect(canSyncGuestResult(stored, today)).toBe(true);
    });

    it('어제 날짜 → false (만료)', () => {
      const stored = JSON.stringify({
        date: yesterday,
        results: sampleResults,
      });
      expect(canSyncGuestResult(stored, today)).toBe(false);
    });

    it('저장 없음 → false', () => {
      expect(canSyncGuestResult(undefined, today)).toBe(false);
    });

    it('잘못된 JSON → false', () => {
      expect(canSyncGuestResult('not-json', today)).toBe(false);
    });

    it('results가 배열이 아니면 → false', () => {
      const stored = JSON.stringify({date: today, results: 'invalid'});
      expect(canSyncGuestResult(stored, today)).toBe(false);
    });
  });
});
