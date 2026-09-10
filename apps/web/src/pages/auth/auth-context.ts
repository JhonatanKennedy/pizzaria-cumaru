import { createContext } from 'react';
import type { UserRole } from './business/role';

export interface AuthUser {
  id: number;
  login: string;
  role: UserRole;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (login: string, password: string) => Promise<AuthUser>;
  loginAsDev: (role: UserRole) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
