import { RolesGuard, PUBLIC_KEY, ROLES_KEY } from './roles.guard.js';
import type { IUserRepository } from '../../users/domain/repositories/user-repository.js';
import { ETokenKind } from '../../users/domain/enums/token-kind.js';
import { EUserRole } from '../../users/domain/enums/user-role.js';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

function makeExecutionContext(headers: { authorization?: string } = {}) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as never;
}

function makeGuard(
  overrides: {
    public?: boolean;
    requirement?: { roles: EUserRole[]; message?: string };
    denied?: boolean;
    payload?: object;
    verifyError?: boolean;
  } = {},
) {
  const reflector = {
    getAllAndOverride: vi.fn((key: symbol) => {
      if (key === PUBLIC_KEY) return overrides.public ?? false;
      if (key === ROLES_KEY) return overrides.requirement;
      return undefined;
    }),
  } as unknown as Reflector;
  const jwtService = {
    signAsync: vi.fn(),
    verifyAsync: vi.fn(async () => {
      if (overrides.verifyError) {
        throw new Error('invalid');
      }
      return (
        overrides.payload ?? {
          sub: 1,
          role: EUserRole.COOK,
          jti: 'jti-1',
          exp: 0,
          typ: ETokenKind.ACCESS,
        }
      );
    }),
  } as unknown as JwtService;
  const userRepository = {
    findById: vi.fn(async () => null),
    findByLogin: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    denyToken: vi.fn(async () => undefined),
    isTokenDenied: vi.fn(async () => overrides.denied ?? false),
  } as unknown as IUserRepository;
  return new RolesGuard(reflector, jwtService, userRepository);
}

describe('RolesGuard', () => {
  it('should allow public routes without a token', async () => {
    const guard = makeGuard({ public: true });

    await expect(guard.canActivate(makeExecutionContext())).resolves.toBe(true);
  });

  it('should refuse requests without a bearer token', async () => {
    const guard = makeGuard();

    await expect(
      guard.canActivate(makeExecutionContext()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should refuse requests with an invalid token', async () => {
    const guard = makeGuard({ verifyError: true });

    await expect(
      guard.canActivate(
        makeExecutionContext({ authorization: 'Bearer broken' }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should refuse a denylisted token', async () => {
    const guard = makeGuard({ denied: true });

    await expect(
      guard.canActivate(
        makeExecutionContext({ authorization: 'Bearer token' }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should refuse a token whose kind is not access', async () => {
    const guard = makeGuard({
      payload: {
        sub: 1,
        role: EUserRole.COOK,
        jti: 'jti-1',
        exp: 0,
        typ: ETokenKind.REFRESH,
      },
    });

    await expect(
      guard.canActivate(
        makeExecutionContext({ authorization: 'Bearer token' }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should refuse a token with no kind claim', async () => {
    const guard = makeGuard({
      payload: { sub: 1, role: EUserRole.COOK, jti: 'jti-1', exp: 0 },
    });

    await expect(
      guard.canActivate(
        makeExecutionContext({ authorization: 'Bearer token' }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should refuse a role not in the requirement with the default message', async () => {
    const guard = makeGuard({
      requirement: { roles: [EUserRole.MANAGER] },
      payload: {
        sub: 1,
        role: EUserRole.WAITER,
        jti: 'jti-1',
        exp: 0,
        typ: ETokenKind.ACCESS,
      },
    });

    const refusal = guard.canActivate(
      makeExecutionContext({ authorization: 'Bearer token' }),
    );
    await expect(refusal).rejects.toBeInstanceOf(ForbiddenException);
    await refusal.catch((error: ForbiddenException) => {
      expect(error.message).toBe('Access not authorized for your profile');
    });
  });

  it('should use the custom refusal message when declared', async () => {
    const guard = makeGuard({
      requirement: {
        roles: [EUserRole.MANAGER],
        message: 'Only the manager can close the order',
      },
      payload: {
        sub: 1,
        role: EUserRole.WAITER,
        jti: 'jti-1',
        exp: 0,
        typ: ETokenKind.ACCESS,
      },
    });

    const refusal = guard.canActivate(
      makeExecutionContext({ authorization: 'Bearer token' }),
    );
    await expect(refusal).rejects.toBeInstanceOf(ForbiddenException);
    await refusal.catch((error: ForbiddenException) => {
      expect(error.message).toBe('Only the manager can close the order');
    });
  });

  it('should allow a role listed in the requirement', async () => {
    const guard = makeGuard({
      requirement: { roles: [EUserRole.COOK, EUserRole.MANAGER] },
    });

    await expect(
      guard.canActivate(
        makeExecutionContext({ authorization: 'Bearer token' }),
      ),
    ).resolves.toBe(true);
  });

  it('should allow an authenticated request with no role requirement', async () => {
    const guard = makeGuard();

    await expect(
      guard.canActivate(
        makeExecutionContext({ authorization: 'Bearer token' }),
      ),
    ).resolves.toBe(true);
  });
});
