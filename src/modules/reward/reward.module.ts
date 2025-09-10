import { RewardService } from '@modules/reward/service/reward.service';
import { RewardAdminController } from '@modules/reward/controller/reward-admin.controller';
import { RewardController } from '@modules/reward/controller/reward.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { PermissionModule } from '@modules/permission/permission.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { UserModule } from '@modules/user/user.module';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    PermissionModule,
    BalanceModule,
    TransactionLedgerModule,
    NotificationsModule,
  ],
  controllers: [RewardController, RewardAdminController],
  providers: [RewardService],
})
export class RewardModule {}
