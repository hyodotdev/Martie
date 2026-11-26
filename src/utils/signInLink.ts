import {storage, Storage} from './storage';

export type PendingSignInLink = {email: string; browserSecret: string};

export function savePendingSignInLink(pending: PendingSignInLink): void {
  storage.set(Storage.PendingSignInLink, JSON.stringify(pending));
}

export function readPendingSignInLink(): PendingSignInLink | null {
  const raw = storage.getString(Storage.PendingSignInLink);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'email' in parsed &&
      'browserSecret' in parsed &&
      typeof parsed.email === 'string' &&
      typeof parsed.browserSecret === 'string'
    ) {
      return {email: parsed.email, browserSecret: parsed.browserSecret};
    }
  } catch {}
  return null;
}

export function clearPendingSignInLink(): void {
  storage.delete(Storage.PendingSignInLink);
}
