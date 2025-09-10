import { ENV } from '@common/env';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UmiProviderSymbol } from './symbols';

export const UmiProvider: Provider = {
  provide: UmiProviderSymbol,
  useFactory: (configService: ConfigService) => {
    return createUmi(configService.getOrThrow<string>(ENV.SOLANA_RPC_URL));
  },
  inject: [ConfigService],
};
