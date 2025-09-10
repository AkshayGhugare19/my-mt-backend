import { Role } from '@prisma/client';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const RoleSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export class RoleDto extends createZodDto(RoleSchema) {
  constructor(data: Role) {
    super();
    Object.assign(this, data);
  }

  static from(role: Role): RoleDto {
    return new RoleDto({
      id: role.id,
      name: role.name,
    });
  }
}
