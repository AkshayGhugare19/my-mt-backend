import { ENV } from '@common/env';
import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { RedisClientOptions } from '@songkeys/nestjs-redis';
import { redisStore } from 'cache-manager-ioredis-yet';

export const cacheConfig = async (
  configService: ConfigService,
): Promise<CacheModuleOptions<RedisClientOptions>> => {
  const port = configService.get(ENV.REDIS_PORT);
  const host = configService.get(ENV.REDIS_HOST);
  const password = configService.get(ENV.REDIS_PASSWORD) || undefined;
  const username = configService.get(ENV.REDIS_USERNAME) || undefined;
  const db = configService.get(ENV.CACHE_REDIS_DB) || undefined;
  const connectionOptions = { host, port, password, username, db };
  return {
    store: redisStore,
    isGlobal: true,
    lazyConnect: false,
    ...connectionOptions,
    tls: configService.get(ENV.NODE_ENV) === 'production' ? {} : undefined,
  };
};
