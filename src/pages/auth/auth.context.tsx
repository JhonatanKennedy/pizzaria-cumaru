import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  clearSession,
  readStoredSession,
  writeSession,
} from './business/auth-storage';
import { registerSessionExpiryHandler } from './business/handle-unauthorized';
import type { UserRole } from './business/role';
import { authenticate, revokeToken } from './api/auth.api';
import { AuthContext, type AuthUser } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<AuthUser | null>(
    () => readStoredSession()?.user ?? null,
  );

  useEffect(() => {
    registerSessionExpiryHandler(() => setUser(null));
    return () => registerSessionExpiryHandler(null);
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const result = await authenticate(loginValue, password);
    writeSession(result.token, result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const loginAsDev = useCallback((role: UserRole) => {
    const devUser: AuthUser = { id: 0, login: 'dev', role };
    writeSession('dev-token', devUser);
    setUser(devUser);
  }, []);

  const logout = useCallback(async () => {
    await revokeToken().catch(() => undefined);
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, loginAsDev, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
