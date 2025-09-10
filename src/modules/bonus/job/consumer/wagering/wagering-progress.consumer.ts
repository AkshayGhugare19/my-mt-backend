import { Process, Processor } from '@nestjs/bull';
import { PrismaService, PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { Job } from 'bull';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionTargetBalances } from '@modules/transaction-ledger/enum/target-balance.enum';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { Decimal } from '@prisma/client/runtime/library';
import {
  ProcessWageringBetCompletedJobData,
  ProcessWageringProgressJobData,
} from '@infrastructure/queue/bull/constants/job-data';
import { WageringProgressProducer } from '@modules/bonus/job/producer/wagering/progress.producer';
import { decimalToNumber } from '@utils/decimal-do-number';
import { UserBonusProgression } from '@prisma/client';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { BonusProgressStatuses, BonusTypes } from '@modules/bonus/enum';
import { bonusProgressionWithBonus } from '@modules/bonus/types';
import { Logger } from '@nestjs/common';
import { BonusNotificationService } from '@modules/bonus/service/bonus-notification.service';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { BetBonusMetadata } from '@modules/bet/types';
import { DateTime } from 'luxon';

@Processor(QueuesDefinition.WAGERING_PROGRESS_QUEUE)
export class WageringProgressConsumer {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logService: AsyncLogService,
    private readonly atomicLock: AtomicLock,
    private readonly wageringProgressProducer: WageringProgressProducer,
    private readonly bonusNotificationService: BonusNotificationService,
    private readonly bonusProgressService: BonusProgressionService,
    private readonly transactionLedgerService: TransactionLedgerService,
  ) {}

  @Process({ name: JOB.BONUS_WAGERING_BET_COMPLETED, concurrency: 5 })
  async processWageringBetCompleted(job: Job<ProcessWageringBetCompletedJobData>): Promise<void> {
    const { wageringProgressIds } = job.data;
    const wageringProgressEligibleToBeCompleted = await this.prismaService.userBonusProgression.findMany({
      where: {
        id: { in: wageringProgressIds },
        status: BonusProgressStatuses.PENDING,
        deletedAt: null,
        bonusBalance: {
          deletedAt: {
            not: null,
          },
        },
      },
    });
    const failedOps = await Promise.all(
      wageringProgressEligibleToBeCompleted.map(async (wageringProgress) => {
        return this.atomicLock
          .withLockGuard(
            async () => {
              if (
                (wageringProgress.expiresAt && wageringProgress.expiresAt < new Date()) ||
                (wageringProgress.isRefillable && !wageringProgress.bonusBalanceId)
              ) {
                await this.bonusProgressService.failWageringProgress(wageringProgress);
                return null;
              }
              if (wageringProgress.currentProgress >= wageringProgress.targetProgress) {
                await this.completeWageringProgressRollover(wageringProgress);
              }
            },
            {
              lockKey: [`bonus:wageringProgress:${wageringProgress.id}`],
              lockDuration: 1000,
              options: {
                retryDelay: 200,
                retryCount: 10,
              },
              conflictErrorMessage: 'Wagering progress is being processed',
              logError: false,
              releaseOnComplete: true,
              releaseOnFail: true,
              context: 'WageringProgressConsumer.processWageringBetCompleted',
            },
          )
          .catch((error) => {
            this.logService.log(
              { error, wageringProgressId: wageringProgress.id },
              'WageringProgressConsumer.processWageringBetCompleted.error',
            );
            return wageringProgress.id;
          })
          .then((wageringProgressId) => {
            this.logService.log(
              { wageringProgressId },
              'WageringProgressConsumer.processWageringBetCompleted.completed',
            );
            return null;
          });
      }),
    );
    const failedWageringProgressIds = failedOps.filter((wageringProgressId) => wageringProgressId !== null);
    if (failedWageringProgressIds.length > 0) {
      await this.wageringProgressProducer.addProcessWagerBetCompleted({
        wageringProgressIds: failedWageringProgressIds,
      });
    }
  }

  @Process({ name: JOB.BONUS_WAGERING_PROGRESS, concurrency: 5 })
  async processWageringProgress(job: Job<ProcessWageringProgressJobData>): Promise<void> {
    const {
      wageringBonusId,
      wageringProgress: wageringProgressAmount,
      bet,
      excludeBonusIds,
      targetBonusTypes,
    } = job.data;

    await this.atomicLock
      .withLockGuard(
        // eslint-disable-next-line sonarjs/cognitive-complexity
        async () => {
          await this.logService.init(async () => {
            const wageringProgress = await this.prismaService.userBonusProgression.findUnique({
              where: { id: wageringBonusId },
              include: bonusProgressionWithBonus.include,
            });

            let excessProgress: Decimal | null = null;
            let newWageringProgress: Decimal | null = null;
            let wageringProgressIncrement: Decimal | null = null;

            if (!wageringProgress) {
              throw new Error(`Wagering progress with id ${wageringBonusId} not found`);
            }

            if (wageringProgress.status !== BonusProgressStatuses.PENDING) {
              throw new Error(`Wagering progress with id ${wageringBonusId} is not pending`);
            }

            const lastIncrement = (bet.metadata as unknown as BetBonusMetadata)?.bonusUsed.find(
              (bonus) => bonus.wageringBonusId === wageringProgress.id,
            )?.progressIncrement;

            if (
              lastIncrement &&
              bet.settlementAmount &&
              new Decimal(bet.settlementAmount).eq(lastIncrement.lastSettledValue)
            ) {
              this.logService.log(
                { wageringProgressId: wageringBonusId, betId: bet.id, betMetadata: bet.metadata },
                'WageringProgressConsumer.processWageringProgress.skipped',
              );
              return;
            }

            if (
              lastIncrement &&
              bet.settlementAmount &&
              !new Decimal(bet.settlementAmount).eq(lastIncrement.lastSettledValue)
            ) {
              wageringProgressIncrement = new Decimal(lastIncrement.progressIncrement).negated();
            }
            if (wageringProgressAmount) {
              wageringProgressIncrement = new Decimal(wageringProgressAmount).plus(wageringProgressIncrement ?? 0);
            }

            if (wageringProgressIncrement) {
              newWageringProgress = new Decimal(wageringProgressIncrement).plus(wageringProgress.currentProgress);
              const computedProgressExcess = newWageringProgress.minus(wageringProgress.targetProgress);

              if (computedProgressExcess.gt(0)) {
                excessProgress = computedProgressExcess;
              }
            }

            // A wagering progress can fail if it is expired or if it is refillable and all it's bonus balance is used up
            // The failWageringProgress method will check if there are any unsettled bets with the same wagering progress
            // If there are, it will not fail the wagering progress
            if (
              (wageringProgress.expiresAt && wageringProgress.expiresAt < new Date()) ||
              (wageringProgress.isRefillable && !wageringProgress.bonusBalanceId)
            ) {
              const { hasPendingBet } = await this.bonusProgressService.failWageringProgress(wageringProgress);
              if (excessProgress) {
                await this.handleProgressExcess(job.data, wageringProgress, excessProgress, [wageringProgress.id]);
              }
              if (hasPendingBet && wageringProgressIncrement) {
                await this.handleProgressExcess(job.data, wageringProgress, wageringProgressIncrement, [
                  wageringProgress.id,
                ]);
              }
              return;
            }

            if (newWageringProgress?.gte(wageringProgress.targetProgress)) {
              const { hasPendingBet } = await this.completeWageringProgressRollover(wageringProgress);
              if (excessProgress) {
                await this.handleProgressExcess(job.data, wageringProgress, excessProgress, [wageringProgress.id]);
              }
              if (hasPendingBet && wageringProgressIncrement) {
                await this.handleProgressExcess(job.data, wageringProgress, wageringProgressIncrement, [
                  wageringProgress.id,
                ]);
              }
            } else if (newWageringProgress) {
              await this.prismaService.$transaction(async (tx) => {
                await tx.userBonusProgression.update({
                  where: { id: wageringBonusId },
                  data: {
                    currentProgress: newWageringProgress.gt(wageringProgress.targetProgress)
                      ? wageringProgress.targetProgress
                      : decimalToNumber(newWageringProgress),
                  },
                });
                const latestMetadata = await tx.bet.findUnique({
                  where: { id: bet.id },
                  select: {
                    metadata: true,
                  },
                });

                if (latestMetadata) {
                  const lastIncrement = (latestMetadata.metadata as unknown as BetBonusMetadata)?.bonusUsed.find(
                    (bonus) => bonus.wageringBonusId === wageringProgress.id,
                  );

                  if (lastIncrement) {
                    lastIncrement.progressIncrement = {
                      progressIncrement: decimalToNumber(new Decimal(wageringProgressAmount ?? 0)),
                      lastSettledValue: decimalToNumber(new Decimal(bet.settlementAmount ?? 0)),
                    };
                  }

                  await tx.bet.update({
                    where: { id: bet.id },
                    data: {
                      metadata: {
                        ...(latestMetadata.metadata as unknown as BetBonusMetadata),
                      },
                    },
                  });
                }
              });
            }
          });
        },
        {
          lockKey: [`bonus:wageringProgress:${wageringBonusId}`],
          lockDuration: 1000,
          options: {
            retryDelay: 200,
            retryCount: 10,
          },
          logError: false,
          conflictErrorMessage: 'Wagering progress is already being processed',
          releaseOnComplete: true,
          releaseOnFail: true,
          context: 'WageringProgressConsumer.processWageringProgress',
        },
      )
      .catch((_e) => {
        console.log(_e);
        Logger.error(
          `Failed To process wagering progress for progressId: ${wageringBonusId} for betId: ${bet.id} with targetBonusTypes: ${targetBonusTypes} and excludeBonusIds: ${excludeBonusIds}`,
          'WageringProgressConsumer.processWageringProgress.error',
        );
      });
  }

  private async handleProgressExcess(
    data: ProcessWageringProgressJobData,
    bonusProgress: UserBonusProgression,
    progressExcess: Decimal,
    excludeBonusIds: string[],
    maxDepth: number = 10,
    currentDepth: number = 0,
  ): Promise<void> {
    if (currentDepth >= maxDepth) {
      Logger.error(
        `Max depth reached for wagering progress with id ${bonusProgress.id}`,
        'WageringProgressConsumer.handleProgressExcess',
      );
      return;
    }
    const { targetBonusTypes } = data;
    // Get the next wagering progress with the same bonus id
    const nextWageringProgress = await this.prismaService.userBonusProgression.findFirst({
      where: {
        userId: bonusProgress.userId,
        status: BonusProgressStatuses.PENDING,
        id: {
          not: {
            in: excludeBonusIds,
          },
        },
        // If targetBonusTypes is provided, we want to find the next wagering progress with the same bonus id
        bonusId: targetBonusTypes ? bonusProgress.bonusId : undefined,
        deletedAt: null,
      },
      include: bonusProgressionWithBonus.include,
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!nextWageringProgress) {
      return;
    }

    const wageringBonusProgressConfigs = this.bonusProgressService.findWageringBonusProgressConfigs(
      data.bet.id,
      nextWageringProgress,
    );

    if (!wageringBonusProgressConfigs) {
      return this.handleProgressExcess(
        data,
        nextWageringProgress,
        progressExcess,
        [...excludeBonusIds, nextWageringProgress.id],
        maxDepth,
        currentDepth + 1,
      );
    }

    const progressExcessToAdd = this.bonusProgressService.computeProgress(
      data.bet,
      wageringBonusProgressConfigs.progressConfig,
    );

    if (!progressExcessToAdd) {
      return this.handleProgressExcess(
        data,
        nextWageringProgress,
        progressExcess,
        [...excludeBonusIds, nextWageringProgress.id],
        maxDepth,
        currentDepth + 1,
      );
    }

    await this.wageringProgressProducer.addProcessWagerProgress({
      wageringBonusId: nextWageringProgress.id,
      wageringProgress: progressExcess,
      bet: data.bet,
      targetBonusTypes: data.targetBonusTypes,
      excludeBonusIds: [bonusProgress.id],
    });
  }

  private async completeWageringProgressRollover(
    wageringProgress: UserBonusProgression,
  ): Promise<{ hasPendingBet: boolean }> {
    const bonusConfig = await this.prismaService.bonus.findFirst({
      where: {
        id: wageringProgress.bonusId,
      },
      select: {
        withdrawAfterRollover: true,
        type: true,
      },
    });

    const withdrawalAfterRolloverOverride = (wageringProgress.configOverride as CouponCodeConfig)
      ?.withdrawAfterRollover;

    const withdrawAfterRollover = withdrawalAfterRolloverOverride ?? bonusConfig?.withdrawAfterRollover;

    const bonusType = (wageringProgress.configOverride as CouponCodeConfig)?.bonusType ?? bonusConfig?.type;

    const rewardReceived = await this.prismaService.$transaction(async (tx) => {
      await tx.userBonusProgression.update({
        where: { id: wageringProgress.id },
        data: {
          status: BonusProgressStatuses.COMPLETED,
          currentProgress: wageringProgress.targetProgress,
          claimedAt: DateTime.now().toJSDate(),
        },
      });

      if (withdrawAfterRollover && bonusType === BonusTypes.INSTANT) {
        return await this.handleWithdrawalAfterRolloverForInstant(wageringProgress, tx);
      } else if (withdrawAfterRollover && bonusType === BonusTypes.PROGRESS) {
        return await this.handleWithdrawalAfterRolloverForProgress(wageringProgress, tx);
      } else {
        return await this.handleNoWithdrawalAfterRollover(wageringProgress, tx);
      }
    });

    if (rewardReceived) {
      await this.sendBonusReceivedNotification(wageringProgress, rewardReceived).catch(() => {});
    }
    return { hasPendingBet: false };
  }

  private async handleWithdrawalAfterRolloverForInstant(
    wageringProgress: UserBonusProgression,
    tx: PrismaTransactionManager,
  ): Promise<Decimal | null> {
    if (!wageringProgress.bonusBalanceId) {
      await tx.userBonusProgression.update({
        where: { id: wageringProgress.id },
        data: { status: BonusProgressStatuses.PENDING },
      });
      return null;
    }

    const currentBonusBalance = await tx.userBonusBalance.findUnique({
      where: { id: wageringProgress.bonusBalanceId! },
    });

    if (!currentBonusBalance) {
      throw new Error(`Bonus balance with id ${wageringProgress.bonusBalanceId} not found`);
    }

    const configOverride = wageringProgress.configOverride as CouponCodeConfig | undefined | null;

    let updatedBalance = currentBonusBalance.balance;

    if (configOverride?.maxWithdrawableAmount) {
      const maxWithdrawableAmount = new Decimal(configOverride.maxWithdrawableAmount ?? 0);
      const withdrawableAmount = Decimal.min(currentBonusBalance.balance, maxWithdrawableAmount);
      updatedBalance = withdrawableAmount;
    }

    const updatedBonusBalance = await tx.userBonusBalance.update({
      where: { id: wageringProgress.bonusBalanceId! },
      data: {
        balance: updatedBalance,
        isWithdrawable: true,
      },
    });

    return updatedBonusBalance.balance;
  }

  private async handleWithdrawalAfterRolloverForProgress(
    wageringProgress: UserBonusProgression,
    tx: PrismaTransactionManager,
  ): Promise<Decimal> {
    await tx.userBonusBalance.create({
      data: {
        userId: wageringProgress.userId,
        bonusId: wageringProgress.bonusId,
        balance: wageringProgress.rewardAmount,
        expiresAt: wageringProgress.expiresAt,
        isWithdrawable: true,
      },
    });

    await this.transactionLedgerService.create(
      {
        amount: wageringProgress.rewardAmount,
        operationType: TransactionOperationTypes.CREDIT,
        counterParty: TransactionCounterParties.WAGERING_BONUS,
        referenceId: wageringProgress.id.toString(),
        userId: wageringProgress.userId,
        status: TransactionStatuses.SUCCESS,
        targetBalance: TransactionTargetBalances.BONUS_BALANCE,
      },
      tx,
    );
    return wageringProgress.rewardAmount;
  }

  private async handleNoWithdrawalAfterRollover(
    wageringProgress: UserBonusProgression,
    tx: PrismaTransactionManager,
  ): Promise<Decimal | null> {
    let expiryTime = (wageringProgress.configOverride as CouponCodeConfig)?.bonusExpiryTime;

    if (!expiryTime) {
      const bonus = await tx.bonus.findUnique({
        where: { id: wageringProgress.bonusId },
      });

      expiryTime = bonus?.bonusExpiryTime ?? undefined;
    }

    const bonusBalance = await tx.userBonusBalance.create({
      data: {
        userId: wageringProgress.userId,
        bonusId: wageringProgress.bonusId,
        balance: wageringProgress.rewardAmount,
        expiresAt: expiryTime ? new Date(Date.now() + expiryTime) : null,
      },
    });

    await tx.userBonusProgression.update({
      where: { id: wageringProgress.id },
      data: { bonusBalanceId: bonusBalance.id },
    });

    await this.transactionLedgerService.create(
      {
        amount: wageringProgress.rewardAmount,
        operationType: TransactionOperationTypes.CREDIT,
        counterParty: TransactionCounterParties.WAGERING_BONUS,
        referenceId: wageringProgress.id.toString(),
        userId: wageringProgress.userId,
        status: TransactionStatuses.SUCCESS,
        targetBalance: TransactionTargetBalances.ACCOUNT_BALANCE,
      },
      tx,
    );
    return wageringProgress.rewardAmount;
  }

  private async sendBonusReceivedNotification(
    wageringProgress: UserBonusProgression,
    rewardReceived: Decimal,
  ): Promise<void> {
    const bonusOrCode = await this.prismaService.userBonusProgression.findFirst({
      where: {
        id: wageringProgress.id,
      },
      select: {
        bonus: {
          select: {
            name: true,
          },
        },
        couponCodeRedeem: {
          select: {
            couponCode: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });
    if (!bonusOrCode) {
      Logger.error(
        `Bonus or code not found for wagering progress with id ${wageringProgress.id}`,
        'WageringProgressConsumer.sendBonusReceivedNotification',
      );
      return;
    }
    await this.bonusNotificationService.notifyOnBonusReceived({
      userId: wageringProgress.userId,
      amount: decimalToDollarsValue(new Decimal(rewardReceived)),
      bonusName: bonusOrCode?.couponCodeRedeem?.couponCode?.code ?? bonusOrCode?.bonus.name,
    });
  }
}
