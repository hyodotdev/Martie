const BANNER_AD_SUPPORTED_PATHS = new Set(['/', '/articles', '/my']);

export function shouldShowBannerAd(
  pathname: string,
  isPremium: boolean,
  hasBlockingOverlay = false,
): boolean {
  return (
    !isPremium &&
    !hasBlockingOverlay &&
    BANNER_AD_SUPPORTED_PATHS.has(pathname)
  );
}
