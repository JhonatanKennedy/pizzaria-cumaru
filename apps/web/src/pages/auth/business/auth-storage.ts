import { isUserRole, type UserRole } from './role';

export interface StoredUser {
  id: number;
  login: string;
  role: UserRole;
}

const USER_KEY = 'pizzaria-cumaru.user';
const DEV_KEY = 'pizzaria-cumaru.dev-session';

function isStoredUser(value: unknown): value is StoredUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.login === 'string' &&
    isUserRole(candidate.role)
  );
}

// Only the user blob is stored. The access token lives in memory for the life
// of the tab, so a reload finds no credential here and has to ask the refresh
// cookie for a new one — which is also what makes the blob, on its own, not a
// session.
export function readStoredUser(): StoredUser | null {
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }
  try {
    const user: unknown = JSON.parse(rawUser);
    return isStoredUser(user) ? user : null;
  } catch {
    return null;
  }
}

export function writeStoredUser(user: StoredUser): void {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  // A real login is not a dev session: the marker must not survive it, or a
  // later reload would skip the refresh this session now depends on.
  clearDevSession();
}

// A dev session has no cookie behind it, so a boot refresh would fail and sign
// the dev user straight back out. This marker is what lets boot skip it — set
// after the blob, because storing a user is what clears it for a real login.
export function writeDevSession(user: StoredUser): void {
  writeStoredUser(user);
  window.localStorage.setItem(DEV_KEY, 'true');
}

export function isDevSession(): boolean {
  return window.localStorage.getItem(DEV_KEY) === 'true';
}

function clearDevSession(): void {
  window.localStorage.removeItem(DEV_KEY);
}

export function clearSession(): void {
  window.localStorage.removeItem(USER_KEY);
  clearDevSession();
}
