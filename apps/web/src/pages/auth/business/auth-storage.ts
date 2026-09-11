import { isUserRole, type UserRole } from './role';

export interface StoredUser {
  id: number;
  login: string;
  role: UserRole;
}

const USER_KEY = 'pizzaria-cumaru.user';

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
}

export function clearSession(): void {
  window.localStorage.removeItem(USER_KEY);
}
