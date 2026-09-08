import { isUserRole, type UserRole } from './role';

export interface StoredUser {
  id: number;
  login: string;
  role: UserRole;
}

export interface StoredSession {
  token: string;
  user: StoredUser;
}

const TOKEN_KEY = 'pizzaria-cumaru.token';
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

export function readToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function readStoredSession(): StoredSession | null {
  const token = readToken();
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!token || !rawUser) {
    return null;
  }
  try {
    const user: unknown = JSON.parse(rawUser);
    return isStoredUser(user) ? { token, user } : null;
  } catch {
    return null;
  }
}

export function writeSession(token: string, user: StoredUser): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
