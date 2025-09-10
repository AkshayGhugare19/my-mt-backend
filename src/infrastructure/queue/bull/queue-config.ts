import { ONE_DAY_IN_SECONDS } from '@common/constants';
import { ENV } from '@common/env';
import { BullRootModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export const bullQueueConfig = (
  configService: ConfigService,
): BullRootModuleOptions => {
  const port = configService.get(ENV.REDIS_PORT);
  const host = configService.get(ENV.REDIS_HOST);
  const password = configService.get(ENV.REDIS_PASSWORD) || undefined;
  const username = configService.get(ENV.REDIS_USERNAME) || undefined;
  const db = configService.get(ENV.REDIS_DB) || undefined;
  const connectionOptions = { host, port, password, username, db };

  return {
    redis: {
      ...connectionOptions,
      lazyConnect: false,
      tls: configService.get(ENV.NODE_ENV) === 'production' ? {} : undefined,
    },
  };
};

export const defaultJobConfig = {
  removeOnComplete: true,
  removeOnFail: {
    age: ONE_DAY_IN_SECONDS,
    count: 5000,
  },
};
