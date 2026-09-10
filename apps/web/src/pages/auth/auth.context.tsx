import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  clearSession,
  isDevSession,
  readStoredUser,
  writeDevSession,
  writeStoredUser,
} from './business/auth-storage';
import {
  clearAccessToken,
  refreshAccessToken,
  writeAccessToken,
} from './business/session';
import { registerSessionExpiryHandler } from './business/handle-unauthorized';
import type { UserRole } from './business/role';
import { authenticate, revokeToken } from './api/auth.api';
import { AuthContext, type AuthUser } from './auth-context';

type TSessionStatus = 'pending' | 'ready';

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<TSessionStatus>('pending');

  useEffect(() => {
    registerSessionExpiryHandler(() => setUser(null));
    return () => registerSessionExpiryHandler(null);
  }, []);

  // The token is gone on every reload, so "is there a session?" has no
  // synchronous answer any more: it is whatever the refresh cookie says. Until
  // that answers, nothing renders — a `null` user would otherwise send a
  // signed-in reload to the login screen for a frame.
  useEffect(() => {
    let active = true;

    const restore = async (): Promise<void> => {
      const stored = readStoredUser();
      if (!stored || isDevSession()) {
        // A dev session has no cookie behind it, so refreshing would fail and
        // sign the dev user out on every reload. Its blob is the session.
        if (active) {
          setUser(stored);
          setStatus('ready');
        }
        return;
      }

      const refreshed = await refreshAccessToken();
      if (!active) {
        return;
      }
      if (refreshed) {
        setUser(stored);
      } else {
        clearSession();
      }
      setStatus('ready');
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const result = await authenticate(loginValue, password);
    writeAccessToken(result.accessToken);
    writeStoredUser(result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const loginAsDev = useCallback((role: UserRole) => {
    const devUser: AuthUser = { id: 0, login: 'dev', role };
    writeDevSession(devUser);
    setUser(devUser);
  }, []);

  const logout = useCallback(async () => {
    // Ending the local session cannot depend on the call succeeding: the cookie
    // may already be gone, and the user asked to be signed out.
    await revokeToken().catch(() => undefined);
    clearAccessToken();
    clearSession();
    setUser(null);
  }, []);

  if (status === 'pending') {
    return <p className="p-6 text-stone-600">Carregando…</p>;
  }

  return (
    <AuthContext.Provider value={{ user, login, loginAsDev, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
