import { RoleWithPermissions } from '@modules/role/types';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const RolePermissionsSchema = z.object({
  id: z.number(),
  name: z.string(),
  permissions: z.array(z.string()),
});

export class RolePermissionsDto extends createZodDto(RolePermissionsSchema) {
  constructor(data: RolePermissionsDto) {
    super();
    Object.assign(this, data);
  }

  static from(role: RoleWithPermissions): RolePermissionsDto {
    return new RolePermissionsDto({
      id: role.id,
      name: role.name,
      permissions: role.rolePermission.map(
        (rolePermission) => rolePermission.permission.name,
      ),
    });
  }
}
