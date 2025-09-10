import { ALL_OF_PERMISSION_REFLECTION_KEY, ANY_OF_PERMISSION_REFLECTION_KEY, IS_ADMIN } from '@common/constants';
import { Permission } from '@modules/permission/enum/permission.enum';
import { SetMetadata, applyDecorators } from '@nestjs/common';

type PermissionDefinition = {
  permissions: Permission[];
  type: 'anyOf' | 'allOf';
}[];

export function anyOf(...permissions: Permission[]): {
  permissions: Permission[];
  type: 'anyOf';
} {
  return { permissions, type: 'anyOf' };
}

export function allOf(...permissions: Permission[]): {
  permissions: Permission[];
  type: 'allOf';
} {
  return { permissions, type: 'allOf' };
}

export function RequirePermissions(
  scope: 'admin' | 'app',
  ...permissions: PermissionDefinition
): any {
  const allOfSet = new Set();
  const anyOfSet = new Set();
  for (const permission of permissions) {
    if (permission.type === 'allOf') {
      permission.permissions.forEach((p) => allOfSet.add(p));
    } else {
      permission.permissions.forEach((p) => anyOfSet.add(p));
    }
  }
  return applyDecorators(
    SetMetadata(ANY_OF_PERMISSION_REFLECTION_KEY, [...anyOfSet]),
    SetMetadata(ALL_OF_PERMISSION_REFLECTION_KEY, [...allOfSet]),
    scope === 'admin'
      ? SetMetadata(IS_ADMIN, true)
      : SetMetadata(IS_ADMIN, false),
  );
}
