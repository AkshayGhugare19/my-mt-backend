import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { AsyncLogModule } from '@infrastructure/log/async-log.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { BonusModule } from '@modules/bonus/bonus.module';
import { PermissionModule } from '@modules/permission/permission.module';
import { TipController } from '@modules/tip/controller/tip.controller';
import { TipService } from '@modules/tip/service/tip.service';
import { TipStrategy } from '@modules/tip/strategy/tip.strategy';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { UserConfigModule } from '@modules/user-config/user-config.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BonusModule,
    BalanceModule,
    UserConfigModule,
    PrismaModule,
    PermissionModule,
    AsyncLogModule,
    TransactionLedgerModule,
  ],
  controllers: [TipController],
  providers: [TipService, TipStrategy],
  exports: [TipService],
})
export class TipModule {}
