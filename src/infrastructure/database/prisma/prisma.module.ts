import { Module } from '@nestjs/common';
import { DeadlockGuard } from '@infrastructure/database/prisma/utils/deadlock-guard';
import { PrismaServiceProvider } from '@infrastructure/database/prisma/prisma-service.provider';

@Module({
  providers: [PrismaServiceProvider, DeadlockGuard],
  exports: [PrismaServiceProvider, DeadlockGuard],
})
export class PrismaModule {}
