import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { RedisModuleOptions } from '@songkeys/nestjs-redis';

export const redisConfig = (
  configService: ConfigService,
): RedisModuleOptions => {
  if (configService.get(ENV.NODE_ENV) === 'production') {
    const port = configService.get(ENV.REDIS_PORT);
    const host = configService.get(ENV.REDIS_HOST);
    const password = configService.get(ENV.REDIS_PASSWORD);
    const username = configService.get(ENV.REDIS_USERNAME);
    const connectionOptions = { host, port, password, username };
    return {
      config: {
        ...connectionOptions,
        onClientCreated: (): void => {},
        tls: {},
      },
    };
  }
  return {
    config: {
      host: configService.get(ENV.REDIS_HOST),
      port: configService.get(ENV.REDIS_PORT),
      onClientCreated: (): void => {},
    },
  };
};
