import { RedlockClient } from '@infrastructure/lock/redlock-client';
import { RedlockBaseModule } from '@infrastructure/lock/redlock.config';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [RedlockClient, AtomicLock],
  exports: [RedlockClient, AtomicLock],
})
export class RedlockModule extends RedlockBaseModule {}
