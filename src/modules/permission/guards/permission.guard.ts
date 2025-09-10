import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../../authentication/types';
import { PermissionService } from '@modules/permission/service/permission.service';
import { Permission } from '@modules/permission/enum/permission.enum';
import {
  ALL_OF_PERMISSION_REFLECTION_KEY,
  ANY_OF_PERMISSION_REFLECTION_KEY,
} from '@common/constants';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { allOfSet, anyOfSet } = this.getRequestPermissions(context);

    if (!allOfSet.size && !anyOfSet.size) return true;

    const request = context.switchToHttp().getRequest();
    const user = <JwtPayload>request.user;
    const permissions = await this.permissionService.getUserPermissions(
      user.sub,
    );

    return this.verifyRequestPermissions(allOfSet, anyOfSet, permissions);
  }

  private verifyRequestPermissions(
    allOfSet: Set<string>,
    anyOfSet: Set<string>,
    permissions: string[],
  ): boolean {
    if (allOfSet.size) {
      for (const permission of allOfSet) {
        if (!permissions.includes(permission as Permission)) return false;
      }
    }
    if (anyOfSet.size) {
      let found = false;
      for (const permission of anyOfSet) {
        found = !!permissions.find(
          (userPermission) => userPermission === permission,
        );
        if (found) break;
      }
      if (!found) return false;
    }
    return true;
  }

  private getRequestPermissions(context: ExecutionContext): {
    allOfSet: Set<string>;
    anyOfSet: Set<string>;
  } {
    const anyOfRoutePermissions = this.reflector.get<string[]>(
      ANY_OF_PERMISSION_REFLECTION_KEY,
      context.getHandler(),
    );

    const anyOfControllerPermissions = this.reflector.get<string[]>(
      ANY_OF_PERMISSION_REFLECTION_KEY,
      context.getClass(),
    );

    const allOfRoutePermissions = this.reflector.get<string[]>(
      ALL_OF_PERMISSION_REFLECTION_KEY,
      context.getHandler(),
    );

    const allOfControllerPermissions = this.reflector.get<string[]>(
      ALL_OF_PERMISSION_REFLECTION_KEY,
      context.getClass(),
    );

    const allOfSet = new Set<string>([
      ...(allOfRoutePermissions || []),
      ...(allOfControllerPermissions || []),
    ]);

    const anyOfSet = new Set<string>([
      ...(anyOfRoutePermissions || []),
      ...(anyOfControllerPermissions || []),
    ]);
    return { allOfSet, anyOfSet };
  }
}
