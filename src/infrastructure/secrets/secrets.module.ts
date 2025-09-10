import { Module } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
