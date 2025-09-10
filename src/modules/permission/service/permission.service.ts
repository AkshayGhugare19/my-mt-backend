import { ONE_DAY_IN_SECONDS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { CacheKeys } from '@infrastructure/cache/enum/cache-keys.enum';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Permission } from '@modules/permission/enum/permission.enum';
import { Roles } from '@modules/role/enum/role.enum';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Permission as PrismaPermission } from '@prisma/client';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async getAllPermissions(): Promise<PrismaPermission[]> {
    return this.prismaService.permission.findMany();
  }

  async getRolePermissions(roleId: number): Promise<PrismaPermission[]> {
    return this.prismaService.permission.findMany({
      where: {
        rolePermissions: {
          some: {
            roleId,
          },
        },
      },
    });
  }

  async updateRolePermissions(
    roleId: number,
    permissions: string[],
  ): Promise<PrismaPermission[]> {
    await this.verifyUpdatePermissionRole(roleId);
    const permissionIds = await this.prismaService.permission.findMany({
      where: {
        name: {
          in: permissions,
        },
      },
      select: {
        id: true,
      },
    });

    if (permissionIds.length !== permissions.length) {
      throw new BadRequestException(ErrorMessages.INVALID_PERMISSIONS_PROVIDED);
    }

    const rolePermissions = await this.prismaService.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    const nonEditablePermissions = rolePermissions.filter(
      (rolePermission) => !rolePermission.permission.isEditable,
    );
    const permissionsSet = new Set([
      ...nonEditablePermissions.map((p) => p.permission.id),
      ...permissionIds.map((p) => p.id),
    ]);

    await this.prismaService.$transaction(async (transactionManager) => {
      await transactionManager.rolePermission.deleteMany({
        where: { roleId },
      });
      await transactionManager.rolePermission.createMany({
        data: [...permissionsSet].map((permission) => ({
          roleId,
          permissionId: permission,
        })),
      });
    });
    await this.invalidateAllPermissionsCache();
    return this.getRolePermissions(roleId);
  }

  private async verifyUpdatePermissionRole(roleId: number): Promise<void> {
    const role = await this.prismaService.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new BadRequestException(ErrorMessages.ROLE_NOT_FOUND);
    }

    if (role.name === Roles.SUPER_MASTER) {
      throw new ForbiddenException(
        ErrorMessages.CANNOT_EDIT_SUPER_MASTER_PERMISSIONS,
      );
    }
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const cachedPermissions = await this.redis.hget(
      CacheKeys.USER_PERMISSIONS,
      userId,
    );

    if (cachedPermissions) {
      return JSON.parse(cachedPermissions);
    }

    const userPermissions = await this.prismaService.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: { rolePermission: { include: { permission: true } } },
        },
      },
    });

    const permissions = <string[]>[];

    for (const userPermission of userPermissions) {
      for (const rolePermission of userPermission.role.rolePermission) {
        permissions.push(rolePermission.permission.name);
      }
    }

    const keyExists = await this.redis.exists(CacheKeys.USER_PERMISSIONS);

    await this.redis.hset(CacheKeys.USER_PERMISSIONS, {
      [userId]: JSON.stringify(permissions),
    });

    // If the key doesn't exist, set the expiration time as this is the first time the key is being set
    if (!keyExists) {
      await this.redis.expire(CacheKeys.USER_PERMISSIONS, ONE_DAY_IN_SECONDS);
    }

    return permissions as Permission[];
  }

  public async validateUserAllPermissions(
    uid: string,
    requiredPermissions: Permission[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(uid);
    const userPermissionsSet = new Set(userPermissions);
    for (const permission of requiredPermissions) {
      if (!userPermissionsSet.has(permission)) return false;
    }

    return true;
  }

  public async refreshUserPermissions(userId: string): Promise<void> {
    await this.redis.hdel(CacheKeys.USER_PERMISSIONS, userId);
    await this.getUserPermissions(userId);
  }

  public async invalidateUserPermissions(userId: string): Promise<void> {
    await this.redis.hdel(CacheKeys.USER_PERMISSIONS, userId);
  }

  private async invalidateAllPermissionsCache(): Promise<void> {
    await this.cacheService.del(CacheKeys.USER_PERMISSIONS);
  }
}
