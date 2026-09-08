import { AuthenticateUserUseCase } from './authenticate-user.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { User } from '../../domain/entities/user.js';
import { EUserRole } from '../../domain/enums/user-role.js';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

const NOW = new Date('2026-09-07T12:00:00Z');
const PASSWORD = 'SenhaSegura123';

function makeUser(overrides: { failedAttempts?: number } = {}): User {
  const passwordHash = bcrypt.hashSync(PASSWORD, 4);
  const user = User.create({
    id: 1,
    login: 'joao.garcom',
    passwordHash,
    role: EUserRole.WAITER,
  });
  for (
    let attempt = 0;
    attempt < (overrides.failedAttempts ?? 0);
    attempt += 1
  ) {
    user.registerFailedAttempt(NOW);
  }
  return user;
}

function makeFakeRepository(user: User | null) {
  return {
    findById: vi.fn(async () => null),
    findByLogin: vi.fn(async () => user),
    save: vi.fn(async () => undefined),
    denyToken: vi.fn(async () => undefined),
    isTokenDenied: vi.fn(async () => false),
  } as unknown as IUserRepository;
}

function makeJwtService() {
  return {
    signAsync: vi.fn(async () => 'token-abc'),
    verifyAsync: vi.fn(async () => ({ jti: 'jti-1', exp: 0 })),
  } as unknown as JwtService;
}

describe('AuthenticateUserUseCase', () => {
  it('should issue a token and reset failed attempts on success', async () => {
    const user = makeUser({ failedAttempts: 4 });
    const repository = makeFakeRepository(user);
    const useCase = new AuthenticateUserUseCase(repository, makeJwtService());

    const result = await useCase.execute(
      { login: 'joao.garcom', password: PASSWORD },
      NOW,
    );

    expect(result.token).toBe('token-abc');
    expect(result.user.role).toBe(EUserRole.WAITER);
    expect(user.getFailedAttempts()).toBe(0);
  });

  it('should refuse a wrong password and register the attempt', async () => {
    const user = makeUser();
    const repository = makeFakeRepository(user);
    const useCase = new AuthenticateUserUseCase(repository, makeJwtService());

    await expect(
      useCase.execute({ login: 'joao.garcom', password: 'wrong' }, NOW),
    ).rejects.toThrow('Invalid username or password');
    expect(user.getFailedAttempts()).toBe(1);
    expect(repository.save).toHaveBeenCalledWith(user);
  });

  it('should refuse an unknown login without revealing it', async () => {
    const repository = makeFakeRepository(null);
    const useCase = new AuthenticateUserUseCase(repository, makeJwtService());

    await expect(
      useCase.execute({ login: 'nobody', password: PASSWORD }, NOW),
    ).rejects.toThrow('Invalid username or password');
  });

  it('should refuse a locked account with the lock message', async () => {
    const user = makeUser({ failedAttempts: 5 });
    const repository = makeFakeRepository(user);
    const useCase = new AuthenticateUserUseCase(repository, makeJwtService());

    await expect(
      useCase.execute({ login: 'joao.garcom', password: PASSWORD }, NOW),
    ).rejects.toThrow('Account locked. Try again in 15 minutes');
  });
});
