import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { MS_PER_SECOND, SessionTokens } from '../session-tokens.js';
import type { IVerifiedTokenPayload } from '../session-tokens.js';

export interface IRefreshSessionParams {
  refreshToken?: string;
}

export interface IRefreshSessionResult {
  accessToken: string;
  refreshToken: string;
}

// Trade a live refresh token for a new pair, rotating it in the same step: the
// token just spent is denylisted, so it is usable at most once and a replay is
// refused rather than silently honoured. The session's lifetime is an idle
// timeout — every rotation mints a fresh one — so only inactivity ends it.
// Feature: 01_authentication.feature.
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly sessionTokens: SessionTokens,
  ) {}

  async execute(params: IRefreshSessionParams): Promise<IRefreshSessionResult> {
    // A missing cookie, a malformed token and a token signed with the wrong
    // secret are one answer to the caller: there is no session to continue.
    if (!params.refreshToken) {
      throw new UnauthorizedException('Session expired');
    }

    const payload = await this.verifyOrRefuse(params.refreshToken);

    if (await this.userRepository.isTokenDenied(payload.jti)) {
      throw new UnauthorizedException('Session expired');
    }

    await this.userRepository.denyToken(
      payload.jti,
      new Date(payload.exp * MS_PER_SECOND),
    );

    const subject = { sub: payload.sub, role: payload.role };

    return {
      accessToken: await this.sessionTokens.issueAccessToken(subject),
      refreshToken: await this.sessionTokens.issueRefreshToken(subject),
    };
  }

  private async verifyOrRefuse(token: string): Promise<IVerifiedTokenPayload> {
    try {
      return await this.sessionTokens.verifyRefreshToken(token);
    } catch {
      // The reason a token did not verify is not the caller's to learn — an
      // expired one and a forged one get the same answer.
      throw new UnauthorizedException('Session expired');
    }
  }
}
