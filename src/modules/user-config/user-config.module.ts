import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { UserConfigService } from '@modules/user-config/service/user-config.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  providers: [UserConfigService],
  exports: [UserConfigService],
})
export class UserConfigModule {}
