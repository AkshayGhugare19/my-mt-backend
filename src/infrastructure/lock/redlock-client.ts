import { Provider } from '@nestjs/common';
import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import Redlock from 'redlock';

export const RedlockClient: Provider = {
  provide: Redlock,
  useFactory: async (redis: Redis): Promise<Redlock> => {
    return new Redlock([redis], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
    });
  },
  inject: [getRedisToken(DEFAULT_REDIS_NAMESPACE)],
};
