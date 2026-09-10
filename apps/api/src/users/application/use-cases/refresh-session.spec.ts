import { RefreshSessionUseCase } from './refresh-session.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { SessionTokens } from '../session-tokens.js';
import { ETokenKind } from '../../domain/enums/token-kind.js';
import { EUserRole } from '../../domain/enums/user-role.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

const ACCESS_SECRET = 'an-access-secret';
const REFRESH_SECRET = 'a-different-refresh-secret';
const SUBJECT = { sub: 7, role: EUserRole.WAITER };

// A denylist that behaves like the table: `denyToken` upserts and
// `isTokenDenied` answers from what has been written.
function makeRepository() {
  const denied = new Set<string>();

  return {
    findById: vi.fn(async () => null),
    findByLogin: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    denyToken: vi.fn(async (jti: string) => {
      denied.add(jti);
    }),
    isTokenDenied: vi.fn(async (jti: string) => denied.has(jti)),
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

function makeUseCase(): {
  useCase: RefreshSessionUseCase;
  sessionTokens: SessionTokens;
  accessJwt: JwtService;
  repository: IUserRepository;
} {
  const { sessionTokens, accessJwt } = makeSessionTokens();
  const repository = makeRepository();

  return {
    useCase: new RefreshSessionUseCase(repository, sessionTokens),
    sessionTokens,
    accessJwt,
    repository,
  };
}

describe('RefreshSessionUseCase', () => {
  it('should rotate a current token and return a new pair', async () => {
    const { useCase, sessionTokens, accessJwt } = makeUseCase();
    const current = await sessionTokens.issueRefreshToken(SUBJECT);
    const currentPayload = await sessionTokens.verifyRefreshToken(current);

    const result = await useCase.execute({ refreshToken: current });

    expect(result.refreshToken).not.toBe(current);
    await expect(
      accessJwt.verifyAsync(result.accessToken),
    ).resolves.toMatchObject({ typ: ETokenKind.ACCESS, sub: SUBJECT.sub });
    await expect(
      sessionTokens.verifyRefreshToken(result.refreshToken),
    ).resolves.toMatchObject({ typ: ETokenKind.REFRESH, sub: SUBJECT.sub });
    await expect(
      sessionTokens.verifyRefreshToken(result.refreshToken),
    ).resolves.not.toMatchObject({ jti: currentPayload.jti });
  });

  it('should denylist the token it rotated away', async () => {
    const { useCase, sessionTokens, repository } = makeUseCase();
    const current = await sessionTokens.issueRefreshToken(SUBJECT);
    const payload = await sessionTokens.verifyRefreshToken(current);

    await useCase.execute({ refreshToken: current });

    expect(repository.denyToken).toHaveBeenCalledWith(
      payload.jti,
      new Date(payload.exp * 1000),
    );
  });

  it('should refuse a token that was already rotated away', async () => {
    const { useCase, sessionTokens } = makeUseCase();
    const current = await sessionTokens.issueRefreshToken(SUBJECT);

    await useCase.execute({ refreshToken: current });

    await expect(
      useCase.execute({ refreshToken: current }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should still rotate the newest token after a replay is refused', async () => {
    const { useCase, sessionTokens } = makeUseCase();
    const current = await sessionTokens.issueRefreshToken(SUBJECT);

    const rotated = await useCase.execute({ refreshToken: current });
    await expect(
      useCase.execute({ refreshToken: current }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      useCase.execute({ refreshToken: rotated.refreshToken }),
    ).resolves.toMatchObject({ accessToken: expect.any(String) });
  });

  it('should refuse a token from an ended session', async () => {
    const { useCase, sessionTokens, repository } = makeUseCase();
    const ended = await sessionTokens.issueRefreshToken(SUBJECT);
    const payload = await sessionTokens.verifyRefreshToken(ended);
    await repository.denyToken(payload.jti, new Date(payload.exp * 1000));

    await expect(
      useCase.execute({ refreshToken: ended }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should refuse when there is no token at all', async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute({})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should refuse an access token offered as the refresh token', async () => {
    const { useCase, sessionTokens } = makeUseCase();

    await expect(
      useCase.execute({
        refreshToken: await sessionTokens.issueAccessToken(SUBJECT),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should refuse a token signed with neither secret', async () => {
    const { useCase } = makeUseCase();
    const foreign = new JwtService({ secret: 'some-other-secret' });
    const foreignToken = await foreign.signAsync(
      { ...SUBJECT, typ: ETokenKind.REFRESH },
      { jwtid: 'foreign' },
    );

    await expect(
      useCase.execute({ refreshToken: foreignToken }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
