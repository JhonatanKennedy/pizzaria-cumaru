import { User } from './user.js';
import { EUserRole } from '../enums/user-role.js';

const NOW = new Date('2026-09-07T12:00:00Z');
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function makeUser(): User {
  return User.create({
    id: 1,
    login: 'joao.garcom',
    passwordHash: 'hashed',
    role: EUserRole.WAITER,
  });
}

describe('User', () => {
  it('should refuse an empty login', () => {
    expect(() =>
      User.create({
        id: 1,
        login: '  ',
        passwordHash: 'hashed',
        role: EUserRole.WAITER,
      }),
    ).toThrow('Login is required');
  });

  it('should refuse an empty password hash', () => {
    expect(() =>
      User.create({
        id: 1,
        login: 'joao.garcom',
        passwordHash: '',
        role: EUserRole.WAITER,
      }),
    ).toThrow('Password is required');
  });

  it('should carry its role', () => {
    expect(makeUser().getRole()).toBe(EUserRole.WAITER);
  });

  it('should lock the account after five consecutive failures', () => {
    const user = makeUser();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      user.registerFailedAttempt(NOW);
    }

    expect(user.isLocked(NOW)).toBe(true);
    expect(user.getLockedUntil()?.getTime()).toBe(
      NOW.getTime() + FIFTEEN_MINUTES_MS,
    );
  });

  it('should not lock before the fifth failure', () => {
    const user = makeUser();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      user.registerFailedAttempt(NOW);
    }

    expect(user.isLocked(NOW)).toBe(false);
    expect(user.getFailedAttempts()).toBe(4);
  });

  it('should release the lock after the window passes', () => {
    const user = makeUser();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      user.registerFailedAttempt(NOW);
    }

    expect(
      user.isLocked(new Date(NOW.getTime() + FIFTEEN_MINUTES_MS + 1)),
    ).toBe(false);
  });

  it('should reset the failure count on success', () => {
    const user = makeUser();
    user.registerFailedAttempt(NOW);
    user.resetFailedAttempts();

    expect(user.getFailedAttempts()).toBe(0);
    expect(user.getLockedUntil()).toBeUndefined();
  });
});
