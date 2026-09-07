import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('users')
  getUsers() {
    return this.prisma.user.findMany();
  }

  @Get('users/test')
  getaa() {
    return this.prisma.user.create({
      data: { email: 'teste', name: 'qqweq' },
    });
  }
}
