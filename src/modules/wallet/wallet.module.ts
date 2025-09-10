import { TronWebProvider } from '@modules/wallet/providers/tron-web.provider';
import { WalletService } from '@modules/wallet/service/wallet.service';
import { Module } from '@nestjs/common';
import { UmiProvider } from './providers/umi.provider';

@Module({
  imports: [],
  providers: [
    TronWebProvider,
    WalletService,
    UmiProvider
  ],
  exports: [WalletService],
})
export class WalletModule {}
