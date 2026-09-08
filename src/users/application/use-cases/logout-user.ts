import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';

export interface ILogoutUserParams {
  token: string;
}

// End the session: the token is denylisted and refused afterwards.
// Feature: 01_authentication.feature.
@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(params: ILogoutUserParams): Promise<void> {
    const payload = await this.jwtService.verifyAsync<{
      jti: string;
      exp: number;
    }>(params.token);
    await this.userRepository.denyToken(
      payload.jti,
      new Date(payload.exp * 1000),
    );
  }
}
