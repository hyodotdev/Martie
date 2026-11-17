type RedirectSystemPathParams = {
  initial: boolean;
  path: string;
};

const MARTIE_WEB_PATH_PATTERN = /^\/(?:en\/|ko\/|ja\/)?martie(?:\/|$)/;
const MARTIE_INVITE_PATH_PATTERN =
  /^\/(?:en\/|ko\/|ja\/)?martie\/invite\/([^/?#]+)/;

function normalizePath(path: string): string {
  if (path.includes('://')) {
    const url = new URL(path);
    return url.pathname || '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export function redirectSystemPath({
  path,
}: RedirectSystemPathParams): string {
  try {
    const pathname = normalizePath(path);
    const inviteMatch = pathname.match(MARTIE_INVITE_PATH_PATTERN);
    if (inviteMatch?.[1]) {
      return `/invite/${inviteMatch[1]}`;
    }
    if (MARTIE_WEB_PATH_PATTERN.test(pathname)) {
      return '/(tabs)';
    }
  } catch {
    if (MARTIE_WEB_PATH_PATTERN.test(path)) return '/(tabs)';
  }

  return path;
}
