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
