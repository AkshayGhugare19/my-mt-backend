import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { AdminAvatarController } from '@modules/avatar/controller/avatar.controller';
import { AdminAvatarService } from '@modules/avatar/service/avatar.service';
import { MediaModule } from '@modules/media';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [AdminAvatarController],
  providers: [AdminAvatarService],
})
export class AvatarModule {}
