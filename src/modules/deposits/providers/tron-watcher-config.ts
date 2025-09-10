import { ENV } from '@common/env';
import { TRON_DEPOSIT_PUBLIC_KEY_SECRET } from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { TronWatchService } from '@modules/deposits/providers/tron-watcher.provider';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_REDIS_NAMESPACE, getRedisToken } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';

export const TronWatcherProvider: Provider = {
  provide: TronWatchService,
  useFactory: (
    configService: ConfigService,
    redis: Redis,
    secretsService: SecretsService,
  ) => {
    return new TronWatchService({
      lastNonceProvider: {
        getLastBlockTimestamp: async (): Promise<any> => {
          return redis.get(
            await secretsService.getSecretOrFail(
              TRON_DEPOSIT_PUBLIC_KEY_SECRET,
            ),
          );
        },
        setLastBlockTimestamp: async (
          newBlockNumber: number = 0,
        ): Promise<any> => {
          return redis.set(
            await secretsService.getSecretOrFail(
              TRON_DEPOSIT_PUBLIC_KEY_SECRET,
            ),
            newBlockNumber,
          );
        },
      },
      tronApiUrl: configService.getOrThrow<string>(ENV.TRON_HOST_URL),
      tronApiKey: configService.getOrThrow<string>(ENV.TRON_API_KEY),
      usdtContractAddress: configService.getOrThrow<string>(
        ENV.TRON_USDT_CONTRACT_ADDRESS,
      ),
      usdcContractAddress: configService.getOrThrow<string>(
        ENV.TRON_USDC_CONTRACT_ADDRESS,
      ),
    });
  },
  inject: [
    ConfigService,
    getRedisToken(DEFAULT_REDIS_NAMESPACE),
    SecretsService,
  ],
};
