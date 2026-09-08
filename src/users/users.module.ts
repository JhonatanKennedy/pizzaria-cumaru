import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './presentation/controllers/auth.controller.js';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.js';
import { LogoutUserUseCase } from './application/use-cases/logout-user.js';
import { USER_REPOSITORY } from './domain/repositories/user-repository.js';
import { PrismaUserRepository } from './infrastructure/prisma-user-repository.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthenticateUserUseCase,
    LogoutUserUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY, JwtModule],
})
export class UsersModule {}
