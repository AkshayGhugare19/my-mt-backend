import { Module } from '@nestjs/common';
import { WithdrawalController } from './controller/withdrawal.controller';
import { WithdrawalService } from './service/withdrawal.service';
import { UserModule } from '@modules/user/user.module';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { BullModule } from '@nestjs/bull';
import { BalanceModule } from '@modules/balance/balance.module';
import { RedlockModule } from '@infrastructure/lock/redlock.module';
import { WithdrawalAdminController } from '@modules/withdrawal/controller/withdrawal-admin.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { PermissionModule } from '@modules/permission/permission.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { WithdrawalsEventHandler } from './events/handler';
import { WithdrawalRepository } from '@modules/withdrawal/repository/withdrawal.repository';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    BalanceModule,
    TransactionLedgerModule,
    RedlockModule,
    PermissionModule,
    BullModule.registerQueue({ name: QueuesDefinition.WITHDRAW_QUEUE.name }),
    NotificationsModule,
  ],
  exports: [WithdrawalService],
  controllers: [WithdrawalController, WithdrawalAdminController],
  providers: [WithdrawalService, WithdrawalsEventHandler, WithdrawalRepository],
})
export class WithdrawalModule {}
