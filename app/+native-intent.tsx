type RedirectSystemPathParams = {
  initial: boolean;
  path: string;
};

const MARTIE_WEB_PATH_PATTERN = /^\/(?:en\/|ko\/|ja\/)?martie(?:\/|$)/;
const MARTIE_INVITE_PATH_PATTERN =
  /^\/(?:en\/|ko\/|ja\/)?martie\/invite\/([^/?#]+)/;
const MARTIE_BATTLE_PATH_PATTERN =
  /^\/(?:en\/|ko\/|ja\/)?martie\/battle\/([^/?#]+)/;
const MARTIE_SIGN_IN_LINK_PATH_PATTERN =
  /^\/(?:en\/|ko\/|ja\/)?martie\/sign-in-link\/?$/;

// The emailed sign-in link carries its one-time code as `?code=`.
function signInLinkCode(path: string): string | null {
  const url = new URL(path.includes('://') ? path : `https://hyo.dev${path}`);
  if (!MARTIE_SIGN_IN_LINK_PATH_PATTERN.test(url.pathname)) return null;
  return url.searchParams.get('code');
}

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
    const linkCode = signInLinkCode(path);
    if (linkCode) {
      return `/sign-in-link?code=${encodeURIComponent(linkCode)}`;
    }
    const pathname = normalizePath(path);
    const inviteMatch = pathname.match(MARTIE_INVITE_PATH_PATTERN);
    if (inviteMatch?.[1]) {
      return `/invite/${inviteMatch[1]}`;
    }
    const battleMatch = pathname.match(MARTIE_BATTLE_PATH_PATTERN);
    if (battleMatch?.[1]) {
      return `/battle/${battleMatch[1]}`;
    }
    if (MARTIE_WEB_PATH_PATTERN.test(pathname)) {
      return '/(tabs)';
    }
  } catch {
    if (MARTIE_WEB_PATH_PATTERN.test(path)) return '/(tabs)';
  }

  return path;
}
