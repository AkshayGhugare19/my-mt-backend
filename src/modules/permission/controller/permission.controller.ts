import {
  RequirePermissions,
  allOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { UpdateRolePermissionsDto } from '@modules/permission/dto/update-role-permissions.dto';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @RequirePermissions('admin', allOf(Permissions.READ_PERMISSIONS))
  async get(): Promise<string[]> {
    const permissions = await this.permissionService.getAllPermissions();
    return permissions.reduce((acc, permission) => {
      acc.push(permission.name);
      return acc;
    }, [] as string[]);
  }

  @Get('roles/:id')
  @RequirePermissions('admin', allOf(Permissions.READ_PERMISSIONS))
  async getRolePermissions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<string[]> {
    const permissions = await this.permissionService.getRolePermissions(id);
    return permissions.reduce((acc, permission) => {
      acc.push(permission.name);
      return acc;
    }, [] as string[]);
  }

  @Put('roles/:id')
  @RequirePermissions('admin', allOf(Permissions.EDIT_PERMISSIONS))
  async editRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() { permissions }: UpdateRolePermissionsDto,
  ): Promise<string[]> {
    const updatedPermissions =
      await this.permissionService.updateRolePermissions(id, permissions);
    return updatedPermissions.reduce((acc, permission) => {
      acc.push(permission.name);
      return acc;
    }, [] as string[]);
  }
}
