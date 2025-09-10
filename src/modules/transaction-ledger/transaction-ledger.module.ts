import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { Module, forwardRef } from '@nestjs/common';

@Module({
  imports: [PrismaModule, forwardRef(() => BalanceModule)],
  controllers: [],
  providers: [TransactionLedgerService],
  exports: [TransactionLedgerService],
})
export class TransactionLedgerModule {}
