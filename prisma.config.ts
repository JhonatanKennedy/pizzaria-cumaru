import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  migrations: {
    path: './migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
