import {MARTIE_SHARE_URL} from './constants';

export const MARTIE_BATTLE_URL_BASE = `${MARTIE_SHARE_URL}/battle`;

export function battleShareUrl(code: string): string {
  return `${MARTIE_BATTLE_URL_BASE}/${code}?source=battle`;
}

/**
 * Server clock minus device clock, assuming the reply took as long to come
 * back as the request took to arrive.
 */
export function estimateClockOffset(
  sentAt: number,
  receivedAt: number,
  serverNow: number,
): number {
  return serverNow - (sentAt + receivedAt) / 2;
}

export function remainingMs(
  phaseEndsAt: number | null,
  deviceNow: number,
  offsetMs: number,
): number {
  if (phaseEndsAt === null) return 0;
  return Math.max(0, phaseEndsAt - (deviceNow + offsetMs));
}

export function isSeenRecently(
  seenAt: number | undefined,
  deviceNow: number,
  offsetMs: number,
  staleMs: number,
): boolean {
  return seenAt !== undefined && deviceNow + offsetMs - seenAt <= staleMs;
}

// A battle link opened while signed out resumes after sign-in, but only if
// that sign-in follows soon; an abandoned one must not redirect a later login.
export const PENDING_BATTLE_TTL_MS = 15 * 60 * 1000;

export function encodePendingBattle(code: string, now: number): string {
  return JSON.stringify({code, savedAt: now});
}

export function decodePendingBattle(
  raw: string | undefined,
  now: number,
): string | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'code' in parsed &&
      'savedAt' in parsed &&
      typeof parsed.code === 'string' &&
      typeof parsed.savedAt === 'number' &&
      now - parsed.savedAt >= 0 &&
      now - parsed.savedAt <= PENDING_BATTLE_TTL_MS
    ) {
      return parsed.code;
    }
  } catch {}
  return null;
}
