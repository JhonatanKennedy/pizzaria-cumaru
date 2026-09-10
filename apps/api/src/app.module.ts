import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { OrdersModule } from './orders/orders.module.js';
import { KitchenModule } from './kitchen/kitchen.module.js';
import { TablesModule } from './tables/tables.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { DomainErrorFilter } from './common/filters/domain-error.filter.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { isProduction, validateEnv } from './config/env.validation.js';
import { UsersModule } from './users/users.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
      ignoreEnvFile: isProduction(process.env.NODE_ENV),
      validate: validateEnv,
    }),
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'pizzaria-cumaru-backend',
    }),
    PrismaModule,
    OrdersModule,
    KitchenModule,
    TablesModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
