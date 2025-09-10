import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { RealtimeModule } from '@infrastructure/realtime/realltime.module';
import { SecretsModule } from '@infrastructure/secrets/secrets.module';
import { AdminController } from '@modules/admin/controller/admin.controller';
import { AdminService } from '@modules/admin/service/admin.service';
import { BalanceModule } from '@modules/balance/balance.module';
import { BetModule } from '@modules/bet/bet.module';
import { DepositModule } from '@modules/deposits/deposit.module';
import { AdminNotificationsController } from '@modules/notifications/controllers/admin-notifications.controller';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { PermissionModule } from '@modules/permission/permission.module';
import { TokenIssueModule } from '@modules/token-issue/token-issue.module';
import { TokenSettlementModule } from '@modules/token-settlement/token-settlement.module';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { UserModule } from '@modules/user/user.module';
import { WithdrawalModule } from '@modules/withdrawal/withdrawal.module';
import { Module } from '@nestjs/common';
import { ReportsController } from './controller/reports.controller';
import { BetAdminController } from '@modules/admin/controller/bet-admin.controller';
import { WalletAdminController } from '@modules/admin/controller/wallet-admin.controller';
import { EvenBetModule } from '@modules/betting-providers/evenbet/evenbet.module';
import { PokerCodesModule } from '@modules/poker-codes/poker-codes.module';
import { RoleModule } from '@modules/role/role.module';
import { FileExporterModule } from '@common/file-exporter';
import { MediaModule } from '@modules/media';

@Module({
  imports: [
    UserModule,
    BalanceModule,
    PrismaModule,
    TokenIssueModule,
    TokenSettlementModule,
    PermissionModule,
    SecretsModule,
    TransactionLedgerModule,
    DepositModule,
    WithdrawalModule,
    BetModule,
    NotificationsModule,
    RealtimeModule,
    EvenBetModule,
    PokerCodesModule,
    RoleModule,
    FileExporterModule,
    MediaModule
  ],
  controllers: [
    AdminController,
    AdminNotificationsController,
    WalletAdminController,
    ReportsController,
    BetAdminController,
  ],
  providers: [AdminService],
})
export class AdminModule {}
