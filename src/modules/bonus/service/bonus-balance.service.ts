import { ENV } from '@common/env';
import { PagePaginationRequest, PagePaginationResponse } from '@common/types';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { CancelBet, PlaceBet } from '@modules/balance/types';
import { BetBonusMetadata } from '@modules/bet/types';
import {
  BonusProgressStatuses,
  BonusTriggerConfigType,
  BonusTriggerConfigTypes,
} from '@modules/bonus/enum';
import { ConsumerHandler } from '@modules/bonus/handlers/consumer/handler';
import { BetRollbackScoringStrategy } from '@modules/bonus/handlers/consumer/strategy/rollback-scoring.strategy';
import { BetParser } from '@modules/bonus/handlers/strategy';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { BonusTriggerService } from '@modules/bonus/service/bonus-trigger.service';
import {
  bonusWithTriggersSelector,
  CreateUserBonusBalance,
  UserBonusBalanceWithBonus,
} from '@modules/bonus/types';
import { Roles } from '@modules/role/enum/role.enum';
import { RoleService } from '@modules/role/service/role.service';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionTargetBalances } from '@modules/transaction-ledger/enum/target-balance.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import {
  BetTransactionCounterParties,
  CreateBonusTransaction,
} from '@modules/transaction-ledger/types';
import { UserConfigService } from '@modules/user-config/service/user-config.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cuid2 from '@paralleldrive/cuid2';
import {
  Bet,
  Prisma,
  Transaction,
  UserBonusBalance,
  UserBonusProgression,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { RedisService } from '@songkeys/nestjs-redis';
import { decimalToNumber } from '@utils/decimal-do-number';
import { DateTime } from 'luxon';

@Injectable()
export class BonusBalanceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly betParser: BetParser,
    private readonly consumerHandler: ConsumerHandler,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly asyncLogService: AsyncLogService,
    private readonly bonusTriggerService: BonusTriggerService,
    private readonly configService: ConfigService,
    private readonly roleService: RoleService,
    private readonly userConfigService: UserConfigService,
    private readonly betRollbackScoringStrategy: BetRollbackScoringStrategy,
    private readonly redisService: RedisService,
  ) {}

  async getUserBonusBalanceById(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Decimal> {
    const isBonusEnabled = await this.userConfigService.isUserBonusEnabled(
      userId,
      transactionManager,
    );
    if (!isBonusEnabled) {
      return new Decimal(0);
    }
    const balance = await this.getClient(
      transactionManager,
    ).userBonusBalance.aggregate({
      where: {
        userId,
        deletedAt: null,
        OR: [
          {
            expiresAt: {
              gt: new Date(),
            },
          },
          {
            expiresAt: null,
          },
        ],
      },
      _sum: {
        balance: true,
      },
    });
    return balance._sum.balance || new Decimal(0);
  }

  async getUserWithdrawableBonusBalance(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Decimal> {
    const isBonusEnabled = await this.userConfigService.isUserBonusEnabled(
      userId,
      transactionManager,
    );
    if (!isBonusEnabled) {
      return new Decimal(0);
    }
    const balance = await this.getClient(
      transactionManager,
    ).userBonusBalance.aggregate({
      where: {
        userId,
        deletedAt: null,
        isWithdrawable: true,
        OR: [
          {
            expiresAt: {
              gt: new Date(),
            },
          },
          {
            expiresAt: null,
          },
        ],
      },
      _sum: {
        balance: true,
      },
    });
    return balance._sum.balance || new Decimal(0);
  }

  async getAll(
    pagination: PagePaginationRequest = {},
    filters: Prisma.UserBonusBalanceWhereInput = {},
    withDeleted: boolean = false,
  ): Promise<PagePaginationResponse<UserBonusBalanceWithBonus>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const condition: Prisma.UserBonusBalanceWhereInput = {
      ...filters,
      deletedAt: withDeleted ? undefined : null,
      bonus: {
        deletedAt: withDeleted ? undefined : null,
      },
    };
    const count = await this.prismaService.userBonusBalance.count({
      where: condition,
    });

    const data = await this.prismaService.userBonusBalance.findMany({
      where: condition,
      skip: (page - 1) * limit,
      take: limit,
      include: {
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

  create(
    data: CreateUserBonusBalance,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserBonusBalance> {
    return this.getClient(transactionManager).userBonusBalance.create({
      data,
    });
  }

  async createMany(
    data: CreateUserBonusBalance[],
    transactionManager?: PrismaTransactionManager,
  ): Promise<Prisma.BatchPayload> {
    if (!data.length) {
      return { count: 0 };
    }

    return this.getClient(transactionManager).userBonusBalance.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async createManyReturning(
    data: CreateUserBonusBalance[],
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserBonusBalance[]> {
    if (!data.length) {
      return [];
    }
    const client = this.getClient(transactionManager);
    const result: UserBonusBalance[] = [];
    for (const item of data) {
      const created = await client.userBonusBalance.create({
        data: item,
      });
      result.push(created);
    }
    return result;
  }

  getUserBonusBalance(
    withDeleted: boolean = false,
  ): Promise<UserBonusBalance[]> {
    return this.prismaService.userBonusBalance.findMany({
      where: {
        deletedAt: withDeleted ? undefined : null,
      },
    });
  }

  findWhere(
    where: Prisma.UserBonusBalanceWhereInput,
  ): Promise<UserBonusBalance[]> {
    return this.prismaService.userBonusBalance.findMany({
      where,
    });
  }

  private async checkUserPermission(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<boolean> {
    const userRoles = await this.roleService.getUserRoles(
      userId,
      transactionManager,
    );

    if (userRoles.some((role) => role.name === Roles.VIP_USER)) {
      const isBonusEnabled = await this.userConfigService.isUserBonusEnabled(
        userId,
        transactionManager,
      );
      if (!isBonusEnabled) {
        return false;
      }
    }
    return true;
  }

  async consumeBonusBalance(
    placeBet: PlaceBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    remainingAmount: Decimal;
    transactions: CreateBonusTransaction[];
    bonusUsed: BetBonusMetadata['bonusUsed'];
  }> {
    const initialBalanceChange = {
      remainingAmount: placeBet.balanceChange,
      transactions: [] as CreateBonusTransaction[],
      bonusUsed: [] as BetBonusMetadata['bonusUsed'],
    };

    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      return initialBalanceChange;
    }

    // Wrap the function call in an async store to aggregate logs
    return this.asyncLogService.init(async () => {
      const { bet, referenceId, provider, balanceChange } = placeBet;

      // If the balance change is of type credit, there must be no modification to the bonus balance
      if (balanceChange.lte(0)) return initialBalanceChange;

      // Check if the user is allowed to use the bonus system
      const isBonusEnabledForUser = await this.checkUserPermission(
        bet.userId,
        transactionManager,
      );

      // If the user is not allowed to use the bonus system, return the initial balance change
      if (!isBonusEnabledForUser) {
        this.asyncLogService.log(
          { data: bet },
          'BonusBalanceService.consumeBonusBalance.vipUserNotAllowed',
        );
        return initialBalanceChange;
      }
      // Get the bonus balances that are consumable
      const bonusBalances = await this.getConsumableBonusBalance(
        bet.userId,
        transactionManager,
      );
      this.asyncLogService.log(
        bonusBalances,
        'consumeBonusBalance.bonusBalances',
      );

      // If there are no consumable bonus balances, return the initial balance change
      if (!bonusBalances.length) return initialBalanceChange;

      // Parse the bet data
      const parsedBetData = await this.betParser.parse(bet as Bet);
      this.asyncLogService.log(
        bonusBalances,
        'consumeBonusBalance.parsedBetData',
      );
      // Get the consumer triggers for the bonus balances
      const consumerConfig =
        await this.bonusTriggerService.findConsumerTriggersByBonusIds(
          bonusBalances.map((b) => b.bonusId),
          transactionManager,
        );

      // Sort and filter the bonus balances based on the consumer triggers
      // This will return the bonus balances that are eligible to be consumed based on the bet data and the consumer triggers
      // The order of the bonus balances is also determined by the consumer triggers priority
      const consumableBonuses = this.consumerHandler.sortAndFilter({
        bet: bet as Bet,
        betInfo: parsedBetData,
        consumers: consumerConfig,
        bonusBalances,
      });
      this.asyncLogService.log(
        consumableBonuses,
        'consumeBonusBalance.bonusApplyOrder',
      );
      // If there are no consumable bonus balances, return the initial balance change
      if (!consumableBonuses.length) return initialBalanceChange;

      // Loop through the consumable bonus balances and reduce the current balances
      const { remaining, bonusToDelete, consumedBonuses } =
        this.reduceCurrentBalances(consumableBonuses, bet.betAmount);
      this.asyncLogService.log(
        remaining,
        'consumeBonusBalance.remainingAmount',
      );

      const allBonusBalanceUsed = [...bonusToDelete, ...consumedBonuses];

      const wageringIds = await this.getClient(
        transactionManager,
      ).userBonusProgression.findMany({
        where: {
          bonusBalanceId: {
            in: allBonusBalanceUsed.map((b) => b.bonus.id),
          },
        },
      });

      const wageringBonusBalanceMap = new Map<number, UserBonusProgression>();
      wageringIds.forEach((t) => {
        if (t.bonusBalanceId) {
          wageringBonusBalanceMap.set(t.bonusBalanceId, t);
        }
      });

      await this.persistBonusConsumption(
        consumedBonuses,
        transactionManager,
        bonusToDelete,
        provider,
        referenceId,
      );

      const bonusTypes = await this.getBonusTypesByIds(
        Array.from(new Set(allBonusBalanceUsed.map((b) => b.bonus.bonusId))),
        transactionManager,
      );

      return {
        remainingAmount: remaining,
        transactions: allBonusBalanceUsed.map((t) => t.transaction),
        bonusUsed: allBonusBalanceUsed.map((bonusUpdate) => {
          return {
            bonusTypes: bonusTypes.get(bonusUpdate.bonus.bonusId),
            wageringBonusId: wageringBonusBalanceMap.get(bonusUpdate.bonus.id)
              ?.id,
            transactionId: bonusUpdate.transaction.id,
            bonusId: bonusUpdate.bonus.bonusId,
            consumeAmount: decimalToNumber(bonusUpdate.transaction.amount),
          };
        }) as BetBonusMetadata['bonusUsed'],
      };
    });
  }

  /**
   *
   * @param userId
   * @param amount
   * @param referenceId
   * @param transactionManager
   * @returns - The remaining amount and the consumed bonuses. The consumed bonuses are modified to reflect the balance changes.
   */
  async consumeWithdrawalBonusBalance(
    userId: string,
    amount: Decimal,
    referenceId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{ remainingAmount: Decimal, consumedBonuses: UserBonusBalance[], transactions: Transaction[] }> {
    const client = this.getClient(transactionManager);
    const withdrawableBalances = await client.userBonusBalance.findMany({
      where: {
        userId,
        isWithdrawable: true,
        OR: [
          {
            expiresAt: {
              gt: new Date(),
            },
          },
          {
            expiresAt: null,
          },
        ],
        balance: {
          gt: 0,
        },
      },
    });

    const { bonusToDelete, consumedBonuses, remaining } = this.reduceCurrentBalances(withdrawableBalances, amount);

    this.asyncLogService.log(
      remaining,
      'consumeWithdrawalBonusBalance.remainingAmount',
    );

    const { transactions } = await this.persistBonusConsumption(
      consumedBonuses,
      transactionManager,
      bonusToDelete,
      TransactionCounterParties.WITHDRAWAL_SERVICE,
      referenceId,
    );

    const balanceModifiedMap = consumedBonuses.map((c) => c.bonus).reduce((acc, curr) => {
      acc.set(curr.id, curr.balance);
      return acc;
    }, new Map<number, Decimal>());

    const balanceDeleteMap = bonusToDelete.map((b) => b.bonus).reduce((acc, curr) => {
      acc.set(curr.id, curr.balance);
      return acc;
    }, new Map<number, Decimal>());

    const modifiedBalance = withdrawableBalances.reduce((acc, curr) => {
      const balance = balanceModifiedMap.get(curr.id);
      if (balance) {
        acc.push({
          ...curr,
          balance: curr.balance.sub(balance),
        });
      }
      const balanceDelete = balanceDeleteMap.get(curr.id);
      if (balanceDelete) {
        acc.push({
          ...curr,
        });
      }
      return acc;
    }, [] as UserBonusBalance[])

    return {
      remainingAmount: remaining,
      consumedBonuses: modifiedBalance,
      transactions
    };
  }

  private async getBonusTypesByIds(
    bonusIds: string[],
    transactionManager: PrismaTransactionManager | undefined,
  ): Promise<Map<string, BonusTriggerConfigType[]>> {
    const cachedBonusTypes = new Map<string, BonusTriggerConfigType[]>();
    const missingCache: string[] = [];

    for (const bonusId of bonusIds) {
      const bonusTypes = await this.redisService
        .getClient()
        .get(`bonusTypes:${bonusId}`);
      if (!bonusTypes) {
        missingCache.push(bonusId);
      } else {
        cachedBonusTypes.set(
          bonusId,
          JSON.parse(bonusTypes) as BonusTriggerConfigType[],
        );
      }
    }

    if (!missingCache.length) {
      return cachedBonusTypes;
    }

    const bonusTypes = await this.getClient(
      transactionManager,
    ).bonusTriggerProducerConfig.findMany({
      where: {
        bonusId: { in: missingCache },
      },
      select: {
        type: true,
        bonusId: true,
      },
    });

    bonusTypes.forEach((b) => {
      if (cachedBonusTypes.has(b.bonusId)) {
        cachedBonusTypes.get(b.bonusId)?.push(b.type as BonusTriggerConfigType);
      } else {
        cachedBonusTypes.set(b.bonusId, [b.type as BonusTriggerConfigType]);
      }
    });

    await Promise.all(
      missingCache.map((b) =>
        this.redisService
          .getClient()
          .set(`bonusTypes:${b}`, JSON.stringify(cachedBonusTypes.get(b))),
      ),
    );
    return cachedBonusTypes;
  }

  private async persistBonusConsumption(
    consumedBonuses: {
      bonus: UserBonusBalance;
      transaction: CreateBonusTransaction;
    }[],
    transactionManager: PrismaTransactionManager | undefined,
    bonusToDelete: {
      bonus: UserBonusBalance;
      transaction: CreateBonusTransaction;
    }[],
    provider: string,
    referenceId: string,
  ): Promise<{ transactions: Transaction[] }> {
    // eslint-disable-next-line no-unused-vars
    const results = await Promise.all([
      // Update the balance of the consumed bonus balances
      ...consumedBonuses.map((b) =>
        this.getClient(transactionManager).userBonusBalance.update({
          where: {
            id: b.bonus.id,
          },
          data: {
            balance: b.bonus.balance,
          },
        }),
      ),
      // Delete the bonus balances that have been consumed to remove unnecessary data
      this.getClient(transactionManager).userBonusBalance.deleteMany({
        where: {
          id: {
            in: bonusToDelete.map((b) => b.bonus.id),
          },
        },
      }),
      // Persist the transactions to the transaction ledger
    ]);
    const transactions = await this.transactionLedgerService.createMany(
      [...bonusToDelete, ...consumedBonuses].map(({ transaction }) => ({
        id: transaction.id,
        amount: transaction.amount,
        counterParty: provider as BetTransactionCounterParties,
        referenceId,
        operationType: transaction.operationType,
        status: transaction.status,
        userId: transaction.userId,
        targetBalance: TransactionTargetBalances.BONUS_BALANCE,
      })),
      transactionManager,
    );

    return {
      transactions,
    };
  }

  private reduceCurrentBalances(
    consumableBonuses: UserBonusBalance[],
    amount: Decimal,
  ): {
    remaining: Decimal;
    consumedBonuses: {
      bonus: UserBonusBalance;
      transaction: CreateBonusTransaction;
    }[];
    bonusToDelete: {
      bonus: UserBonusBalance;
      transaction: CreateBonusTransaction;
    }[];
  } {
    const consumedBonuses: {
      bonus: UserBonusBalance;
      transaction: CreateBonusTransaction;
    }[] = [];
    const bonusToDelete: {
      bonus: UserBonusBalance;
      transaction: CreateBonusTransaction;
    }[] = [];

    let remaining = new Decimal(amount);

    for (const consumable of consumableBonuses) {
      if (remaining.lt(consumable.balance)) {
        // Add the current bonus balance to the consumed bonuses
        consumedBonuses.push({
          bonus: { ...consumable, balance: consumable.balance.sub(remaining) },
          // Generate the transaction for the current bonus balance
          transaction: {
            id: cuid2.createId(),
            amount: remaining,
            userId: consumable.userId,
            operationType: TransactionOperationTypes.DEBIT,
            status: TransactionStatuses.SUCCESS,
          },
        });
        // Reset the remaining amount to 0
        remaining = new Decimal(0);
        // Break the loop as the bet amount has been fully covered by the bonus balance
        break;
      } else if (consumable.bonusId) {
        // Subtract the current bonus balance from the remaining amount
        remaining = remaining.sub(consumable.balance);

        // Generate the transaction for the current bonus balance
        bonusToDelete.push({
          bonus: { ...consumable },
          transaction: {
            id: cuid2.createId(),
            amount: consumable.balance,
            userId: consumable.userId,
            operationType: TransactionOperationTypes.DEBIT,
            status: TransactionStatuses.SUCCESS,
          },
        });
      }
    }
    this.asyncLogService.log(
      consumedBonuses,
      'consumeBonusBalance.consumedBonuses',
    );
    this.asyncLogService.log(
      bonusToDelete,
      'consumeBonusBalance.bonusToDelete',
    );
    return {
      remaining,
      consumedBonuses,
      bonusToDelete,
    };
  }

  async rollbackRefundBet(
    refundData: PlaceBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    remainingAmount: Decimal;
    transactions: CreateBonusTransaction[];
    bonusUsed: BetBonusMetadata['bonusUsed'];
  }> {
    const {
      userId,
      bet: { thirdPartyIdentifier },
    } = refundData;

    const lastBonusBalanceCredit = await this.getClient(
      transactionManager,
    ).transaction.findFirst({
      where: {
        userId,
        referenceId: thirdPartyIdentifier,
        targetBalance: TransactionTargetBalances.BONUS_BALANCE,
        operationType: TransactionOperationTypes.CREDIT,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!lastBonusBalanceCredit || lastBonusBalanceCredit.amount.eq(0)) {
      return {
        remainingAmount: refundData.balanceChange,
        transactions: [],
        bonusUsed: [],
      };
    }

    return await this.consumeRollbackBonusBalance(
      refundData,
      transactionManager,
    );
  }

  private async consumeRollbackBonusBalance(
    refundData: PlaceBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    remainingAmount: Decimal;
    transactions: CreateBonusTransaction[];
    bonusUsed: BetBonusMetadata['bonusUsed'];
  }> {
    const rollbackBonus = await this.prismaService.bonus.findFirst({
      where: {
        bonusTriggerProducerConfig: {
          some: {
            type: BonusTriggerConfigTypes.ROLLBACK,
          },
        },
      },
    });

    if (!rollbackBonus) {
      return this.consumeBonusBalance(refundData, transactionManager);
    }

    // Get the available bonus balances for the user
    const availableBonuses = await this.getConsumableBonusBalance(
      refundData.userId,
    );

    const consumerConfig =
      await this.bonusTriggerService.findConsumerTriggersByBonusIds(
        availableBonuses.map((b) => b.bonusId),
      );

    // Sort and filter the bonus balances, with rollback bonus priority
    const sortedBonuses = this.consumerHandler.sortAndFilter({
      bet: refundData.bet as Bet,
      betInfo: await this.betParser.parse(refundData.bet as Bet),
      consumers: consumerConfig,
      bonusBalances: availableBonuses,
      customScoreStrategy: this.betRollbackScoringStrategy,
    });

    const { remaining, bonusToDelete, consumedBonuses } =
      this.reduceCurrentBalances(sortedBonuses, refundData.bet.betAmount);

    this.asyncLogService.log(remaining, 'consumeBonusBalance.remainingAmount');

    const allBonusBalanceUsed = [...bonusToDelete, ...consumedBonuses];

    const wageringIds = await this.getClient(
      transactionManager,
    ).userBonusProgression.findMany({
      where: {
        bonusBalanceId: {
          in: allBonusBalanceUsed.map((b) => b.bonus.id),
        },
      },
    });

    const wageringBonusBalanceMap = new Map<number, UserBonusProgression>();
    wageringIds.forEach((t) => {
      if (t.bonusBalanceId) {
        wageringBonusBalanceMap.set(t.bonusBalanceId, t);
      }
    });

    await this.persistBonusConsumption(
      consumedBonuses,
      transactionManager,
      bonusToDelete,
      refundData.bet.provider,
      refundData.bet.thirdPartyIdentifier,
    );

    const bonusTypes = await this.getBonusTypesByIds(
      Array.from(new Set(allBonusBalanceUsed.map((b) => b.bonus.bonusId))),
      transactionManager,
    );

    return {
      remainingAmount: remaining,
      transactions: allBonusBalanceUsed.map((t) => t.transaction),
      bonusUsed: allBonusBalanceUsed.map((bonusUpdate) => {
        const isTipBonus = wageringBonusBalanceMap.has(bonusUpdate.bonus.id);
        if (isTipBonus) {
          return {
            bonusTypes: bonusTypes.get(bonusUpdate.bonus.bonusId),
            tipBonusId: wageringBonusBalanceMap.get(bonusUpdate.bonus.id)?.id,
            transactionId: bonusUpdate.transaction.id,
            bonusId: bonusUpdate.bonus.bonusId,
          };
        }
        return {
          bonusTypes: bonusTypes.get(bonusUpdate.bonus.bonusId),
          transactionId: bonusUpdate.transaction.id,
          bonusId: bonusUpdate.bonus.bonusId,
        };
      }) as BetBonusMetadata['bonusUsed'],
    };
  }

  async refundBonusBalance(
    bet: CancelBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    remainingAmount: Decimal;
    transaction?: Transaction;
  }> {
    const client = this.getClient(transactionManager);
    const initialBalanceChange = {
      remainingAmount: bet.revertAmount,
    };

    const betTransactions =
      await this.transactionLedgerService.findByReferenceIdAndTargetBalance(
        bet.thirdPartyIdentifier,
        TransactionTargetBalances.BONUS_BALANCE,
        transactionManager,
      );

    if (!betTransactions) {
      return initialBalanceChange;
    }

    const debits = betTransactions.filter(
      (t) => t.operationType === TransactionOperationTypes.DEBIT,
    );

    const totalBonusSpent = debits.reduce(
      (acc, curr) => acc.add(curr.amount),
      new Decimal(0),
    );

    const valueToRevertInBonus = Decimal.min(bet.revertAmount, totalBonusSpent);

    const valueToRevertInWallet = bet.revertAmount
      .sub(valueToRevertInBonus)
      .lt(0)
      ? new Decimal(0)
      : bet.revertAmount.sub(valueToRevertInBonus);

    const rollbackBonus = await client.bonus.findFirst({
      where: {
        bonusTriggerProducerConfig: {
          some: {
            type: BonusTriggerConfigTypes.ROLLBACK,
          },
        },
      },
    });

    if (!rollbackBonus) {
      Logger.error(
        `BONUS ROLLBACK NOT FOUND. Bonus balance for bet ${bet.betId} was not reverted`,
        'BonusBalanceService.revertBonusBalance.rollbackBonusNotFound',
      );
      return {
        remainingAmount: valueToRevertInWallet,
      };
    }

    await client.userBonusProgression.create({
      data: {
        bonusId: rollbackBonus.id,
        currentProgress: 0,
        targetProgress: 0,
        rewardAmount: valueToRevertInBonus,
        userId: bet.userId,
        status: BonusProgressStatuses.COMPLETED,
        claimedAt: DateTime.now().toJSDate(),
      },
    });

    await client.userBonusBalance.create({
      data: {
        bonusId: rollbackBonus.id,
        userId: bet.userId,
        balance: valueToRevertInBonus,
      },
    });

    const transaction = await this.transactionLedgerService.create(
      {
        amount: valueToRevertInBonus,
        userId: bet.userId,
        operationType: TransactionOperationTypes.CREDIT,
        status: TransactionStatuses.SUCCESS,
        counterParty: bet.provider,
        referenceId: bet.thirdPartyIdentifier,
        targetBalance: TransactionTargetBalances.BONUS_BALANCE,
      },
      transactionManager,
    );

    return {
      remainingAmount: valueToRevertInWallet,
      transaction,
    };
  }

  private async getConsumableBonusBalance(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserBonusBalance[]> {
    const isBonusEnabled = await this.userConfigService.isUserBonusEnabled(
      userId,
      transactionManager,
    );
    if (!isBonusEnabled) {
      return [];
    }
    return this.getClient(transactionManager).userBonusBalance.findMany({
      where: {
        AND: {
          userId,
          balance: {
            gt: 0,
          },
          deletedAt: null,
          bonus: {
            deletedAt: null,
          },
        },
        OR: [
          {
            expiresAt: {
              gte: new Date(),
            },
          },
          {
            expiresAt: null,
          },
        ],
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
