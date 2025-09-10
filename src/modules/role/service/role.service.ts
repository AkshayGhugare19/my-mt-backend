import { ROLE_IDS } from '@common/constants';
import { PrismaService, PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import { Role, Roles } from '@modules/role/enum/role.enum';
import { RoleWithPermissions } from '@modules/role/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Role as PrismaRole } from '@prisma/client';
import { Cache } from 'cache-manager';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async getRoles(): Promise<PrismaRole[]> {
    return this.prismaService.role.findMany();
  }

  async getAllRolePermissions(): Promise<RoleWithPermissions[]> {
    return this.prismaService.role.findMany({
      select: {
        name: true,
        id: true,
        rolePermission: {
          select: {
            permission: true,
          },
        },
      },
    });
  }

  async getAdminRoleIds(): Promise<number[]> {
    const cachedData = await this.cacheManager.get<number[]>(ROLE_IDS);

    if (cachedData) return cachedData;
    const roleIds = await this.prismaService.role.findMany({
      where: {
        name: {
          in: [
            Roles.MASTER,
            Roles.SUPER_MASTER,
            Roles.RISK_MANAGEMENT,
            Roles.CUSTOMER_SUPPORT,
            Roles.ACCOUNTANT,
            Roles.MARKETING,
            Roles.PARTNER,
            Roles.RISK_MANAGEMENT_TRAINEE,
          ],
        },
      },
      select: {
        id: true,
      },
    });
    return roleIds.map((role) => role.id);
  }

  async getRoleById(id: number): Promise<PrismaRole | null> {
    return this.prismaService.role.findUnique({
      where: { id },
    });
  }

  async getRoleByName(name: Role): Promise<PrismaRole | null> {
    return this.prismaService.role.findUnique({
      where: { name },
    });
  }

  async getRolesByName(names: Role[]): Promise<PrismaRole[]> {
    return this.prismaService.role.findMany({
      where: { name: { in: names } },
    });
  }

  async getRoleByNameOrThrow(name: Role, transactionManager?: PrismaTransactionManager): Promise<PrismaRole> {
    const role = await this.getClient(transactionManager).role.findUnique({
      where: { name },
    });
    if (!role) {
      this.logger.error(`Role with name ${name} not found`);
      throw new InternalServerErrorException();
    }
    return role;
  }

  async getUserRoles(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<PrismaRole[]> {
    return this.getClient(transactionManager)
      .userRole.findMany({
        where: { userId },
        include: { role: true },
      })
      .then((userRoles) => userRoles.map((userRole) => userRole.role));
  }

  private getClient(transactionManager?: PrismaTransactionManager): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
