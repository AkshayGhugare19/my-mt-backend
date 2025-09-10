import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BetService } from '@modules/bet/service/bet.service';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { forwardRef, Module } from '@nestjs/common';
import { BetReportsService } from './service/bet-reports.service';
import { PermissionModule } from '@modules/permission/permission.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { BetsEventHandler } from './event/handler';

@Module({
  imports: [
    PrismaModule,
    TransactionLedgerModule,
    PermissionModule,
    forwardRef(() => BalanceModule),
  ],
  controllers: [],
  providers: [BetService, BetReportsService, BetsEventHandler],
  exports: [BetService, BetReportsService],
})
export class BetModule {}
