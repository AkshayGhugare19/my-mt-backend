import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SocialAuthController } from './controller/social-auth.controller';
import { SocialAuthService } from './services/social-auth.service';
import { SocialAuthStrategy } from './straregies/social-auth.strategy';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { UserService } from '@modules/user/services/user.service';
import { BalanceModule } from '@modules/balance/balance.module';
import { RoleModule } from '@modules/role/role.module';
import { GamesModule } from '@modules/games/games.module';
import { UserCodeService } from '@modules/user/services/user-code.service';
import { MailingModule } from '@infrastructure/mail/mailing.module';
import { GamanzaEngageModule } from '@external/gamanza-engage/gamanza-engage.module';
import { BonusBalanceService } from '@modules/bonus/service/bonus-balance.service';
import { BetParser } from '@modules/bonus/handlers/strategy';
import { ConsumerHandler } from '@modules/bonus/handlers/consumer/handler';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { BonusTriggerService } from '@modules/bonus/service/bonus-trigger.service';
import { ConfigService } from '@nestjs/config';
import { RoleService } from '@modules/role/service/role.service';
import { UserConfigService } from '@modules/user-config/service/user-config.service';
import { BetRollbackScoringStrategy } from '@modules/bonus/handlers/consumer/strategy/rollback-scoring.strategy';
import { SportsBookStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/sports-book.strategy';
import { SportsExchangeStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/sports-exchange.strategy';
import { GameStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/games.strategy';
import { DefaultScoreStrategy } from '@modules/bonus/handlers/consumer/strategy/default-score.strategy';
import { CoreAuthModule } from '../core/core-auth.module';

const BonusAsyncLocalStorageProvider = {
  provide: 'BONUS_ASYNC_LOCAL_STORAGE_PROVIDER', // string token used in AsyncLogService
  useValue: {}, // replace with the actual storage instance if needed
};

@Module({
  imports: [
    BalanceModule,
    RoleModule,
    GamesModule,
    MailingModule,
    GamanzaEngageModule,
    CoreAuthModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [SocialAuthController],
  providers: [
    SocialAuthService,
    SocialAuthStrategy,
    PrismaService,
    UserService,
    UserCodeService,
    BonusBalanceService,
    BetParser,
    ConsumerHandler,
    TransactionLedgerService,
    AsyncLogService,
    BonusTriggerService,
    ConfigService,
    RoleService,
    UserConfigService,
    BetRollbackScoringStrategy,
    SportsBookStrategy,
    SportsExchangeStrategy,
    GameStrategy,
    DefaultScoreStrategy,
    BonusAsyncLocalStorageProvider,
  ],
  exports: [
    SocialAuthService,
    UserService,
    BetParser,
    DefaultScoreStrategy,
  ],
})
export class SocialAuthModule {}
