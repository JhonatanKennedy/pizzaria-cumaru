import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IUserRepository } from '../domain/repositories/user-repository.js';
import { User } from '../domain/entities/user.js';
import { EUserRole } from '../domain/enums/user-role.js';

const USER_ROLES = new Set<string>(Object.values(EUserRole));

function parseRole(value: string): EUserRole {
  if (!USER_ROLES.has(value)) {
    throw new Error(`Unknown user role: ${value}`);
  }
  return value as EUserRole;
}

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByLogin(login: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: login } });
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.getId() },
      data: {
        failedAttempts: user.getFailedAttempts(),
        lockedUntil: user.getLockedUntil() ?? null,
      },
    });
  }

  async denyToken(jti: string, expiresAt: Date): Promise<void> {
    await this.prisma.deniedToken.upsert({
      where: { jti },
      update: { expiresAt },
      create: { jti, expiresAt },
    });
  }

  async isTokenDenied(jti: string): Promise<boolean> {
    const row = await this.prisma.deniedToken.findUnique({ where: { jti } });
    return row !== null;
  }

  private toDomain(row: {
    id: number;
    email: string;
    passwordHash: string;
    role: string;
    failedAttempts: number;
    lockedUntil: Date | null;
  }): User {
    return User.create({
      id: row.id,
      login: row.email,
      passwordHash: row.passwordHash,
      role: parseRole(row.role),
      failedAttempts: row.failedAttempts,
      lockedUntil: row.lockedUntil ?? undefined,
    });
  }
}
