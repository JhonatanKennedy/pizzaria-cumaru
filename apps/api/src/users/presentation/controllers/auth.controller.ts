import { Body, Controller, Headers, Post } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthenticateUserUseCase } from '../../application/use-cases/authenticate-user.js';
import { LogoutUserUseCase } from '../../application/use-cases/logout-user.js';
import { Public } from '../../../common/guards/roles.guard.js';

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
    private readonly logoutUserUseCase: LogoutUserUseCase,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authenticateUserUseCase.execute(dto);
  }

  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    return this.logoutUserUseCase.execute({ token });
  }
}
