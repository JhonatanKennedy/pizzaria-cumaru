import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { buildCorsOptions, parseCorsOrigins } from './config/cors.js';
import { isProduction } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  const config = app.get(ConfigService);
  const origins = parseCorsOrigins(config.get<string>('CORS_ORIGINS'));
  app.enableCors(buildCorsOptions(origins));

  // A typo in the allowlist is invisible server-side and only shows up as a
  // browser error naming nothing, so the operator needs to see what was read.
  Logger.log(`CORS allowlist: ${origins.join(', ')}`, 'Bootstrap');

  // The other invisible one: over plain HTTP a browser drops a `Secure` cookie
  // without a word, so a production boot without TLS looks like a login that
  // works and a session that vanishes. Say the flag out loud instead.
  const secureCookies = isProduction(config.get<string>('NODE_ENV'));
  Logger.log(
    `Refresh cookie Secure flag: ${secureCookies ? 'on' : 'off'}`,
    'Bootstrap',
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
