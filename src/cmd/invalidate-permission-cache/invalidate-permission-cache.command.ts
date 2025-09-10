import { CacheKeys } from '@infrastructure/cache/enum/cache-keys.enum';
import { Logger } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'invalidate-permission-cache',
})
export class InvalidatePermissionCacheCommand extends CommandRunner {
  private readonly _logger = new Logger(InvalidatePermissionCacheCommand.name);

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {
    super();
  }

  async run(): Promise<void> {
    this._logger.log('invalidating permission cache');
    await this.redis.del(CacheKeys.USER_PERMISSIONS);
    this._logger.log('Permission cache invalidated');
    process.exit(0);
  }
}
