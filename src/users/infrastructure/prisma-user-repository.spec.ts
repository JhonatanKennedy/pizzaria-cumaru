import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../../prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaUserRepository } from './prisma-user-repository.js';

loadEnv({ path: '.env.local' });

const TEST_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

describe('PrismaUserRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaUserRepository;

  beforeEach(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: TEST_URL }),
    });
    await prisma.deniedToken.deleteMany();
    await prisma.user.deleteMany();
    repository = new PrismaUserRepository(prisma as never);
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should round-trip a user with role and lockout state', async () => {
    const row = await prisma.user.create({
      data: {
        email: 'joao.garcom',
        name: 'João',
        role: 'Waiter',
        passwordHash: 'hashed',
      },
    });

    const found = await repository.findByLogin('joao.garcom');
    expect(found?.getId()).toBe(row.id);
    expect(found?.getRole()).toBe('Waiter');
    expect(found?.getLogin()).toBe('joao.garcom');

    found?.registerFailedAttempt(new Date());
    found?.registerFailedAttempt(new Date());
    await repository.save(found!);

    const reloaded = await repository.findByLogin('joao.garcom');
    expect(reloaded?.getFailedAttempts()).toBe(2);
  });

  it('should return null for an unknown login', async () => {
    expect(await repository.findByLogin('nobody')).toBeNull();
  });

  it('should track denied tokens', async () => {
    const jti = 'token-1';
    const expiresAt = new Date('2026-09-07T13:00:00Z');

    await repository.denyToken(jti, expiresAt);

    expect(await repository.isTokenDenied(jti)).toBe(true);
    expect(await repository.isTokenDenied('other')).toBe(false);
  });
});
