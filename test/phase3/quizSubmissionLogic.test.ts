/**
 * 퀴즈 제출(UGC) 로직 유닛 테스트
 */
import {isAdminEmail} from '../../convex/utils/emailList';

const ADMIN_EMAILS_ENV = ' admin@example.com, Owner@Example.com ,';

type SubmissionOption = {
  text: string;
  isAnswer: boolean;
};

// submitQuiz validation 로직 (convex/quizSubmission/mutations.ts에서 추출)
function validateSubmission(params: {
  options: SubmissionOption[];
  question: string;
}): {valid: boolean; error?: string} {
  if (params.options.length !== 4) {
    return {valid: false, error: 'Exactly 4 options required'};
  }

  const answerCount = params.options.filter((o) => o.isAnswer).length;
  if (answerCount !== 1) {
    return {valid: false, error: 'Exactly 1 correct answer required'};
  }

  if (params.question.trim().length < 5) {
    return {valid: false, error: 'Question must be at least 5 characters'};
  }

  for (const opt of params.options) {
    if (opt.text.trim().length === 0) {
      return {valid: false, error: 'All options must have text'};
    }
  }

  return {valid: true};
}

// 관리자 권한 검증 로직
function isAdmin(email: string | undefined): boolean {
  return isAdminEmail(email, ADMIN_EMAILS_ENV);
}

// 승인 시 퀴즈 키 생성 로직 (convex/quizSubmission/mutations.ts에서 추출)
function generateQuizKey(submissionId: string, approveDate: Date): string {
  const today = approveDate.toISOString().split('T')[0].replace(/-/g, '');
  const shortId = submissionId.slice(-6);
  return `${today}_ugc_${shortId}_key`;
}

// 승인 시 옵션 키 생성
function generateOptionKeys(quizKey: string, optionCount: number): string[] {
  return Array.from(
    {length: optionCount},
    (_, i) => `${quizKey.replace('_key', '')}_opt${i + 1}`,
  );
}

describe('퀴즈 제출(UGC) 로직', () => {
  describe('validateSubmission (제출 검증)', () => {
    const validOptions: SubmissionOption[] = [
      {text: 'Option A', isAnswer: false},
      {text: 'Option B', isAnswer: true},
      {text: 'Option C', isAnswer: false},
      {text: 'Option D', isAnswer: false},
    ];

    it('정상 제출은 valid', () => {
      expect(
        validateSubmission({
          options: validOptions,
          question: '세계에서 가장 큰 대양은?',
        }),
      ).toEqual({valid: true});
    });

    it('옵션이 4개가 아니면 invalid', () => {
      const result = validateSubmission({
        options: validOptions.slice(0, 3),
        question: '질문입니다',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 options');
    });

    it('정답이 0개면 invalid', () => {
      const noAnswer = validOptions.map((o) => ({...o, isAnswer: false}));
      const result = validateSubmission({
        options: noAnswer,
        question: '질문입니다',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1 correct answer');
    });

    it('정답이 2개면 invalid', () => {
      const twoAnswers = validOptions.map((o, i) => ({
        ...o,
        isAnswer: i < 2,
      }));
      const result = validateSubmission({
        options: twoAnswers,
        question: '질문입니다',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1 correct answer');
    });

    it('질문이 5글자 미만이면 invalid', () => {
      const result = validateSubmission({
        options: validOptions,
        question: '짧음',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5 characters');
    });

    it('질문이 공백만이면 invalid', () => {
      const result = validateSubmission({
        options: validOptions,
        question: '     ',
      });
      expect(result.valid).toBe(false);
    });

    it('빈 옵션 텍스트가 있으면 invalid', () => {
      const emptyOption = [
        {text: 'A', isAnswer: false},
        {text: '', isAnswer: true},
        {text: 'C', isAnswer: false},
        {text: 'D', isAnswer: false},
      ];
      const result = validateSubmission({
        options: emptyOption,
        question: '질문입니다',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('text');
    });
  });

  describe('isAdmin (관리자 검증)', () => {
    it('관리자 이메일이면 true', () => {
      expect(isAdmin('admin@example.com')).toBe(true);
      expect(isAdmin('owner@example.com')).toBe(true);
    });

    it('ADMIN_EMAILS가 비어 있으면 아무도 관리자가 아님', () => {
      expect(isAdminEmail('admin@example.com', undefined)).toBe(false);
      expect(isAdminEmail('admin@example.com', '')).toBe(false);
    });

    it('일반 이메일이면 false', () => {
      expect(isAdmin('random@example.com')).toBe(false);
    });

    it('undefined면 false', () => {
      expect(isAdmin(undefined)).toBe(false);
    });

    it('빈 문자열이면 false', () => {
      expect(isAdmin('')).toBe(false);
    });
  });

  describe('generateQuizKey (승인 시 키 생성)', () => {
    it('날짜 기반 키를 생성한다', () => {
      const key = generateQuizKey(
        'submission_abc12345',
        new Date('2026-07-15'),
      );
      expect(key).toBe('20260715_ugc_c12345_key');
    });

    it('시드 퀴즈와 정렬 순서가 맞다 (날짜 기반)', () => {
      const seedKey = '20260715_0001_key';
      const ugcKey = generateQuizKey(
        'submission_xyz789',
        new Date('2026-07-15'),
      );
      // ugc가 seed보다 뒤에 정렬 (같은 날짜 내에서)
      expect(ugcKey > seedKey).toBe(true);
    });

    it('과거 날짜 승인은 과거 위치에 삽입된다', () => {
      const oldKey = generateQuizKey(
        'submission_abc123',
        new Date('2026-04-10'),
      );
      const newKey = generateQuizKey(
        'submission_abc123',
        new Date('2026-07-15'),
      );
      expect(newKey > oldKey).toBe(true);
    });
  });

  describe('generateOptionKeys (옵션 키 생성)', () => {
    it('4개 옵션 키를 생성한다', () => {
      const keys = generateOptionKeys('20260715_ugc_abc123_key', 4);
      expect(keys).toHaveLength(4);
      expect(keys[0]).toBe('20260715_ugc_abc123_opt1');
      expect(keys[3]).toBe('20260715_ugc_abc123_opt4');
    });
  });
});
