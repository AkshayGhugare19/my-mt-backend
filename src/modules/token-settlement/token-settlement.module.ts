import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { PermissionModule } from '@modules/permission/permission.module';
import { TokenSettlementRequestAdminController } from '@modules/token-settlement/controller/token-settlement-admin.controller';
import { TokenSettlementController } from '@modules/token-settlement/controller/token-settlement.controller';
import { TokenSettlementService } from '@modules/token-settlement/service/token-settlement.service';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    TransactionLedgerModule,
    BalanceModule,
    PermissionModule,
    NotificationsModule,
  ],
  controllers: [
    TokenSettlementController,
    TokenSettlementRequestAdminController,
  ],
  providers: [TokenSettlementService],
  exports: [TokenSettlementService],
})
export class TokenSettlementModule { }
