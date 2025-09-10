import { ErrorMessages } from '@common/enums/error-messages.enum';
import {
  RequirePermissions,
  allOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { RolePermissionsDto } from '@modules/role/dto/role-permissions.dto';
import { RoleDto } from '@modules/role/dto/role.dto';
import { RoleService } from '@modules/role/service/role.service';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions('admin', allOf(Permissions.READ_ROLES))
  async get(): Promise<RoleDto[]> {
    const roles = await this.roleService.getRoles();
    return roles.map((role) => RoleDto.from(role));
  }

  @Get('permissions')
  @RequirePermissions('admin', allOf(Permissions.READ_PERMISSIONS))
  async getAllRolePermissions(): Promise<RolePermissionsDto[]> {
    const permissions = await this.roleService.getAllRolePermissions();
    return permissions.map((permission) => RolePermissionsDto.from(permission));
  }

  @Get(':id')
  @RequirePermissions('admin', allOf(Permissions.READ_ROLES))
  async getById(@Param('id', ParseIntPipe) id: number): Promise<RoleDto> {
    const role = await this.roleService.getRoleById(id);
    if (!role) throw new NotFoundException(ErrorMessages.ROLE_NOT_FOUND);
    return RoleDto.from(role);
  }
}
