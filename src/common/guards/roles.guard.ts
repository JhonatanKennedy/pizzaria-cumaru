import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { USER_REPOSITORY } from '../../users/domain/repositories/user-repository.js';
import type { IUserRepository } from '../../users/domain/repositories/user-repository.js';
import { EUserRole } from '../../users/domain/enums/user-role.js';

export interface IRoleRequirement {
  roles: EUserRole[];
  message?: string;
}

export const ROLES_KEY = 'roles';
export const PUBLIC_KEY = 'isPublic';

export const Roles = (requirement: IRoleRequirement) =>
  SetMetadata(ROLES_KEY, requirement);
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export interface IAuthenticatedPayload {
  sub: number;
  role: EUserRole;
  jti: string;
  exp: number;
}

// Boundary guard enforcing the permission matrix:
//   create orders / add items    Waiter, Manager
//   start / finish item prep     Cook, Manager
//   cancel preparation           Cook, Manager
//   cancel items                 Waiter, Manager
//   advance delivery status      Waiter, Manager
//   close orders                 Manager (message: "Only the manager can close the order")
//   daily earnings report        Manager
//   kitchen queue                Cook, Manager
//   menu / ingredient listings   Waiter, Manager
//   stock and price changes      Manager
//   create / edit / remove items and ingredients, link ingredients  Manager
// Future endpoints MUST declare their roles here and in @Roles.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized');
    }

    const token = authorization.slice('Bearer '.length);
    let payload: IAuthenticatedPayload;
    try {
      payload = await this.jwtService.verifyAsync<IAuthenticatedPayload>(token);
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }

    if (await this.userRepository.isTokenDenied(payload.jti)) {
      throw new UnauthorizedException('Unauthorized');
    }

    const requirement = this.reflector.getAllAndOverride<IRoleRequirement>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requirement && !requirement.roles.includes(payload.role)) {
      throw new ForbiddenException(
        requirement.message ?? 'Access not authorized for your profile',
      );
    }
    return true;
  }
}
