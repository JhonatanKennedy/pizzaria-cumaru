import { LogoutUserUseCase } from './logout-user.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { SessionTokens } from '../session-tokens.js';
import { EUserRole } from '../../domain/enums/user-role.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const ACCESS_SECRET = 'an-access-secret';
const REFRESH_SECRET = 'a-different-refresh-secret';
const SUBJECT = { sub: 7, role: EUserRole.WAITER };

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

function makeRepository(denied = false) {
  return {
    findById: vi.fn(async () => null),
    findByLogin: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    denyToken: vi.fn(async () => undefined),
    isTokenDenied: vi.fn(async () => denied),
  } as unknown as IUserRepository;
}

function makeUseCase(repository: IUserRepository, tokens: SessionTokens) {
  return new LogoutUserUseCase(repository, tokens);
}

describe('LogoutUserUseCase', () => {
  it('should denylist the refresh token with its expiry', async () => {
    const { sessionTokens } = makeSessionTokens();
    const repository = makeRepository();
    const refreshToken = await sessionTokens.issueRefreshToken(SUBJECT);
    const payload = await sessionTokens.verifyRefreshToken(refreshToken);

    await makeUseCase(repository, sessionTokens).execute({ refreshToken });

    expect(repository.denyToken).toHaveBeenCalledWith(
      payload.jti,
      new Date(payload.exp * 1000),
    );
  });

  it('should revoke the token it was given, not the one it replaced', async () => {
    const { sessionTokens } = makeSessionTokens();
    const repository = makeRepository();
    const first = await sessionTokens.issueRefreshToken(SUBJECT);
    const second = await sessionTokens.issueRefreshToken(SUBJECT);
    const firstPayload = await sessionTokens.verifyRefreshToken(first);

    await makeUseCase(repository, sessionTokens).execute({
      refreshToken: second,
    });

    expect(repository.denyToken).toHaveBeenCalledTimes(1);
    expect(repository.denyToken).not.toHaveBeenCalledWith(
      firstPayload.jti,
      expect.anything(),
    );
  });

  it('should succeed on an already-denied token', async () => {
    const { sessionTokens } = makeSessionTokens();
    const repository = makeRepository(true);
    const refreshToken = await sessionTokens.issueRefreshToken(SUBJECT);

    await expect(
      makeUseCase(repository, sessionTokens).execute({ refreshToken }),
    ).resolves.toBeUndefined();
  });

  it('should succeed without a token at all', async () => {
    const { sessionTokens } = makeSessionTokens();
    const repository = makeRepository();

    await expect(
      makeUseCase(repository, sessionTokens).execute({}),
    ).resolves.toBeUndefined();
    expect(repository.denyToken).not.toHaveBeenCalled();
  });

  it('should succeed on a malformed token without denylisting anything', async () => {
    const { sessionTokens } = makeSessionTokens();
    const repository = makeRepository();

    await expect(
      makeUseCase(repository, sessionTokens).execute({
        refreshToken: 'not-a-jwt',
      }),
    ).resolves.toBeUndefined();
    expect(repository.denyToken).not.toHaveBeenCalled();
  });

  it('should refuse to denylist an access token offered as the cookie', async () => {
    const { sessionTokens } = makeSessionTokens();
    const repository = makeRepository();
    const accessToken = await sessionTokens.issueAccessToken(SUBJECT);

    await expect(
      makeUseCase(repository, sessionTokens).execute({
        refreshToken: accessToken,
      }),
    ).resolves.toBeUndefined();
    expect(repository.denyToken).not.toHaveBeenCalled();
  });
});
