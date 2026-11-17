/**
 * 리그 시스템 로직 유닛 테스트
 */

const LEAGUE_TIERS = ['bronze', 'silver', 'gold', 'diamond', 'master'] as const;
const PROMOTE_COUNT = 5;
const DEMOTE_COUNT = 5;

function getWeekStart(date: Date = new Date()): string {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

function generateBotXp(groupId: string, botIndex: number): number {
  let hash = 0;
  const seed = `${groupId}_bot_${botIndex}_xp`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const raw = Math.abs(hash) % 1000;
  if (raw < 300) return Math.abs(hash >> 3) % 20;
  if (raw < 700) return 20 + (Math.abs(hash >> 5) % 60);
  if (raw < 900) return 80 + (Math.abs(hash >> 7) % 50);
  return 130 + (Math.abs(hash >> 9) % 70);
}

function calculateDailyXp(correctCount: number, totalQuestions: number): number {
  return correctCount * 10 + (correctCount === totalQuestions ? 20 : 0);
}

function calculateQuizXp(isCorrect: boolean): number {
  return isCorrect ? 5 : 0;
}

function getPromotionStatus(
  rank: number,
  totalMembers: number,
  tier: string,
): 'promote' | 'demote' | 'stay' {
  const tierIndex = LEAGUE_TIERS.indexOf(tier as (typeof LEAGUE_TIERS)[number]);
  if (rank <= PROMOTE_COUNT && tierIndex < LEAGUE_TIERS.length - 1) return 'promote';
  if (rank > totalMembers - DEMOTE_COUNT && tierIndex > 0 && totalMembers > DEMOTE_COUNT) return 'demote';
  return 'stay';
}

describe('리그 로직', () => {
  describe('주 시작일 계산 (getWeekStart)', () => {
    it('수요일이면 해당 주 월요일을 반환한다', () => {
      const result = getWeekStart(new Date('2026-04-15T12:00:00Z'));
      expect(result).toBe('2026-04-13');
    });

    it('월요일이면 당일을 반환한다', () => {
      const result = getWeekStart(new Date('2026-04-13T12:00:00Z'));
      expect(result).toBe('2026-04-13');
    });

    it('일요일이면 지난 월요일을 반환한다', () => {
      const result = getWeekStart(new Date('2026-04-19T12:00:00Z'));
      expect(result).toBe('2026-04-13');
    });

    it('토요일이면 지난 월요일을 반환한다', () => {
      const result = getWeekStart(new Date('2026-04-18T12:00:00Z'));
      expect(result).toBe('2026-04-13');
    });
  });

  describe('봇 XP 생성 (generateBotXp)', () => {
    it('같은 입력이면 항상 같은 XP를 반환한다 (결정론적)', () => {
      const xp1 = generateBotXp('bronze_2026-04-13_0', 5);
      const xp2 = generateBotXp('bronze_2026-04-13_0', 5);
      expect(xp1).toBe(xp2);
    });

    it('30명의 봇이 다양한 XP 값을 가진다', () => {
      const xps = Array.from({length: 30}, (_, i) =>
        generateBotXp('bronze_2026-04-13_0', i),
      );
      const uniqueXps = new Set(xps);
      expect(uniqueXps.size).toBeGreaterThanOrEqual(5);
    });

    it('XP가 0~199 범위 안에 있다', () => {
      for (let i = 0; i < 100; i++) {
        const xp = generateBotXp(`group_${i}`, i);
        expect(xp).toBeGreaterThanOrEqual(0);
        expect(xp).toBeLessThan(200);
      }
    });

    it('다른 그룹이면 다른 XP를 생성한다', () => {
      const different = Array.from({length: 10}, (_, i) => {
        const a = generateBotXp(`group_a_${i}`, 0);
        const b = generateBotXp(`group_b_${i}`, 0);
        return a !== b;
      });
      expect(different.filter(Boolean).length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('데일리 XP 계산 (calculateDailyXp)', () => {
    it('정답 1개당 10 XP를 준다', () => {
      expect(calculateDailyXp(3, 5)).toBe(30);
    });

    it('올클리어(5/5)하면 보너스 20 XP를 추가로 준다', () => {
      expect(calculateDailyXp(5, 5)).toBe(70);
    });

    it('전부 틀리면 0 XP다', () => {
      expect(calculateDailyXp(0, 5)).toBe(0);
    });

    it('4/5는 올클리어 보너스가 없다', () => {
      expect(calculateDailyXp(4, 5)).toBe(40);
    });
  });

  describe('일반 퀴즈 XP 계산 (calculateQuizXp)', () => {
    it('정답이면 5 XP를 준다', () => {
      expect(calculateQuizXp(true)).toBe(5);
    });

    it('오답이면 0 XP다', () => {
      expect(calculateQuizXp(false)).toBe(0);
    });
  });

  describe('승격/강등 판정 (getPromotionStatus)', () => {
    it('상위 5위 이내면 승격한다', () => {
      expect(getPromotionStatus(1, 30, 'bronze')).toBe('promote');
      expect(getPromotionStatus(5, 30, 'bronze')).toBe('promote');
    });

    it('마스터 리그에서는 승격하지 않는다', () => {
      expect(getPromotionStatus(1, 30, 'master')).toBe('stay');
    });

    it('하위 5위 이내면 강등한다', () => {
      expect(getPromotionStatus(26, 30, 'silver')).toBe('demote');
      expect(getPromotionStatus(30, 30, 'silver')).toBe('demote');
    });

    it('브론즈 리그에서는 강등하지 않는다', () => {
      expect(getPromotionStatus(30, 30, 'bronze')).toBe('stay');
    });

    it('중간 순위면 유지한다', () => {
      expect(getPromotionStatus(10, 30, 'gold')).toBe('stay');
      expect(getPromotionStatus(15, 30, 'gold')).toBe('stay');
    });

    it('5명 이하 그룹에서 상위 5위면 승격한다', () => {
      expect(getPromotionStatus(5, 5, 'silver')).toBe('promote');
      expect(getPromotionStatus(3, 3, 'silver')).toBe('promote');
    });
  });
});
