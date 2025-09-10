import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { CoreAuthModule } from '@modules/authentication/core/core-auth.module';
import { Web3AuthController } from '@modules/authentication/web3auth/controller/web3auth.controller';
import { Web3AuthService } from '@modules/authentication/web3auth/service/web3auth.service';
import { SocialsProviderValidatorStrategy } from '@modules/authentication/web3auth/guards/strategy/socials-provider-validator.strategy';
import { WalletValidatorStrategy } from '@modules/authentication/web3auth/guards/strategy/wallet-validator.strategy';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { jwtWeb3AuthModuleConfig } from '@modules/authentication/web3auth/strategy/config';
import { WEB3AUTH_JWT_SERVICE } from '@modules/authentication/web3auth/constants';
import { WalletModule } from '@modules/wallet/wallet.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtWeb3AuthModuleConfig,
    }),
  ],
  providers: [
    {
      provide: WEB3AUTH_JWT_SERVICE,
      useExisting: JwtService,
    },
  ],
  exports: [WEB3AUTH_JWT_SERVICE],
})
class Web3AuthJwtModule {}

@Module({
  imports: [UserModule, CoreAuthModule, PrismaModule, Web3AuthJwtModule, WalletModule],
  controllers: [Web3AuthController],
  providers: [
    Web3AuthService,
    SocialsProviderValidatorStrategy,
    WalletValidatorStrategy,
  ],
  exports: [
    Web3AuthService,
    SocialsProviderValidatorStrategy,
    WalletValidatorStrategy,
  ],
})
export class Web3AuthModule {}
