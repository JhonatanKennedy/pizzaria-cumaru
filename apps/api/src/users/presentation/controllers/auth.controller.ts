import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString } from 'class-validator';
import type { Request, Response } from 'express';
import { AuthenticateUserUseCase } from '../../application/use-cases/authenticate-user.js';
import { LogoutUserUseCase } from '../../application/use-cases/logout-user.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.js';
import { Public } from '../../../common/guards/roles.guard.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from '../session-cookie.js';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authenticateUserUseCase: AuthenticateUserUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authenticateUserUseCase.execute(dto);

    setRefreshCookie(response, refreshToken, this.nodeEnv());

    // The refresh token leaves in the cookie and nowhere else: a body carrying
    // it would hand the long-lived half of the session to the page scripts the
    // access token's short lifetime exists to limit.
    return { accessToken, user };
  }

  // Public because this endpoint authenticates by the cookie, not by the bearer
  // header: the caller's whole reason for being here is that its access token
  // is expired or gone.
  @Public()
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.refreshSessionUseCase.execute({
        refreshToken: readRefreshCookie(request),
      });

    setRefreshCookie(response, refreshToken, this.nodeEnv());

    return { accessToken };
  }

  // Public for the same reason, and it answers 201 whether or not the cookie
  // held a live token: a client whose token is already dead has to be able to
  // clear it, and refusing here would leave it holding the cookie.
  @Public()
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.logoutUserUseCase.execute({
      refreshToken: readRefreshCookie(request),
    });

    clearRefreshCookie(response, this.nodeEnv());
  }

  private nodeEnv(): string | undefined {
    return this.config.get<string>('NODE_ENV');
  }
}
