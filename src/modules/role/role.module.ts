import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { PermissionModule } from '@modules/permission/permission.module';
import { RoleController } from '@modules/role/controller/role.controller';
import { RoleService } from '@modules/role/service/role.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, PermissionModule],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
