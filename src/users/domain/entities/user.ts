import { EUserRole } from '../enums/user-role.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export interface ICreateUserParams {
  id: number;
  login: string;
  passwordHash: string;
  role: EUserRole;
  failedAttempts?: number;
  lockedUntil?: Date;
}

export class User {
  private constructor(
    private readonly id: number,
    private readonly login: string,
    private readonly passwordHash: string,
    private readonly role: EUserRole,
    private failedAttempts: number,
    private lockedUntil?: Date,
  ) {}

  static create(params: ICreateUserParams): User {
    if (!params.login.trim()) {
      throw new Error('Login is required');
    }
    if (!params.passwordHash) {
      throw new Error('Password is required');
    }
    return new User(
      params.id,
      params.login,
      params.passwordHash,
      params.role,
      params.failedAttempts ?? 0,
      params.lockedUntil,
    );
  }

  registerFailedAttempt(now: Date): void {
    this.failedAttempts += 1;
    if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      this.failedAttempts = 0;
      this.lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
    }
  }

  resetFailedAttempts(): void {
    this.failedAttempts = 0;
    this.lockedUntil = undefined;
  }

  isLocked(now: Date): boolean {
    return this.lockedUntil !== undefined && this.lockedUntil > now;
  }

  getId(): number {
    return this.id;
  }

  getLogin(): string {
    return this.login;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getRole(): EUserRole {
    return this.role;
  }

  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  getLockedUntil(): Date | undefined {
    return this.lockedUntil;
  }
}
