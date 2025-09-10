import { ONE_HOUR_IN_MS } from '@common/constants';
import { PagePaginationRequest, PagePaginationResponse } from '@common/types';
import { PrismaService, PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import { BetStatuses } from '@modules/bet/enum/bet-status.enum';
import { BetBonusMetadata } from '@modules/bet/types';
import {
  BonusProgressStatuses,
  BonusTriggerConfigType,
  BonusTriggerConfigTypes,
  RolloverTypes,
} from '@modules/bonus/enum';
import { TargetValidators } from '@modules/bonus/handlers/strategy';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import {
  bonusProgressionWithBonus,
  bonusProgressionWithBonusProgressTriggers,
  BonusProgressionWithBonusProgressTriggers,
  bonusWithTriggersSelector,
  CreateUserBonusProgression,
  RolloverPercentageValidationConfig,
  UserBonusProgressionWithBonus,
} from '@modules/bonus/types';
import { getExpirationTime } from '@modules/bonus/utils/get-expiration-time';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import {
  TransactionCounterParties,
  TransactionCounterParty,
} from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatus, TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import {
  TransactionTargetBalance,
  TransactionTargetBalances,
} from '@modules/transaction-ledger/enum/target-balance.enum';
import { TransactionOperationType, TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { CreateBonusTransaction, CreateTransaction } from '@modules/transaction-ledger/types';
import { BonusWithdrawal } from '@modules/withdrawal/types';
import { Injectable, Logger } from '@nestjs/common';
import cuid2 from '@paralleldrive/cuid2';
import { Bet, Prisma, Transaction, UserBonusBalance, UserBonusProgression } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { RedisService } from '@songkeys/nestjs-redis';
import { DateTime } from 'luxon';

@Injectable()
export class BonusProgressionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly logService: AsyncLogService,
    private readonly targetValidators: TargetValidators,
    private readonly transactionLedgerService: TransactionLedgerService,
  ) {}

  async getAll(
    pagination: PagePaginationRequest = {},
    filters: Prisma.UserBonusProgressionWhereInput = {},
    withDeleted: boolean = false,
  ): Promise<PagePaginationResponse<UserBonusProgressionWithBonus>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const condition: Prisma.UserBonusProgressionWhereInput = {
      ...filters,
      deletedAt: withDeleted ? undefined : null,
      bonus: {
        id: {
          not: await this.getTipBonusId(),
        },
        deletedAt: withDeleted ? undefined : null,
      },
    };
    const count = await this.prismaService.userBonusProgression.count({
      where: condition,
    });

    const data = await this.prismaService.userBonusProgression.findMany({
      where: {
        ...condition,
        NOT: {
          bonusId: 'cm2n9n9nz0001ouup11fwx3ul',
          rewardAmount: 0,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        {
          expiresAt: {
            sort: 'desc',
            nulls: 'last',
          },
        },
        { createdAt: 'desc' }
      ],
      include: {
        couponCodeRedeem: {
          select: {
            couponCode: {
              select: {
                code: true,
              },
            },
          },
        },
        bonusBalance: {
          select: {
            balance: true,
          },
        },
        bonus: {
          ...bonusWithTriggersSelector,
        },
      },
    });

    return {
      data,
      limit,
      page,
      total: count,
    };
  }

  private async getTipBonusId(): Promise<string | undefined> {
    const cached = await this.redisService.getClient().get('bonus:tip:id');
    if (cached) {
      return cached;
    }
    const bonus = await this.prismaService.bonus.findFirst({
      where: {
        deletedAt: null,
        bonusTriggerProgressConfig: {
          some: {
            trigger: {
              configType: BonusTriggerConfigTypes.TIP,
            },
          },
        },
      },
    });
    if (!bonus) {
      return undefined;
    }
    await this.redisService.getClient().set('bonus:tip:id', bonus.id.toString());
    return bonus.id;
  }

  findWhere(where: Prisma.UserBonusProgressionWhereInput): Promise<UserBonusProgression[]> {
    return this.prismaService.userBonusProgression.findMany({
      where,
    });
  }

  findWageringBonusProgressConfigs(
    betId: string,
    bonusProgression: UserBonusProgressionWithBonus,
  ): {
    progressConfig: RolloverPercentageValidationConfig;
  } | null {
    if (bonusProgression.configOverride) {
      const configOverride = bonusProgression.configOverride as RolloverPercentageValidationConfig;
      if (!configOverride.rolloverPercentage) {
        this.logService.log(
          {
            betId,
            message: 'Wagering bonus progress config override is invalid',
          },
          'WageringBetConsumer.findWageringBonusProgressConfigs.wagering-bonus-progress-config-override-invalid',
        );
      } else {
        return {
          progressConfig: {
            rolloverPercentage: (bonusProgression.configOverride as RolloverPercentageValidationConfig)
              .rolloverPercentage,
          },
        };
      }
    }

    return {
      progressConfig: bonusProgression.bonus.bonusTriggerProgressConfig.at(0)
        ?.config as RolloverPercentageValidationConfig,
    };
  }

  computeProgress(bet: Bet, bonusConfig: RolloverPercentageValidationConfig): Decimal | null {
    const isValidRollover = this.targetValidators.validateRolloverPercentage(bet, bonusConfig, {
      rolloverType: RolloverTypes.RELATIVE,
    });

    if (!isValidRollover) {
      this.logService.log(
        {
          betId: bet.id,
          rolloverPercentage: bonusConfig.rolloverPercentage,
          message: 'Wagering bonus rollover is not valid',
        },
        'WageringBetConsumer.processBetSettled.wagering-bonus-rollover-not-valid',
      );
      return null;
    }
    return new Decimal(bet.betAmount || 0).abs();
  }

  async findUnsettledBetWithWageringProgress(bonusProgress: UserBonusProgression): Promise<number> {
    const oldestUnsettledBet = await this.findOldestUnsettledBet(bonusProgress);
    return await this.prismaService.bet.count({
      where: {
        id: oldestUnsettledBet
          ? {
              gte: oldestUnsettledBet?.betId,
            }
          : undefined,
        createdAt: {
          gte: DateTime.now().minus({ day: 1 }).toJSDate(),
        },
        status: BetStatuses.PENDING,
        userId: bonusProgress.userId,
        metadata: {
          path: ['bonusUsed'],
          array_contains: [
            {
              wageringBonusId: bonusProgress.id,
            },
          ],
        },
      },
    });
  }

  async failWageringProgress(bonusProgress: UserBonusProgression): Promise<{ hasPendingBet: boolean }> {
    const unsettledBetsWithTargetTip = await this.findUnsettledBetWithWageringProgress(bonusProgress);

    if (unsettledBetsWithTargetTip > 0) {
      this.logService.log({
        message: `Wagering progress with id ${bonusProgress.id} has ${unsettledBetsWithTargetTip} unsettled bets with target wagering progress`,
        context: 'WageringProgressConsumer.failWageringProgress',
      });
      return { hasPendingBet: true };
    }

    await this.prismaService.userBonusProgression.update({
      where: { id: bonusProgress.id },
      data: { status: BonusProgressStatuses.FAILED },
    });
    return { hasPendingBet: false };
  }

  async findUnsettledBetWithBonusProgress(bonusProgress: UserBonusProgression): Promise<number> {
    const oldestUnsettledBet = await this.findOldestUnsettledBet(bonusProgress);

    return await this.prismaService.bet.count({
      where: {
        id: oldestUnsettledBet
          ? {
              gte: oldestUnsettledBet?.betId,
            }
          : undefined,
        status: BetStatuses.PENDING,
        userId: bonusProgress.userId,
        metadata: {
          path: ['bonusUsed'],
          array_contains: [
            {
              bonusProgressId: bonusProgress.id,
            },
          ],
        },
      },
    });
  }

  /**
   * Find the oldest unsettled bet for a user
   * @param tipBonus
   * @returns
   */
  private async findOldestUnsettledBet(bonusProgress: UserBonusProgression): Promise<{ betId: string } | null> {
    const key = `bonus:bonusProgress:oldestUnsettledBet:user:${bonusProgress.userId}`;
    const cachedBetId = await this.redisService.getClient().get(key);

    if (cachedBetId) {
      return { betId: cachedBetId };
    }

    const bet = await this.prismaService.bet.findFirst({
      where: {
        status: BetStatuses.PENDING,
        userId: bonusProgress.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (bet) {
      await this.redisService.getClient().set(key, bet.id, 'EX', ONE_HOUR_IN_MS);
    }

    return bet ? { betId: bet.id } : null;
  }

  findUserActiveProgressByType(
    userId: string,
    type: BonusTriggerConfigType,
  ): Promise<BonusProgressionWithBonusProgressTriggers[]> {
    return this.prismaService.userBonusProgression.findMany({
      where: {
        deletedAt: null,
        userId,
        status: BonusProgressStatuses.PENDING,
        bonus: {
          deletedAt: null,
          bonusTriggerProgressConfig: {
            some: {
              trigger: {
                configType: type,
              },
            },
          },
        },
      },
      ...bonusProgressionWithBonusProgressTriggers,
    });
  }

  /**
   * Increment the tip balance and create the corresponding transactions
   * This method iterates through the tipIds and refill userBonusBalance or create new ones
   * @param params
   * @param transactionManager
   * @returns
   */
  async incrementWageringBonusBalance(
    params: {
      betInfo: {
        referenceId: string;
        counterParty: TransactionCounterParty;
      };
      userId: string;
      creditAmount: Decimal;
      bonusUsedMetadata: BetBonusMetadata['bonusUsed'];
    },
    transactionManager: PrismaTransactionManager,
  ): Promise<{
    remainingAmount: Decimal;
    transactions: CreateBonusTransaction[];
    balanceChange: {
      bonusBalanceId: number;
      balanceChange: Decimal;
    }[];
  }> {
    const { userId, creditAmount, betInfo, bonusUsedMetadata } = params;
    Logger.log(
      {
        message: 'incrementWageringBonusBalance',
        userId,
        creditAmount,
        betInfo,
        bonusUsedMetadata,
      },
      'BonusProgressionService.incrementWageringBonusBalance',
    );
    const sanitizedBonusUsed = bonusUsedMetadata.filter((bonusUsed) => bonusUsed.wageringBonusId);
    if (sanitizedBonusUsed.length === 0 || creditAmount.lte(0)) {
      return {
        remainingAmount: creditAmount,
        transactions: [],
        balanceChange: [],
      };
    }

    const bonusProgressions = await transactionManager.userBonusProgression.findMany({
      where: {
        OR: [
          {
            status: BonusProgressStatuses.PENDING,
          },
          {
            status: BonusProgressStatuses.FAILED,
            expiresAt: {
              lte: DateTime.now().toJSDate(),
            },
          },
        ],
        isRefillable: true,
        id: {
          in: sanitizedBonusUsed.map(({ wageringBonusId }) => wageringBonusId),
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        bonusBalance: true,
        ...bonusProgressionWithBonus.include,
      },
    });

    if (bonusProgressions.length === 0) {
      return {
        remainingAmount: creditAmount,
        transactions: [],
        balanceChange: [],
      };
    }

    // Split the credit amount between the tips
    const { remainingAmount, bonusBalanceToCreate, bonusBalanceToUpdate } = this.reduceBonusBalances(
      bonusProgressions,
      userId,
      creditAmount,
    );

    // Persist the balance changes and the corresponding transactions
    const { transactions, balanceChange } = await this.persistBalanceChanges(
      {
        userId,
        betInfo,
        bonusBalanceToCreate,
        bonusBalanceToUpdate,
      },
      transactionManager,
    );
    const bonusProgressionsToPending = bonusProgressions.filter(
      (progression) =>
        progression.status !== BonusProgressStatuses.PENDING &&
        bonusBalanceToCreate.some((balance) => balance.bonusProgressionId === progression.id),
    );
    if (bonusProgressionsToPending.length > 0) {
      await transactionManager.userBonusProgression.updateMany({
        where: { id: { in: bonusProgressionsToPending.map((progression) => progression.id) } },
        data: { status: BonusProgressStatuses.PENDING },
      });
    }
    return {
      remainingAmount,
      transactions: transactions as CreateBonusTransaction[],
      balanceChange,
    };
  }

  async restoreWageringBonusBalance(
    params: {
      betInfo: {
        referenceId: string;
        counterParty: TransactionCounterParty;
      };
      userId: string;
      creditAmount: Decimal;
      bonusUsedMetadata: BetBonusMetadata['bonusUsed'];
    },
    transactionManager: PrismaTransactionManager,
  ): Promise<{
    remainingAmount: Decimal;
    transactions: CreateBonusTransaction[];
    balanceChange: {
      bonusBalanceId: number;
      balanceChange: Decimal;
    }[];
  }> {
    const { userId, creditAmount, betInfo, bonusUsedMetadata } = params;
    const sanitizedBonusUsed = bonusUsedMetadata.filter((bonusUsed) => bonusUsed.wageringBonusId);
    if (sanitizedBonusUsed.length === 0 || creditAmount.lte(0)) {
      return {
        remainingAmount: creditAmount,
        transactions: [],
        balanceChange: [],
      };
    }

    const bonusProgressions = await transactionManager.userBonusProgression.findMany({
      where: {
        status: BonusProgressStatuses.PENDING,
        id: {
          in: sanitizedBonusUsed.map(({ wageringBonusId }) => wageringBonusId),
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        bonusBalance: true,
        ...bonusProgressionWithBonus.include,
      },
    });
    const bonusProgressWithBonusUsed = bonusProgressions.map((progression) => ({
      progress: progression,
      bonusUsed: params.bonusUsedMetadata.find(({ wageringBonusId }) => wageringBonusId === progression.id),
    }));

    let remainingAmount = creditAmount;
    const bonusBalanceToCreate: {
      balance: Prisma.UserBonusBalanceCreateArgs;
      bonusProgressionId: string;
    }[] = [];

    const bonusBalanceToUpdate: {
      id: number;
      oldBalance: Decimal;
      newBalance: Decimal;
    }[] = [];

    for (const { progress, bonusUsed } of bonusProgressWithBonusUsed) {
      if (!bonusUsed?.consumeAmount) {
        continue;
      }
      const bonusBalance = progress.bonusBalance;
      if (!bonusBalance) {
        // if the bonus balance is not set and the bonus is refillable, create a new one
        const { bonusToCreate, remainingAmount: updatedRemainingAmount } = this.processBonusBalanceRecreate({
          userId,
          bonusProgression: progress,
          remainingAmount,
        });
        bonusBalanceToCreate.push({
          balance: bonusToCreate,
          bonusProgressionId: progress.id,
        });
        remainingAmount = updatedRemainingAmount;
      } else {
        const { bonusToUpdate, remainingAmount: updatedRemainingAmount } = this.updatedRemainingAmount({
          bonusProgression: {
            ...progress,
            bonusBalance,
          },
          remainingAmount,
        });
        bonusBalanceToUpdate.push(bonusToUpdate);
        remainingAmount = updatedRemainingAmount;
      }
      // if the remaining amount is 0, break the loop. We can't refill the tips anymore
      if (remainingAmount.eq(0)) {
        break;
      }
    }
    const { transactions, balanceChange } = await this.persistBalanceChanges(
      {
        userId,
        betInfo,
        bonusBalanceToCreate,
        bonusBalanceToUpdate,
      },
      transactionManager,
    );
    return {
      remainingAmount,
      transactions: transactions as CreateBonusTransaction[],
      balanceChange,
    };
  }

  async restoreWithdrawalBonusBalance(
    params: {
      withdrawalId: string;
      bonusWithdrawal: BonusWithdrawal;
    },
    transactionManager: PrismaTransactionManager,
  ): Promise<CreateTransaction | null> {
    const { withdrawalId, bonusWithdrawal } = params;
    const client = this.getClient(transactionManager);
    const bonusProgression = await client.userBonusProgression.findUnique({
      where: {
        id: bonusWithdrawal.progressionId,
      },
    });

    if (!bonusProgression) {
      Logger.error(
        {
          message: 'BonusProgressionService.restoreWithdrawalBonusBalance',
          bonusWithdrawal,
        },
        'BonusProgressionService.restoreWithdrawalBonusBalance',
      );
      return null;
    }

    const bonusBalance = bonusProgression.bonusBalanceId;

    if (!bonusBalance) {
      const createdBalance = await client.userBonusBalance.create({
        data: {
          userId: bonusProgression.userId,
          bonusId: bonusProgression.bonusId,
          balance: bonusWithdrawal.amount,
          expiresAt: bonusWithdrawal.balanceExpirationDate,
        },
      });
      await client.userBonusProgression.update({
        where: { id: bonusProgression.id },
        data: {
          bonusBalanceId: createdBalance.id,
        },
      });
      return {
        amount: bonusWithdrawal.amount,
        counterParty: TransactionCounterParties.WITHDRAWAL_SERVICE,
        referenceId: withdrawalId,
        operationType: TransactionOperationTypes.CREDIT,
        targetBalance: TransactionTargetBalances.BONUS_BALANCE,
        status: TransactionStatuses.SUCCESS,
        userId: bonusProgression.userId,
      };
    }

    await client.userBonusBalance.update({
      where: { id: bonusBalance },
      data: {
        balance: {
          increment: bonusWithdrawal.amount,
        },
      },
    });
    return {
      amount: bonusWithdrawal.amount,
      counterParty: TransactionCounterParties.WITHDRAWAL_SERVICE,
      referenceId: withdrawalId,
      operationType: TransactionOperationTypes.CREDIT,
      targetBalance: TransactionTargetBalances.BONUS_BALANCE,
      status: TransactionStatuses.SUCCESS,
      userId: bonusProgression.userId,
    };
  }

  /**
   * Split the credit amount between the tips
   * Given a list of tips, it will create a new userBonusBalance for the tips that don't have one
   * and update the existing ones as long as the remaining amount is greater than 0
   * @param tips
   * @param userId
   * @param tipBonus
   * @param creditAmount
   * @returns
   */
  private reduceBonusBalances(
    progress: (UserBonusProgressionWithBonus & {
      bonusBalance: UserBonusBalance | null;
    })[],
    userId: string,
    creditAmount: Decimal,
  ): {
    remainingAmount: Decimal;
    bonusBalanceToCreate: {
      balance: Prisma.UserBonusBalanceCreateArgs;
      bonusProgressionId: string;
    }[];
    bonusBalanceToUpdate: {
      id: number;
      oldBalance: Decimal;
      newBalance: Decimal;
    }[];
  } {
    const bonusBalanceToCreate: {
      balance: Prisma.UserBonusBalanceCreateArgs;
      bonusProgressionId: string;
    }[] = [];
    const bonusBalanceToUpdate: {
      id: number;
      oldBalance: Decimal;
      newBalance: Decimal;
    }[] = [];
    let remainingAmount = new Decimal(creditAmount);

    for (const progression of progress) {
      // if the bonus is withdrawable after rollover,
      if (!progression.bonusBalance) {
        const { bonusToCreate, remainingAmount: updatedRemainingAmount } = this.processBonusBalanceRecreate({
          remainingAmount,
          userId,
          bonusProgression: progression,
        });

        bonusBalanceToCreate.push({
          balance: bonusToCreate,
          bonusProgressionId: progression.id,
        });
        // decrement the remaining amount by the tip amount
        remainingAmount = updatedRemainingAmount;
      } else {
        // if the tip has a bonus balance, update it
        const { bonusToUpdate, remainingAmount: updatedRemainingAmount } = this.updatedRemainingAmount({
          bonusProgression: {
            ...progression,
            bonusBalance: progression.bonusBalance,
          },
          remainingAmount,
        });
        bonusBalanceToUpdate.push(bonusToUpdate);
        remainingAmount = updatedRemainingAmount;
      }
      // if the remaining amount is 0, break the loop. We can't refill the tips anymore
      if (remainingAmount.eq(0)) {
        break;
      }
    }
    return {
      remainingAmount,
      bonusBalanceToCreate,
      bonusBalanceToUpdate,
    };
  }

  private processBonusBalanceRecreate(params: {
    userId: string;
    bonusProgression: UserBonusProgressionWithBonus;
    remainingAmount: Decimal;
  }): {
    bonusToCreate: Prisma.UserBonusBalanceCreateArgs;
    remainingAmount: Decimal;
  } {
    const { userId, bonusProgression, remainingAmount } = params;
    const expTime =
      (bonusProgression.configOverride as CouponCodeConfig | null)?.bonusExpiryTime ??
      bonusProgression.bonus.bonusExpiryTime;
    const expHour = bonusProgression.bonus.bonusExpiryHour;
    const updatedAmount = remainingAmount;
    // if the tip amount is greater than the remaining amount, set the amount to the remaining amount
    // const updatedAmount = bonusProgression.rewardAmount.lt(remainingAmount)
    //   ? bonusProgression.rewardAmount
    //   : remainingAmount;

    const bonusToCreate: Prisma.UserBonusBalanceCreateArgs = {
      data: {
        userId,
        bonusId: bonusProgression.bonus.id,
        balance: updatedAmount,
        expiresAt: expTime ? getExpirationTime(expTime, expHour) : undefined,
        createdAt: bonusProgression.createdAt,
      },
    };
    // decrement the remaining amount by the tip amount
    let updatedRemainingAmount = remainingAmount.sub(updatedAmount);
    // if the remaining amount is less than 0, set it to 0
    updatedRemainingAmount = updatedRemainingAmount.lt(0) ? new Decimal(0) : updatedRemainingAmount;

    return {
      bonusToCreate,
      remainingAmount: updatedRemainingAmount,
    };
  }

  private updatedRemainingAmount(params: {
    bonusProgression: UserBonusProgressionWithBonus & {
      bonusBalance: UserBonusBalance;
    };
    remainingAmount: Decimal;
  }): {
    bonusToUpdate: {
      id: number;
      oldBalance: Decimal;
      newBalance: Decimal;
    };
    remainingAmount: Decimal;
  } {
    const { bonusProgression, remainingAmount } = params;

    const newBalance = bonusProgression.bonusBalance.balance.add(remainingAmount);
    const balanceToUpdate = {
      id: bonusProgression.bonusBalance.id,
      oldBalance: bonusProgression.bonusBalance.balance,
      // if the new balance is greater than the tip amount, set it to the tip amount
      newBalance,
      // newBalance: newBalance.lt(bonusProgression.rewardAmount)
      //   ? newBalance
      //   : bonusProgression.rewardAmount,
    };
    const balanceDifference = balanceToUpdate.newBalance.sub(bonusProgression.bonusBalance.balance);
    // decrement the remaining amount by the tip amount
    let updatedRemainingAmount = remainingAmount.sub(balanceDifference);
    // if the remaining amount is less than 0, set it to 0
    updatedRemainingAmount = updatedRemainingAmount.lt(0) ? new Decimal(0) : updatedRemainingAmount;

    return {
      bonusToUpdate: balanceToUpdate,
      remainingAmount: updatedRemainingAmount,
    };
  }

  private async persistBalanceChanges(
    params: {
      userId: string;
      betInfo: {
        referenceId: string;
        counterParty: TransactionCounterParty;
      };
      bonusBalanceToCreate: {
        balance: Prisma.UserBonusBalanceCreateArgs;
        bonusProgressionId: string;
      }[];
      bonusBalanceToUpdate: {
        id: number;
        oldBalance: Decimal;
        newBalance: Decimal;
      }[];
    },
    transactionManager: PrismaTransactionManager,
  ): Promise<{
    transactions: Transaction[];
    balanceChange: {
      bonusBalanceId: number;
      balanceChange: Decimal;
    }[];
  }> {
    const { betInfo, bonusBalanceToCreate, bonusBalanceToUpdate, userId } = params;
    if (!bonusBalanceToCreate.length && !bonusBalanceToUpdate.length) {
      return { transactions: [], balanceChange: [] };
    }

    const transactions: Prisma.TransactionCreateManyInput[] = [];

    // create the transactions for the new bonus balances
    for (const bonusBalance of bonusBalanceToCreate) {
      transactions.push({
        id: cuid2.createId(),
        amount: bonusBalance.balance.data.balance,
        counterParty: betInfo.counterParty,
        referenceId: betInfo.referenceId,
        operationType: TransactionOperationTypes.CREDIT,
        targetBalance: TransactionTargetBalances.BONUS_BALANCE,
        status: TransactionStatuses.SUCCESS,
        userId,
      });
    }

    // create the transactions for the updated bonus balances
    for (const bonusBalance of bonusBalanceToUpdate) {
      transactions.push({
        id: cuid2.createId(),
        amount: bonusBalance.newBalance.sub(bonusBalance.oldBalance),
        counterParty: betInfo.counterParty,
        referenceId: betInfo.referenceId,
        operationType: TransactionOperationTypes.CREDIT,
        targetBalance: TransactionTargetBalances.BONUS_BALANCE,
        status: TransactionStatuses.SUCCESS,
        userId,
      });
    }

    // create the transactions
    await this.transactionLedgerService.createMany(
      transactions.map((transaction) => ({
        ...transaction,
        userId,
        amount: new Decimal(transaction.amount as Decimal),
        operationType: transaction.operationType as TransactionOperationType,
        targetBalance: transaction.targetBalance as TransactionTargetBalance,
        status: transaction.status as TransactionStatus,
        counterParty: transaction.counterParty as TransactionCounterParty,
        referenceId: transaction.referenceId,
      })),
      transactionManager,
    );

    const createdBonusBalances: {
      balanceId: number;
      balanceChange: Decimal;
    }[] = [];
    for (const bonusBalance of bonusBalanceToCreate) {
      const createdBonusBalance = await transactionManager.userBonusBalance.create({
        data: {
          expiresAt: bonusBalance.balance.data.expiresAt,
          balance: bonusBalance.balance.data.balance,
          bonusId: bonusBalance.balance.data.bonusId!,
          userId: bonusBalance.balance.data.userId!,
          bonusProgression: {
            connect: {
              id: bonusBalance.bonusProgressionId,
            },
          },
        },
        select: {
          id: true,
          balance: true,
        },
      });
      createdBonusBalances.push({
        balanceId: createdBonusBalance.id,
        balanceChange: createdBonusBalance.balance,
      });
    }

    // update the bonus balances
    await Promise.all(
      bonusBalanceToUpdate.map(({ id, newBalance }) =>
        transactionManager.userBonusBalance.update({
          where: { id },
          data: { balance: newBalance },
        }),
      ),
    );
    return {
      transactions: transactions as Transaction[],
      balanceChange: [
        ...createdBonusBalances.map(({ balanceId, balanceChange }) => ({
          bonusBalanceId: balanceId,
          balanceChange,
        })),
        ...bonusBalanceToUpdate.map(({ id, newBalance, oldBalance }) => ({
          bonusBalanceId: id,
          balanceChange: newBalance.sub(oldBalance),
        })),
      ],
    };
  }

  async createMany(
    data: Omit<CreateUserBonusProgression, 'bonusBalance'>[],
    transactionManager?: PrismaTransactionManager,
  ): Promise<Prisma.BatchPayload> {
    if (!data.length) {
      return { count: 0 };
    }
    const client = this.getClient(transactionManager);
    return client.userBonusProgression.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async create(
    data: CreateUserBonusProgression,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserBonusProgression> {
    return this.getClient(transactionManager).userBonusProgression.create({
      data,
    });
  }

  async createManyReturning(
    data: CreateUserBonusProgression[],
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserBonusProgression[]> {
    if (!data.length) {
      return [];
    }
    const client = this.getClient(transactionManager);
    const createdProgressions: UserBonusProgression[] = [];
    for (const item of data) {
      const createdProgression = await client.userBonusProgression.create({
        data: {
          ...item,
        },
      });
      createdProgressions.push(createdProgression);
    }
    return createdProgressions;
  }

  async updateById(
    id: string,
    data: Prisma.UserBonusProgressionUpdateInput,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserBonusProgression> {
    return this.getClient(transactionManager).userBonusProgression.update({
      where: { id },
      data,
      include: {
        bonus: {
          ...bonusWithTriggersSelector,
        },
      },
    });
  }

  private getClient(transactionManager?: PrismaTransactionManager): PrismaTransactionManager {
    return transactionManager || this.prismaService;
  }
}
