import { ENV } from '@common/env';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TronWeb } from 'tronweb';

export const TronWebProvider: Provider = {
  provide: TronWeb,
  useFactory: async (configService: ConfigService) => {
    return new TronWeb({
      fullHost: configService.getOrThrow(ENV.TRON_HOST_URL),
      headers: {
        'TRON-PRO-API-KEY': configService.getOrThrow(ENV.TRON_API_KEY),
      },
    });
  },
  inject: [ConfigService],
};
