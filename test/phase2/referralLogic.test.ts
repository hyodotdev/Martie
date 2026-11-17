/**
 * 리퍼럴 시스템 로직 유닛 테스트
 */

const REFERRAL_REWARD_BULBS = 5;

// generateCode: convex/referral/mutations.ts에서 추출한 순수 함수
function generateCode(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8).padEnd(8, '0');
}

// applyReferral 보상 로직 (순수 함수로 추출)
function calculateReferralReward(
  profileBulbs: number | undefined,
  referrerBulbs: number | undefined,
  referrerCount: number | undefined,
) {
  return {
    profileBulbs: (profileBulbs ?? 0) + REFERRAL_REWARD_BULBS,
    referrerBulbs: (referrerBulbs ?? 0) + REFERRAL_REWARD_BULBS,
    referrerCount: (referrerCount ?? 0) + 1,
  };
}

// applyReferral 검증 로직 (순수 함수로 추출)
function validateReferral(params: {
  userId: string | null;
  profile: {referredBy?: string} | null;
  referrer: {userId: string} | null;
  referralCode: string;
}): {valid: boolean; error?: string} {
  if (!params.userId) return {valid: false, error: 'not_authenticated'};
  if (!params.profile) return {valid: false, error: 'no_profile'};
  if (params.profile.referredBy) return {valid: false, error: 'already_referred'};
  if (!params.referrer) return {valid: false, error: 'invalid_code'};
  if (params.referrer.userId === params.userId)
    return {valid: false, error: 'self_referral'};
  return {valid: true};
}

describe('리퍼럴 로직', () => {
  describe('코드 생성 (generateCode)', () => {
    it('같은 입력이면 항상 같은 코드를 반환한다 (결정론적)', () => {
      const code1 = generateCode('user_abc123');
      const code2 = generateCode('user_abc123');
      expect(code1).toBe(code2);
    });

    it('다른 입력이면 다른 코드를 생성한다', () => {
      const code1 = generateCode('user_abc');
      const code2 = generateCode('user_xyz');
      expect(code1).not.toBe(code2);
    });

    it('코드 길이가 8자리이다', () => {
      const code = generateCode('test_user_id');
      expect(code.length).toBe(8);
    });

    it('코드가 base36 문자(영숫자)로만 구성된다', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateCode(`user_${i}_${Math.random()}`);
        expect(code).toMatch(/^[0-9a-z]{8}$/);
      }
    });

    it('빈 문자열 입력도 유효한 코드를 반환한다', () => {
      const code = generateCode('');
      expect(code.length).toBe(8);
      expect(code).toMatch(/^[0-9a-z]{8}$/);
    });

    it('100개 유저에 대해 높은 고유성을 가진다', () => {
      const codes = Array.from({length: 100}, (_, i) =>
        generateCode(`user_id_${i}`),
      );
      const uniqueCodes = new Set(codes);
      // 100개 중 최소 90%는 고유해야 한다
      expect(uniqueCodes.size).toBeGreaterThanOrEqual(90);
    });
  });

  describe('리퍼럴 검증 (validateReferral)', () => {
    it('미인증 유저는 실패한다', () => {
      const result = validateReferral({
        userId: null,
        profile: null,
        referrer: null,
        referralCode: 'abc12345',
      });
      expect(result).toEqual({valid: false, error: 'not_authenticated'});
    });

    it('프로필이 없으면 실패한다', () => {
      const result = validateReferral({
        userId: 'user1',
        profile: null,
        referrer: null,
        referralCode: 'abc12345',
      });
      expect(result).toEqual({valid: false, error: 'no_profile'});
    });

    it('이미 리퍼럴을 사용한 유저는 실패한다', () => {
      const result = validateReferral({
        userId: 'user1',
        profile: {referredBy: 'user0'},
        referrer: {userId: 'user2'},
        referralCode: 'abc12345',
      });
      expect(result).toEqual({valid: false, error: 'already_referred'});
    });

    it('유효하지 않은 리퍼럴 코드는 실패한다', () => {
      const result = validateReferral({
        userId: 'user1',
        profile: {},
        referrer: null,
        referralCode: 'invalid0',
      });
      expect(result).toEqual({valid: false, error: 'invalid_code'});
    });

    it('자기 자신의 코드는 사용할 수 없다', () => {
      const result = validateReferral({
        userId: 'user1',
        profile: {},
        referrer: {userId: 'user1'},
        referralCode: 'abc12345',
      });
      expect(result).toEqual({valid: false, error: 'self_referral'});
    });

    it('모든 조건 통과 시 성공한다', () => {
      const result = validateReferral({
        userId: 'user1',
        profile: {},
        referrer: {userId: 'user2'},
        referralCode: 'abc12345',
      });
      expect(result).toEqual({valid: true});
    });
  });

  describe('보상 계산 (calculateReferralReward)', () => {
    it('양쪽 유저에게 5 bulbs를 지급한다', () => {
      const result = calculateReferralReward(10, 20, 3);
      expect(result.profileBulbs).toBe(15);
      expect(result.referrerBulbs).toBe(25);
      expect(result.referrerCount).toBe(4);
    });

    it('bulbCount가 undefined(신규 유저)이면 0에서 시작한다', () => {
      const result = calculateReferralReward(undefined, undefined, undefined);
      expect(result.profileBulbs).toBe(5);
      expect(result.referrerBulbs).toBe(5);
      expect(result.referrerCount).toBe(1);
    });

    it('bulbCount가 0이어도 정상 동작한다', () => {
      const result = calculateReferralReward(0, 0, 0);
      expect(result.profileBulbs).toBe(5);
      expect(result.referrerBulbs).toBe(5);
      expect(result.referrerCount).toBe(1);
    });

    it('여러 번 리퍼럴을 받은 유저의 카운트가 누적된다', () => {
      const result = calculateReferralReward(100, 200, 49);
      expect(result.referrerCount).toBe(50);
    });
  });
});
