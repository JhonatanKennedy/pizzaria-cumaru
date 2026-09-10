import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { EUserRole } from '../../domain/enums/user-role.js';

export interface IAuthenticateUserParams {
  login: string;
  password: string;
}

export interface IAuthenticateResult {
  token: string;
  user: { id: number; login: string; role: EUserRole };
}

// Authenticate with login/password. Five consecutive failures lock the account
// for 15 minutes. Success grants access to the profile's dashboard.
// Feature: 01_authentication.feature.
@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    params: IAuthenticateUserParams,
    now: Date = new Date(),
  ): Promise<IAuthenticateResult> {
    const user = await this.userRepository.findByLogin(params.login);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    if (user.isLocked(now)) {
      throw new Error('Account locked. Try again in 15 minutes');
    }

    const passwordMatches = await bcrypt.compare(
      params.password,
      user.getPasswordHash(),
    );
    if (!passwordMatches) {
      user.registerFailedAttempt(now);
      await this.userRepository.save(user);
      throw new Error('Invalid username or password');
    }

    user.resetFailedAttempts();
    await this.userRepository.save(user);

    const token = await this.jwtService.signAsync(
      { sub: user.getId(), role: user.getRole() },
      { jwtid: randomUUID(), expiresIn: '1h' },
    );

    return {
      token,
      user: { id: user.getId(), login: user.getLogin(), role: user.getRole() },
    };
  }
}
