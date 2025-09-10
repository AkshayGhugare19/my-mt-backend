import { JwtPayload } from '@modules/authentication/types';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const routeRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    const roles = this.reflector.get<string[]>('roles', context.getClass());

    if (!roles && !routeRoles) {
      return true;
    }
    const rolesToCheck = [...(routeRoles || []), ...(roles || [])];
    const request = context.switchToHttp().getRequest();
    const user = <JwtPayload>request.user;
    const hasRole = (): boolean =>
      !rolesToCheck.length || rolesToCheck.includes(user.role);
    return user && user.role && hasRole();
  }
}
