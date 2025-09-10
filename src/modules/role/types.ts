import { Permission, Role } from '@prisma/client';

export type RoleWithPermissions = Role & {
  rolePermission: {
    permission: Permission;
  }[];
};
