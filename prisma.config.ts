import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// DATABASE_URL (with the database credentials) lives in the gitignored
// `.env.local`, which dotenv/config does not load by default.
loadEnv({ path: '.env.local' });

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  migrations: {
    path: './migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
