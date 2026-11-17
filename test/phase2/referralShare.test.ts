/**
 * 리퍼럴 공유 메시지 테스트
 * - 공유 메시지에 코드 + 원클릭 초대 링크가 포함되는지 검증
 */
import {MARTIE_INVITE_URL_BASE} from '../../src/utils/constants';

// shareMessage 템플릿을 시뮬레이션 (i18n 템플릿 엔진과 동일 로직)
function formatShareMessage(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '');
}

// en.json의 shareMessage 템플릿
const EN_TEMPLATE =
  'Join me on Martie! Open this invite and we both get 5 bulbs after you sign up.\n\n{{inviteUrl}}\n\nCode: {{code}}';
const LEGACY_MARTIE_DOMAIN = ['martie', 'hyo', 'dev'].join('.');

const inviteUrl = `${MARTIE_INVITE_URL_BASE}/abc12345?source=referral`;

describe('리퍼럴 공유 메시지', () => {
  it('공유 메시지에 초대 코드가 포함된다', () => {
    const message = formatShareMessage(EN_TEMPLATE, {
      code: 'abc12345',
      inviteUrl,
    });
    expect(message).toContain('abc12345');
  });

  it('공유 메시지에 원클릭 초대 링크가 포함된다', () => {
    const message = formatShareMessage(EN_TEMPLATE, {
      code: 'abc12345',
      inviteUrl,
    });
    expect(message).toContain('/martie/invite/abc12345');
  });

  it('공유 메시지에 referral source가 포함된다', () => {
    const message = formatShareMessage(EN_TEMPLATE, {
      code: 'abc12345',
      inviteUrl,
    });
    expect(message).toContain('source=referral');
  });

  it('공유 메시지에 legacy Martie 도메인이 포함되지 않는다', () => {
    const message = formatShareMessage(EN_TEMPLATE, {
      code: 'abc12345',
      inviteUrl,
    });
    expect(message).not.toContain(LEGACY_MARTIE_DOMAIN);
  });

  it('MARTIE_INVITE_URL_BASE가 hyo.dev 초대 경로를 가리킨다', () => {
    expect(MARTIE_INVITE_URL_BASE).toBe('https://hyo.dev/martie/invite');
  });

  it('전체 공유 메시지 포맷이 올바르다', () => {
    const message = formatShareMessage(EN_TEMPLATE, {
      code: 'test1234',
      inviteUrl: 'https://hyo.dev/martie/invite/test1234?source=referral',
    });

    expect(message).toBe(
      'Join me on Martie! Open this invite and we both get 5 bulbs after you sign up.\n\n' +
        'https://hyo.dev/martie/invite/test1234?source=referral\n\n' +
        'Code: test1234',
    );
  });
});
