import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from './generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

loadEnv({ path: '.env.local' });

const SEED_PASSWORD = 'SenhaSegura123';
const SEED_USERS = [
  { login: 'ana.gerente', name: 'Ana Gerente', role: 'Manager' },
  { login: 'joao.garcom', name: 'João Garçom', role: 'Waiter' },
  { login: 'carlos.cozinha', name: 'Carlos Cozinha', role: 'Cook' },
] as const;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
for (const user of SEED_USERS) {
  await prisma.user.upsert({
    where: { email: user.login },
    update: { name: user.name, role: user.role, passwordHash },
    create: {
      email: user.login,
      name: user.name,
      role: user.role,
      passwordHash,
    },
  });
}

await prisma.$disconnect();
console.log(
  `Seeded ${SEED_USERS.length} users with password "${SEED_PASSWORD}"`,
);
