import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { MS_PER_SECOND, SessionTokens } from '../session-tokens.js';

export interface ILogoutUserParams {
  refreshToken?: string;
}

// End the session: the refresh token's `jti` is denylisted, so it is refused
// afterwards. A missing, malformed or already-denied token still succeeds —
// a client holding a dead cookie has to be able to get rid of it, and there is
// nothing left to revoke in that case anyway.
// Feature: 01_authentication.feature.
@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly sessionTokens: SessionTokens,
  ) {}

  async execute(params: ILogoutUserParams): Promise<void> {
    const payload = await this.revocableTokenOf(params.refreshToken);
    if (!payload) {
      return;
    }

    // `denyToken` upserts, so revoking an already-revoked token is a no-op
    // rather than an error.
    await this.userRepository.denyToken(
      payload.jti,
      new Date(payload.exp * MS_PER_SECOND),
    );
  }

  private async revocableTokenOf(
    token: string | undefined,
  ): Promise<{ jti: string; exp: number } | undefined> {
    if (!token) {
      return undefined;
    }

    try {
      const payload = await this.sessionTokens.verifyRefreshToken(token);
      return { jti: payload.jti, exp: payload.exp };
    } catch {
      return undefined;
    }
  }
}
