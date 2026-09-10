import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './presentation/controllers/auth.controller.js';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.js';
import { LogoutUserUseCase } from './application/use-cases/logout-user.js';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.js';
import { USER_REPOSITORY } from './domain/repositories/user-repository.js';
import { PrismaUserRepository } from './infrastructure/prisma-user-repository.js';
import { SessionTokens } from './application/session-tokens.js';
import { accessSecret } from '../config/env.validation.js';

@Module({
  imports: [
    // `accessSecret` is the single definition of the development fallback — and
    // `validateEnv` already fails the boot when production lacks JWT_SECRET, so
    // there is no second check to keep in step here.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: accessSecret({ JWT_SECRET: config.get<string>('JWT_SECRET') }),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthenticateUserUseCase,
    RefreshSessionUseCase,
    LogoutUserUseCase,
    SessionTokens,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY, JwtModule],
})
export class UsersModule {}
