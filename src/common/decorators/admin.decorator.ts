import { IS_ADMIN } from '@common/constants';
import { Roles } from '@modules/role/enum/role.enum';
import { JwtAdminGuard } from '@modules/authentication/credentials/guard/jwt-admin.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { RoleGuard } from '@modules/authentication/core/guards/role.guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Admin(
  roles: (typeof Roles.MASTER | typeof Roles.SUPER_MASTER)[],
): any {
  return applyDecorators(
    SetMetadata('roles', roles),
    SetMetadata(IS_ADMIN, true),
    UseGuards(JwtAdminGuard, RoleGuard),
  );
}
