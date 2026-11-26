import {redirectSystemPath} from '../../app/+native-intent';

describe('redirectSystemPath', () => {
  it('hyo.dev Martie invite links route to the native invite screen', () => {
    expect(
      redirectSystemPath({
        initial: true,
        path: 'https://hyo.dev/martie/invite/abc12345?source=referral',
      }),
    ).toBe('/invite/abc12345');
  });

  it('localized Martie invite links keep the referral code', () => {
    expect(
      redirectSystemPath({
        initial: true,
        path: 'https://hyo.dev/ko/martie/invite/testcode?source=referral',
      }),
    ).toBe('/invite/testcode');
  });

  it('battle links open the battle room', () => {
    expect(
      redirectSystemPath({
        initial: true,
        path: 'https://hyo.dev/ja/martie/battle/abcd2345?source=battle',
      }),
    ).toBe('/battle/abcd2345');
  });

  it('emailed sign-in links keep their one-time code', () => {
    expect(
      redirectSystemPath({
        initial: true,
        path: 'https://hyo.dev/martie/sign-in-link?lang=ko&code=a_b-c',
      }),
    ).toBe('/sign-in-link?code=a_b-c');
  });

  it('a sign-in link without a code opens the app tabs', () => {
    expect(
      redirectSystemPath({
        initial: true,
        path: 'https://hyo.dev/martie/sign-in-link?lang=ko',
      }),
    ).toBe('/(tabs)');
  });

  it('generic Martie web landing links route to the app tabs', () => {
    expect(
      redirectSystemPath({
        initial: true,
        path: 'https://hyo.dev/martie?source=share_landing',
      }),
    ).toBe('/(tabs)');
  });

  it('non-Martie app paths are left untouched', () => {
    expect(
      redirectSystemPath({
        initial: false,
        path: '/daily-result?correctCount=5',
      }),
    ).toBe('/daily-result?correctCount=5');
  });
});
