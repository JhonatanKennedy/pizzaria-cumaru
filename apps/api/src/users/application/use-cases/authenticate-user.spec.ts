import { AuthenticateUserUseCase } from './authenticate-user.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { User } from '../../domain/entities/user.js';
import { ETokenKind } from '../../domain/enums/token-kind.js';
import { EUserRole } from '../../domain/enums/user-role.js';
import { SessionTokens } from '../session-tokens.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

const NOW = new Date('2026-09-07T12:00:00Z');
const PASSWORD = 'SenhaSegura123';
const ACCESS_SECRET = 'an-access-secret';
const REFRESH_SECRET = 'a-different-refresh-secret';

interface ITimedPayload {
  typ: string;
  exp: number;
  iat: number;
}

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
    findByLogin: vi.fn(async () => user),
    save: vi.fn(async () => undefined),
    denyToken: vi.fn(async () => undefined),
    isTokenDenied: vi.fn(async () => false),
  } as unknown as IUserRepository;
}

function makeSessionTokens(): {
  sessionTokens: SessionTokens;
  accessJwt: JwtService;
} {
  return {
    sessionTokens: new SessionTokens(
      new JwtService({ secret: ACCESS_SECRET }),
      new ConfigService({ JWT_REFRESH_SECRET: REFRESH_SECRET }),
    ),
    accessJwt: new JwtService({ secret: ACCESS_SECRET }),
  };
}

function makeUseCase(user: User | null): {
  useCase: AuthenticateUserUseCase;
  sessionTokens: SessionTokens;
  accessJwt: JwtService;
} {
  const { sessionTokens, accessJwt } = makeSessionTokens();
  return {
    useCase: new AuthenticateUserUseCase(
      makeFakeRepository(user),
      sessionTokens,
    ),
    sessionTokens,
    accessJwt,
  };
}

describe('AuthenticateUserUseCase', () => {
  it('should issue both halves of the session and reset failed attempts', async () => {
    const user = makeUser({ failedAttempts: 4 });
    const { useCase } = makeUseCase(user);

    const result = await useCase.execute(
      { login: 'joao.garcom', password: PASSWORD },
      NOW,
    );

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.role).toBe(EUserRole.WAITER);
    expect(user.getFailedAttempts()).toBe(0);
  });

  it('should carry the two tokens separately', async () => {
    const { useCase, sessionTokens, accessJwt } = makeUseCase(makeUser());

    const result = await useCase.execute(
      { login: 'joao.garcom', password: PASSWORD },
      NOW,
    );

    expect(result.accessToken).not.toBe(result.refreshToken);
    await expect(
      accessJwt.verifyAsync<ITimedPayload>(result.accessToken),
    ).resolves.toMatchObject({ typ: ETokenKind.ACCESS });
    await expect(
      sessionTokens.verifyRefreshToken(result.refreshToken),
    ).resolves.toMatchObject({ typ: ETokenKind.REFRESH });
  });

  it('should give the access token the short lifetime', async () => {
    const { useCase, accessJwt, sessionTokens } = makeUseCase(makeUser());

    const result = await useCase.execute(
      { login: 'joao.garcom', password: PASSWORD },
      NOW,
    );

    const access = await accessJwt.verifyAsync<ITimedPayload>(
      result.accessToken,
    );
    const refresh = await sessionTokens.verifyRefreshToken(result.refreshToken);

    expect(access.exp - access.iat).toBeLessThan(refresh.exp - refresh.iat);
  });

  it('should not let the refresh token authorize a request', async () => {
    const { useCase, accessJwt } = makeUseCase(makeUser());

    const result = await useCase.execute(
      { login: 'joao.garcom', password: PASSWORD },
      NOW,
    );

    await expect(accessJwt.verifyAsync(result.refreshToken)).rejects.toThrow();
  });

  it('should refuse a wrong password and register the attempt', async () => {
    const user = makeUser();
    const repository = makeFakeRepository(user);
    const useCase = new AuthenticateUserUseCase(
      repository,
      makeSessionTokens().sessionTokens,
    );

    await expect(
      useCase.execute({ login: 'joao.garcom', password: 'wrong' }, NOW),
    ).rejects.toThrow('Invalid username or password');
    expect(user.getFailedAttempts()).toBe(1);
    expect(repository.save).toHaveBeenCalledWith(user);
  });

  it('should refuse an unknown login without revealing it', async () => {
    const { useCase } = makeUseCase(null);

    await expect(
      useCase.execute({ login: 'nobody', password: PASSWORD }, NOW),
    ).rejects.toThrow('Invalid username or password');
  });

  it('should refuse a locked account with the lock message', async () => {
    const { useCase } = makeUseCase(makeUser({ failedAttempts: 5 }));

    await expect(
      useCase.execute({ login: 'joao.garcom', password: PASSWORD }, NOW),
    ).rejects.toThrow('Account locked. Try again in 15 minutes');
  });
});
