import { PrismaUserRepository } from './prisma-user-repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import { User } from '../domain/entities/user.js';
import { EUserRole } from '../domain/enums/user-role.js';

// This adapter's contract has two halves: what it makes of the rows Prisma
// hands back, and what it asks Prisma for. Both are checked here against a
// double, so the suite says exactly what the adapter promises and no more —
// whether Postgres honours the `where` is Prisma's to get right, and the e2e
// suite is where a real database still has a say.

const USER_ID = 1;
const LOGIN = 'joao.garcom';
const PASSWORD_HASH = 'hashed';
const ATTEMPT_AT = new Date(2026, 8, 7, 13);
const LOCKED_UNTIL = new Date(2026, 8, 7, 13, 15);
const JTI = 'token-1';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type TUserRow = Prisma.UserGetPayload<Record<string, never>>;
type TDeniedTokenRow = Prisma.DeniedTokenGetPayload<Record<string, never>>;

function makeUserRow(overrides: Partial<TUserRow> = {}): TUserRow {
  return {
    id: USER_ID,
    email: LOGIN,
    name: 'João',
    role: EUserRole.WAITER,
    passwordHash: PASSWORD_HASH,
    failedAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

function makeUser(overrides: Partial<TUserRow> = {}): User {
  const row = makeUserRow(overrides);
  return User.create({
    id: row.id,
    login: row.email,
    passwordHash: row.passwordHash,
    role: EUserRole.WAITER,
    failedAttempts: row.failedAttempts,
    lockedUntil: row.lockedUntil ?? undefined,
  });
}

function makePrismaDouble() {
  return {
    user: {
      findUnique: vi.fn(
        async (_args: Prisma.UserFindUniqueArgs): Promise<TUserRow | null> =>
          null,
      ),
      update: vi.fn(async (_args: Prisma.UserUpdateArgs): Promise<TUserRow> =>
        makeUserRow(),
      ),
    },
    deniedToken: {
      findUnique: vi.fn(
        async (
          _args: Prisma.DeniedTokenFindUniqueArgs,
        ): Promise<TDeniedTokenRow | null> => null,
      ),
      upsert: vi.fn(
        async (_args: Prisma.DeniedTokenUpsertArgs): Promise<void> => undefined,
      ),
    },
  };
}

type TPrismaDouble = ReturnType<typeof makePrismaDouble>;

function makeRepository(double: TPrismaDouble): PrismaUserRepository {
  return new PrismaUserRepository(double as unknown as PrismaService);
}

describe('PrismaUserRepository', () => {
  it('should read the login out of the email column', async () => {
    const double = makePrismaDouble();
    double.user.findUnique.mockResolvedValue(makeUserRow());
    const repository = makeRepository(double);

    const found = await repository.findByLogin(LOGIN);

    expect(double.user.findUnique).toHaveBeenCalledWith({
      where: { email: LOGIN },
    });
    expect(found?.getId()).toBe(USER_ID);
    expect(found?.getLogin()).toBe(LOGIN);
    expect(found?.getRole()).toBe(EUserRole.WAITER);
  });

  it('should return null for an unknown login', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);

    expect(await repository.findByLogin('nobody')).toBeNull();
  });

  it('should refuse a row carrying an unknown role', async () => {
    const double = makePrismaDouble();
    double.user.findUnique.mockResolvedValue(makeUserRow({ role: 'Owner' }));
    const repository = makeRepository(double);

    await expect(repository.findByLogin(LOGIN)).rejects.toThrow(
      'Unknown user role: Owner',
    );
  });

  it('should read the lockout state off the row', async () => {
    const double = makePrismaDouble();
    double.user.findUnique.mockResolvedValue(
      makeUserRow({ failedAttempts: 2, lockedUntil: LOCKED_UNTIL }),
    );
    const repository = makeRepository(double);

    const found = await repository.findByLogin(LOGIN);

    expect(found?.getFailedAttempts()).toBe(2);
    expect(found?.getLockedUntil()?.getTime()).toBe(LOCKED_UNTIL.getTime());
  });

  it('should write the attempt count back to the row', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);
    const user = makeUser();
    user.registerFailedAttempt(ATTEMPT_AT);

    await repository.save(user);

    expect(double.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { failedAttempts: 1, lockedUntil: null },
    });
  });

  it('should write the lockout instant once the attempts run out', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);
    const user = makeUser();
    for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      user.registerFailedAttempt(ATTEMPT_AT);
    }

    await repository.save(user);

    expect(double.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: {
        failedAttempts: 0,
        lockedUntil: new Date(ATTEMPT_AT.getTime() + LOCKOUT_MS),
      },
    });
  });

  it('should track denied tokens', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);

    await repository.denyToken(JTI, LOCKED_UNTIL);

    expect(double.deniedToken.upsert).toHaveBeenCalledWith({
      where: { jti: JTI },
      update: { expiresAt: LOCKED_UNTIL },
      create: { jti: JTI, expiresAt: LOCKED_UNTIL },
    });
  });

  it('should report a denylisted token as denied', async () => {
    const double = makePrismaDouble();
    double.deniedToken.findUnique.mockResolvedValue({
      jti: JTI,
      expiresAt: LOCKED_UNTIL,
    });
    const repository = makeRepository(double);

    expect(await repository.isTokenDenied(JTI)).toBe(true);
    expect(double.deniedToken.findUnique).toHaveBeenCalledWith({
      where: { jti: JTI },
    });
  });

  it('should report an unlisted token as allowed', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);

    expect(await repository.isTokenDenied('other')).toBe(false);
  });
});
