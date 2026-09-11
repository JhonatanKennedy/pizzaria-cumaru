import type { User } from '../entities/user.js';

export interface IUserRepository {
  findByLogin(login: string): Promise<User | null>;
  save(user: User): Promise<void>;
  denyToken(jti: string, expiresAt: Date): Promise<void>;
  isTokenDenied(jti: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
