import {fixedOtpCodeFor} from '../../convex/utils/fixedOtp';

describe('fixedOtpCodeFor', () => {
  it('uses only the review code in production', () => {
    expect(
      fixedOtpCodeFor({isProduction: true, reviewCode: '111', devCode: '222'}),
    ).toBe('111');
    expect(
      fixedOtpCodeFor({isProduction: true, reviewCode: null, devCode: '222'}),
    ).toBeNull();
  });

  it('prefers the dev code outside production', () => {
    expect(
      fixedOtpCodeFor({isProduction: false, reviewCode: '111', devCode: '222'}),
    ).toBe('222');
    expect(
      fixedOtpCodeFor({isProduction: false, reviewCode: '111', devCode: null}),
    ).toBe('111');
  });

  it('treats blank codes as unset', () => {
    expect(
      fixedOtpCodeFor({isProduction: false, reviewCode: ' ', devCode: null}),
    ).toBeNull();
  });
});
