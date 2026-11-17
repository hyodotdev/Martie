import {shouldShowBannerAd} from '../../../src/utils/bannerAds';

describe('shouldShowBannerAd', () => {
  it.each(['/', '/articles', '/my'])(
    'shows ads for non-premium users on %s',
    (pathname) => {
      expect(shouldShowBannerAd(pathname, false)).toBe(true);
    },
  );

  it('does not show ads to premium users', () => {
    expect(shouldShowBannerAd('/', true)).toBe(false);
  });

  it('does not let a banner intercept a blocking overlay', () => {
    expect(shouldShowBannerAd('/', false, true)).toBe(false);
  });

  it.each(['/daily-quiz', '/quiz', '/purchase', '/hall-of-fame'])(
    'keeps ads off focused screens such as %s',
    (pathname) => {
      expect(shouldShowBannerAd(pathname, false)).toBe(false);
    },
  );
});
