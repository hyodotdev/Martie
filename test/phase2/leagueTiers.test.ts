/**
 * 리그 티어 상수 테스트
 */
import {TIER_EMOJIS, TIER_COLORS} from '../../src/utils/leagueTiers';

describe('리그 티어 상수', () => {
  describe('TIER_EMOJIS', () => {
    it('5개 티어 모두 이모지가 정의되어 있다', () => {
      expect(Object.keys(TIER_EMOJIS)).toEqual([
        'bronze',
        'silver',
        'gold',
        'diamond',
        'master',
      ]);
    });

    it('각 티어에 올바른 이모지가 매핑되어 있다', () => {
      expect(TIER_EMOJIS.bronze).toBe('🥉');
      expect(TIER_EMOJIS.silver).toBe('🥈');
      expect(TIER_EMOJIS.gold).toBe('🥇');
      expect(TIER_EMOJIS.diamond).toBe('💎');
      expect(TIER_EMOJIS.master).toBe('👑');
    });
  });

  describe('TIER_COLORS', () => {
    it('5개 티어 모두 색상이 정의되어 있다', () => {
      expect(Object.keys(TIER_COLORS)).toEqual([
        'bronze',
        'silver',
        'gold',
        'diamond',
        'master',
      ]);
    });

    it('각 색상이 유효한 HEX 코드이다', () => {
      Object.values(TIER_COLORS).forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('TIER_EMOJIS와 TIER_COLORS의 키가 일치한다', () => {
      expect(Object.keys(TIER_EMOJIS).sort()).toEqual(
        Object.keys(TIER_COLORS).sort(),
      );
    });
  });
});
