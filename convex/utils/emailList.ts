export function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Admins are configured per deployment with the comma-separated
 * `ADMIN_EMAILS` Convex environment variable. Unset means no admins.
 */
export function isAdminEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (!email) return false;
  return parseEmailList(raw).includes(email.trim().toLowerCase());
}
