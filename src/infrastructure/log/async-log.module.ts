import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BONUS_ASYNC_LOCAL_STORAGE_PROVIDER } from '@modules/bonus/constants';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { Module } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: BONUS_ASYNC_LOCAL_STORAGE_PROVIDER,
      useValue: new AsyncLocalStorage(),
    },
    AsyncLogService,
  ],
  exports: [AsyncLogService],
})
export class AsyncLogModule {}
