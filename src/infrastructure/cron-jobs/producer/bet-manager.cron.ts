import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { EventNamespace } from '@infrastructure/event/namespace';
import { BetProvider, BetProviders } from '@modules/bet/enum/bet-providers.enum';
import { BetStatus, BetStatuses } from '@modules/bet/enum/bet-status.enum';
import { BetSettledEvent } from '@modules/bet/event/bet-settled.event';
import { getConsumedBalancesFromBet } from '@modules/bet/util/get-consumed-amount.from-bet';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Bet } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { pointsToUsd } from '@utils/points-to-usd';
import { DateTime } from 'luxon';

@Injectable()
export class BetManagerCron {
  private logger = new Logger(BetManagerCron.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async updateSlotegratorPendingBets(): Promise<void> {
    this.logger.log('Runing updateSlotegratorPendingBets');

    let count = 0;
    while (true) {
      const bet = await this.prismaService.bet.findFirst({
        include: {
          user: true,
        },
        where: {
          status: BetStatuses.PENDING,
          provider: BetProviders.SLOTEGRATOR_GAMES,
          createdAt: {
            lte: DateTime.now().minus({ minutes: 30 }).toJSDate(),
          },
        },
      });

      if (!bet) {
        break;
      }

      count++;

      const updatedBets: (Bet & { user: { partnerMatrixId: number | null; partnerMatrixBtag: string | null } })[] = [];

      await this.prismaService.$transaction(async (transactionManager) => {
        const updatedBet = await transactionManager.bet.update({
          where: {
            id: bet.id,
          },
          data: {
            settlementAmount: -bet.betAmount,
            status: BetStatuses.LOSS,
          },
          include: {
            user: {
              select: {
                partnerMatrixId: true,
                partnerMatrixBtag: true,
              },
            },
          },
        });

        updatedBets.push(updatedBet);
      });
      for (const updatedBet of updatedBets) {
        const { accountBalance, bonusBalance } = getConsumedBalancesFromBet(updatedBet);

        // THERE is no need to emit a bet Transaction event as we do not create a transaction ledger entry here

        this.eventEmitter.emit(
          EventNamespace.BET_SETTLED,
          new BetSettledEvent({
            amount: new Decimal(pointsToUsd(Number(updatedBet.settlementAmount))),
            grossAmount: new Decimal(
              pointsToUsd(
                Number(
                  updatedBet.betAmount.add(updatedBet.settlementAmount as Decimal),
                ),
              ),
            ),
            netAmount: new Decimal(
              pointsToUsd(Number(updatedBet.settlementAmount)),
            ),
            betId: updatedBet.id,
            status: updatedBet.status as BetStatus,
            userId: updatedBet.userId,
            pmId: updatedBet.user.partnerMatrixId || undefined,
            pmBtag: updatedBet.user.partnerMatrixBtag || undefined,
            provider: updatedBet.provider as BetProvider,
            previousBalance: updatedBet.previousBalance,
            transactionId: updatedBet.debitTransactionId,
            consumedAccountBalance: new Decimal(pointsToUsd(Number(accountBalance))),
            consumedBonusBalance: new Decimal(pointsToUsd(Number(bonusBalance))),
            // the user wins nothing as we settling the bet as loss
            bonusBalanceIncrement: new Decimal(0),
            // the user wins nothing as we settling the bet as loss
            accountBalanceIncrement: new Decimal(0),
          }),
        );
      }
    }

    this.logger.log(`Settled ${count} pending bets.`);
  }
}
