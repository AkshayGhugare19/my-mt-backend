import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BalanceController } from '@modules/balance/controller/balance.controller';
import { BalanceStatisticsService } from '@modules/balance/service/balance-statistics.service';
import { BalanceService } from '@modules/balance/service/balance.service';
import { BonusModule } from '@modules/bonus/bonus.module';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { Module, forwardRef } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => TransactionLedgerModule),
    BonusModule,
  ],
  controllers: [BalanceController],
  providers: [BalanceService, BalanceStatisticsService],
  exports: [BalanceService],
})
export class BalanceModule {}
