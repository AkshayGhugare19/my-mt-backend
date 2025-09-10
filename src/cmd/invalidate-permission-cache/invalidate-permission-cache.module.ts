import { Module } from '@nestjs/common';
import { InvalidatePermissionCacheCommand } from './invalidate-permission-cache.command';

@Module({
  imports: [],
  providers: [InvalidatePermissionCacheCommand],
  exports: [InvalidatePermissionCacheCommand],
})
export class InvalidatePermissionCacheModule {}
