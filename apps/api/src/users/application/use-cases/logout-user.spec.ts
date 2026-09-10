import { LogoutUserUseCase } from './logout-user.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { JwtService } from '@nestjs/jwt';

describe('LogoutUserUseCase', () => {
  it('should denylist the token with its expiry', async () => {
    const denyToken = vi.fn(async () => undefined);
    const repository = {
      findById: vi.fn(async () => null),
      findByLogin: vi.fn(async () => null),
      save: vi.fn(async () => undefined),
      denyToken,
      isTokenDenied: vi.fn(async () => false),
    } as unknown as IUserRepository;
    const jwtService = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(async () => ({ jti: 'jti-1', exp: 1750000000 })),
    } as unknown as JwtService;
    const useCase = new LogoutUserUseCase(repository, jwtService);

    await useCase.execute({ token: 'some-token' });

    expect(denyToken).toHaveBeenCalledWith(
      'jti-1',
      new Date(1750000000 * 1000),
    );
  });
});
