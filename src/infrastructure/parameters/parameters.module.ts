import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { ParametersService } from './parameters.service';
import { PermissionModule } from '@modules/permission/permission.module';
import { UserModule } from '@modules/user/user.module';
import { ParametersController } from './parameters.controller';

@Module({
  imports: [PrismaModule, PermissionModule, UserModule],
  providers: [ParametersService],
  exports: [ParametersService],
  controllers: [ParametersController],
})
export class ParametersModule {}
