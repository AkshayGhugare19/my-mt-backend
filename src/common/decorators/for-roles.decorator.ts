import { RoleGuard } from '@modules/authentication/core/guards/role.guard';
import { Role } from '@modules/role/enum/role.enum';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ForRoles(roles: Role[]): any {
  return applyDecorators(SetMetadata('roles', roles), UseGuards(RoleGuard));
}
