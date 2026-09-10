import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { DEV_REFRESH_SECRET } from '../../config/env.validation.js';
import { ETokenKind } from '../domain/enums/token-kind.js';
import { EUserRole } from '../domain/enums/user-role.js';

// A JWT's `exp` is in seconds — jsonwebtoken reads a numeric `expiresIn` the
// same way — so this is what turns one back into the Date the denylist stores.
export const MS_PER_SECOND = 1000;

// The access token is the one a live page script can read, so its lifetime is
// the window an injected script has to act in. The refresh token's is an idle
// timeout instead: rotation mints a fresh one — and a fresh lifetime — on every
// refresh, so only genuine inactivity ends a session.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 12 * 60 * 60;
export const REFRESH_TOKEN_MAX_AGE_MS =
  REFRESH_TOKEN_TTL_SECONDS * MS_PER_SECOND;

const NOT_A_REFRESH_TOKEN = 'Not a refresh token';

export interface ITokenSubject {
  sub: number;
  role: EUserRole;
}

export interface IVerifiedTokenPayload extends ITokenSubject {
  jti: string;
  typ: ETokenKind;
  iat: number;
  exp: number;
}

// The two halves of a session are signed with different secrets on purpose:
// a refresh token offered as an access token has to fail signature
// verification, because `RolesGuard`'s accept path never looks at a token's
// lifetime — a refresh token signed with the access secret would simply be a
// 12-hour access token.
@Injectable()
export class SessionTokens {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issueAccessToken(subject: ITokenSubject): Promise<string> {
    return this.jwtService.signAsync(
      { ...subject, typ: ETokenKind.ACCESS },
      { jwtid: randomUUID(), expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );
  }

  async issueRefreshToken(subject: ITokenSubject): Promise<string> {
    return this.jwtService.signAsync(
      { ...subject, typ: ETokenKind.REFRESH },
      {
        jwtid: randomUUID(),
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        secret: this.refreshSecret(),
      },
    );
  }

  async verifyRefreshToken(token: string): Promise<IVerifiedTokenPayload> {
    const payload = await this.jwtService.verifyAsync<IVerifiedTokenPayload>(
      token,
      { secret: this.refreshSecret() },
    );
    if (payload.typ !== ETokenKind.REFRESH) {
      throw new Error(NOT_A_REFRESH_TOKEN);
    }
    return payload;
  }

  private refreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET') ?? DEV_REFRESH_SECRET;
  }
}
