import { Module } from '@nestjs/common';
import { AuthenticationController } from './controller/authentication.controller';
import { CredentialsAuthModule } from '@modules/authentication/credentials/credentials-auth.module';
import { WalletAuthModule } from '@modules/authentication/wallet/wallet-auth.module';
import { Web3AuthModule } from '@modules/authentication/web3auth/web3auth.module';
import { CoreAuthModule } from '@modules/authentication/core/core-auth.module';
import { HttpModule } from '@nestjs/axios';
import { WalletModule } from '@modules/wallet/wallet.module';
import { EvenBetModule } from '@modules/betting-providers/evenbet/evenbet.module';
import { SocialAuthModule } from './social/social-auth.module';

@Module({
  imports: [
    CredentialsAuthModule,
    WalletAuthModule,
    Web3AuthModule,
    CoreAuthModule,
    WalletModule,
    HttpModule,
    EvenBetModule,
    SocialAuthModule
  ],
  controllers: [AuthenticationController],
  providers: [],
  exports: [CoreAuthModule],
})
export class AuthenticationModule {}
