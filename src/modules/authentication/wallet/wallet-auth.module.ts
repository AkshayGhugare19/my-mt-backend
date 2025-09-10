import { CoreAuthModule } from '@modules/authentication/core/core-auth.module';
import { WalletAuthController } from '@modules/authentication/wallet/controller/auth.controller';
import { WalletAuthService } from '@modules/authentication/wallet/service/wallet-auth.service';
import { EvenBetModule } from '@modules/betting-providers/evenbet/evenbet.module';
import { UserModule } from '@modules/user/user.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { Module } from '@nestjs/common';

@Module({
  controllers: [WalletAuthController],
  imports: [UserModule, CoreAuthModule, WalletModule, EvenBetModule],
  providers: [WalletAuthService],
  exports: [WalletAuthService],
})
export class WalletAuthModule {}
