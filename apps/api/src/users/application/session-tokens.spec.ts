import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  DEV_ACCESS_SECRET,
  DEV_REFRESH_SECRET,
} from '../../config/env.validation.js';
import { ETokenKind } from '../domain/enums/token-kind.js';
import { EUserRole } from '../domain/enums/user-role.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  SessionTokens,
} from './session-tokens.js';

const ACCESS_SECRET = 'an-access-secret';
const REFRESH_SECRET = 'a-different-refresh-secret';
const SUBJECT = { sub: 7, role: EUserRole.WAITER };

interface ITimedPayload {
  typ: string;
  jti: string;
  iat: number;
  exp: number;
}

function makeSessionTokens(
  config: Record<string, string> = { JWT_REFRESH_SECRET: REFRESH_SECRET },
): { tokens: SessionTokens; accessJwt: JwtService } {
  return {
    tokens: new SessionTokens(
      new JwtService({ secret: ACCESS_SECRET }),
      new ConfigService(config),
    ),
    accessJwt: new JwtService({ secret: ACCESS_SECRET }),
  };
}

describe('SessionTokens', () => {
  it('should stamp an access token as an access token', async () => {
    const { tokens, accessJwt } = makeSessionTokens();

    const payload = await accessJwt.verifyAsync<ITimedPayload>(
      await tokens.issueAccessToken(SUBJECT),
    );

    expect(payload.typ).toBe(ETokenKind.ACCESS);
    expect(payload.jti).toBeTruthy();
  });

  it('should stamp a refresh token as a refresh token', async () => {
    const { tokens } = makeSessionTokens();

    const payload = await tokens.verifyRefreshToken(
      await tokens.issueRefreshToken(SUBJECT),
    );

    expect(payload.typ).toBe(ETokenKind.REFRESH);
    expect(payload.sub).toBe(SUBJECT.sub);
  });

  it('should not let a refresh token verify against the access secret', async () => {
    const { tokens, accessJwt } = makeSessionTokens();

    const refreshToken = await tokens.issueRefreshToken(SUBJECT);

    await expect(accessJwt.verifyAsync(refreshToken)).rejects.toThrow();
  });

  it('should separate the two kinds even on the development fallback secrets', async () => {
    const { tokens, accessJwt } = makeSessionTokens({});

    const refreshToken = await tokens.issueRefreshToken(SUBJECT);

    expect(DEV_REFRESH_SECRET).not.toBe(DEV_ACCESS_SECRET);
    await expect(accessJwt.verifyAsync(refreshToken)).rejects.toThrow();
    await expect(
      tokens.verifyRefreshToken(refreshToken),
    ).resolves.toMatchObject({ typ: ETokenKind.REFRESH });
  });

  it('should give the access token the shorter lifetime', async () => {
    const { tokens, accessJwt } = makeSessionTokens();

    const access = await accessJwt.verifyAsync<ITimedPayload>(
      await tokens.issueAccessToken(SUBJECT),
    );
    const refresh = await tokens.verifyRefreshToken(
      await tokens.issueRefreshToken(SUBJECT),
    );

    expect(access.exp - access.iat).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(refresh.exp - refresh.iat).toBe(REFRESH_TOKEN_TTL_SECONDS);
    expect(ACCESS_TOKEN_TTL_SECONDS).toBeLessThan(REFRESH_TOKEN_TTL_SECONDS);
  });

  it('should refuse an access token offered to the refresh operation', async () => {
    const { tokens } = makeSessionTokens();

    const accessToken = await tokens.issueAccessToken(SUBJECT);

    await expect(tokens.verifyRefreshToken(accessToken)).rejects.toThrow();
  });

  it('should refuse a token signed with neither secret', async () => {
    const { tokens } = makeSessionTokens();
    const foreign = new JwtService({ secret: 'some-other-secret' });
    const foreignToken = await foreign.signAsync(
      { ...SUBJECT, typ: ETokenKind.REFRESH },
      { jwtid: 'foreign' },
    );

    await expect(tokens.verifyRefreshToken(foreignToken)).rejects.toThrow();
  });
});
