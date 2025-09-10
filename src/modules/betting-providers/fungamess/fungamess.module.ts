import { registerErrorParser } from '@common/error-filters/error-parsers';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { BetModule } from '@modules/bet/bet.module';
import { fungamessJwtModuleConfig } from '@modules/betting-providers/fungamess/auth/jwt.config';
import { FungamessJwtAuthStrategy } from '@modules/betting-providers/fungamess/auth/jwt.strategy';
import { FungamessController } from '@modules/betting-providers/fungamess/controller/fungamess.controller';
import { FungamessException } from '@modules/betting-providers/fungamess/error/fungamess.error';
import { FungamessErrorParser } from '@modules/betting-providers/fungamess/error/fungamess.error.parser';
import { FungamessFundsService } from '@modules/betting-providers/fungamess/service/funds.service';
import { FungamessService } from '@modules/betting-providers/fungamess/service/fungamess.service';
import { GamesModule } from '@modules/games/games.module';
import { UserModule } from '@modules/user/user.module';
import { HttpModule } from '@nestjs/axios';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    HttpModule,
    UserModule,
    PrismaModule,
    BetModule,
    GamesModule,
    BalanceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: fungamessJwtModuleConfig,
    }),
  ],
  providers: [
    FungamessService,
    FungamessJwtAuthStrategy,
    FungamessFundsService,
  ],
  controllers: [FungamessController],
})
export class FungamessModule implements OnModuleInit {
  onModuleInit(): void {
    registerErrorParser(FungamessException.name, FungamessErrorParser);
  }
}
