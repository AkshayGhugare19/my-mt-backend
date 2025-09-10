import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { PermissionController } from '@modules/permission/controller/permission.controller';
import { PermissionService } from '@modules/permission/service/permission.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
