import { registerErrorParser } from '@common/error-filters/error-parsers';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { BetModule } from '@modules/bet/bet.module';
import { SportsExchangeController } from '@modules/betting-providers/sports-exchange/controller/sports-exchange.controller';
import { SportsExchangeErrorParser } from '@modules/betting-providers/sports-exchange/error/sports-exchange-error.parser';
import { SportsExchangeException } from '@modules/betting-providers/sports-exchange/error/sports-exchange.error';
import { SportsExchangeService } from '@modules/betting-providers/sports-exchange/service/sports-exchange.service';
import { UserModule } from '@modules/user/user.module';
import { Module, OnModuleInit } from '@nestjs/common';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { BonusModule } from '@modules/bonus/bonus.module';
import { HttpProxyModule } from '@infrastructure/proxy/http-proxy.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    HttpProxyModule.register(),
    BetModule,
    BalanceModule,
    BonusModule,
    TransactionLedgerModule,
  ],
  controllers: [SportsExchangeController],
  providers: [SportsExchangeService],
  exports: [SportsExchangeService],
})
export class SportsExchangeModule implements OnModuleInit {
  onModuleInit(): void {
    registerErrorParser(SportsExchangeException.name, SportsExchangeErrorParser);
  }
}
