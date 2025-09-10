import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { PermissionModule } from '@modules/permission/permission.module';
import { TokenIssueAdminController } from '@modules/token-issue/controller/token-issue-admin.controller';
import { TokenIssueController } from '@modules/token-issue/controller/token-issue.controller';
import { TokenIssueService } from '@modules/token-issue/service/token-issue.service';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    BalanceModule,
    TransactionLedgerModule,
    PermissionModule,
    NotificationsModule,
  ],
  controllers: [TokenIssueController, TokenIssueAdminController],
  providers: [TokenIssueService],
  exports: [TokenIssueService],
})
export class TokenIssueModule {}
