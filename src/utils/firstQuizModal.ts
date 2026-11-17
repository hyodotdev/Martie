const FIRST_QUIZ_MODAL_HOME_PATHS = new Set(['/', '/index', '/(tabs)']);

export function canShowFirstQuizModalOnPath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  return FIRST_QUIZ_MODAL_HOME_PATHS.has(pathname);
}
