/**
 * 오답 복습 간격반복 로직 유닛 테스트
 */

const REVIEW_INTERVALS = [1, 3, 7]; // 일 단위

function calculateNextReview(params: {
  reviewStage: number;
  isCorrect: boolean;
  today: string;
}): {nextReviewAt: string; newStage: number; mastered: boolean} {
  const {reviewStage, isCorrect, today} = params;

  if (isCorrect) {
    const nextStage = reviewStage + 1;
    if (nextStage >= REVIEW_INTERVALS.length) {
      return {nextReviewAt: '', newStage: nextStage, mastered: true};
    }
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + REVIEW_INTERVALS[nextStage]);
    return {
      nextReviewAt: nextDate.toISOString().split('T')[0],
      newStage: nextStage,
      mastered: false,
    };
  }

  // 오답 → 리셋
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + REVIEW_INTERVALS[0]);
  return {
    nextReviewAt: tomorrow.toISOString().split('T')[0],
    newStage: 0,
    mastered: false,
  };
}

function shouldReview(nextReviewAt: string, today: string): boolean {
  return nextReviewAt <= today;
}

describe('오답 복습 로직', () => {
  describe('간격반복 스케줄 (calculateNextReview)', () => {
    it('스테이지 0에서 정답이면 3일 후로 이동한다', () => {
      const result = calculateNextReview({
        reviewStage: 0,
        isCorrect: true,
        today: '2026-04-12',
      });

      expect(result.newStage).toBe(1);
      expect(result.nextReviewAt).toBe('2026-04-15'); // +3일
      expect(result.mastered).toBe(false);
    });

    it('스테이지 1에서 정답이면 7일 후로 이동한다', () => {
      const result = calculateNextReview({
        reviewStage: 1,
        isCorrect: true,
        today: '2026-04-15',
      });

      expect(result.newStage).toBe(2);
      expect(result.nextReviewAt).toBe('2026-04-22'); // +7일
      expect(result.mastered).toBe(false);
    });

    it('스테이지 2에서 정답이면 마스터 완료된다', () => {
      const result = calculateNextReview({
        reviewStage: 2,
        isCorrect: true,
        today: '2026-04-22',
      });

      expect(result.newStage).toBe(3);
      expect(result.mastered).toBe(true);
    });

    it('어느 스테이지든 오답이면 스테이지 0으로 리셋된다', () => {
      const result1 = calculateNextReview({
        reviewStage: 2,
        isCorrect: false,
        today: '2026-04-22',
      });

      expect(result1.newStage).toBe(0);
      expect(result1.nextReviewAt).toBe('2026-04-23'); // +1일
      expect(result1.mastered).toBe(false);

      const result2 = calculateNextReview({
        reviewStage: 1,
        isCorrect: false,
        today: '2026-04-15',
      });

      expect(result2.newStage).toBe(0);
      expect(result2.nextReviewAt).toBe('2026-04-16');
    });

    it('스테이지 0에서 오답이면 1일 후로 다시 스케줄된다', () => {
      const result = calculateNextReview({
        reviewStage: 0,
        isCorrect: false,
        today: '2026-04-12',
      });

      expect(result.newStage).toBe(0);
      expect(result.nextReviewAt).toBe('2026-04-13');
    });
  });

  describe('복습 대기 판별 (shouldReview)', () => {
    it('복습일이 오늘이면 복습해야 한다', () => {
      expect(shouldReview('2026-04-12', '2026-04-12')).toBe(true);
    });

    it('복습일이 과거면 복습해야 한다', () => {
      expect(shouldReview('2026-04-10', '2026-04-12')).toBe(true);
    });

    it('복습일이 미래면 복습하지 않는다', () => {
      expect(shouldReview('2026-04-15', '2026-04-12')).toBe(false);
    });
  });

  describe('전체 학습 사이클', () => {
    it('정답만 계속 맞추면 1일→3일→7일 후 마스터된다', () => {
      let stage = 0;
      let today = '2026-04-12';

      // 1일 후 복습 → 정답
      const r1 = calculateNextReview({reviewStage: stage, isCorrect: true, today});
      expect(r1.newStage).toBe(1);
      stage = r1.newStage;
      today = r1.nextReviewAt; // 2026-04-15

      // 3일 후 복습 → 정답
      const r2 = calculateNextReview({reviewStage: stage, isCorrect: true, today});
      expect(r2.newStage).toBe(2);
      stage = r2.newStage;
      today = r2.nextReviewAt; // 2026-04-22

      // 7일 후 복습 → 정답 → 마스터
      const r3 = calculateNextReview({reviewStage: stage, isCorrect: true, today});
      expect(r3.mastered).toBe(true);
    });

    it('중간에 틀리면 처음부터 다시 시작한다', () => {
      // 스테이지 1에서 오답
      const r1 = calculateNextReview({
        reviewStage: 1,
        isCorrect: false,
        today: '2026-04-15',
      });
      expect(r1.newStage).toBe(0);

      // 다시 1일 후부터
      const r2 = calculateNextReview({
        reviewStage: 0,
        isCorrect: true,
        today: r1.nextReviewAt,
      });
      expect(r2.newStage).toBe(1);
    });
  });
});
