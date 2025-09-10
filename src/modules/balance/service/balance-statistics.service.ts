import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { EventNamespace } from '@infrastructure/event/namespace';
import { BetTransactionEvent } from '@modules/bet/event/bet-transaction.event';
import { TransactionTargetBalances } from '@modules/transaction-ledger/enum/target-balance.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class BalanceStatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(EventNamespace.BET_TRANSACTION)
  async updatePlayerWinLoss(betTransaction: BetTransactionEvent): Promise<void> {
    console.groupCollapsed('updatePlayerWinLoss');
    console.log('$$betTransaction', JSON.stringify(betTransaction, null, 2));
    console.groupEnd();
    if (betTransaction.amount.gt(0) && betTransaction.operationType === TransactionOperationTypes.DEBIT &&
      betTransaction.targetBalance === TransactionTargetBalances.ACCOUNT_BALANCE) {
      await this.prisma.balance.update({
        where: {
          userId: betTransaction.userId,
        },
        data: {
          totalLoss: {
            increment: betTransaction.amount,
          },
        },
      });
    }

    if (betTransaction.amount.gt(0) && betTransaction.operationType === TransactionOperationTypes.CREDIT &&
    betTransaction.targetBalance === TransactionTargetBalances.ACCOUNT_BALANCE) {
      await this.prisma.balance.update({
        where: {
          userId: betTransaction.userId,
        },
        data: {
          totalWin: {
            increment: betTransaction.amount,
          },
        },
      });
    }
  }
}
