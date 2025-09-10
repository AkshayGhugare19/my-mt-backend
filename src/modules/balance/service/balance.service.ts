import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ENV } from '@common/env';
import { InsufficientBalanceError } from '@common/error/insufficient-ballance.error';
import { NotFoundError } from '@common/error/not-found.error';
import { Wrapper } from '@common/types';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { EventNamespace } from '@infrastructure/event/namespace';
import {
  REDIS_KEY__BINANCE_ETH_USDC,
  REDIS_KEY__BINANCE_ETH_USDT,
  REDIS_KEY__BINANCE_SOL_USDC,
  REDIS_KEY__BINANCE_SOL_USDT,
  REDIS_KEY__BINANCE_TRX_USDC,
  REDIS_KEY__BINANCE_TRX_USDT,
  REDIS_KEY__TATUM_USDC_USD,
  REDIS_KEY__TATUM_USDC_EUR,
  REDIS_KEY__TATUM_USDC_PHP,
  REDIS_KEY__TATUM_USDT_EUR,
  REDIS_KEY__TATUM_USDT_PHP,
  REDIS_KEY__TATUM_USDT_USD,
} from '@infrastructure/redis/keys';
import { WithdrawalEvent } from '@modules/balance/event/withdrawal.event';
import {
  PlaceBet,
  RefundBet,
  SettleAggregateBet,
  SettleBet,
} from '@modules/balance/types';
import { BetProviders } from '@modules/bet/enum/bet-providers.enum';
import { BetStatus, BetStatuses } from '@modules/bet/enum/bet-status.enum';
import { BetBonusMetadata, BetMetadata } from '@modules/bet/types';
import { BonusBalanceService } from '@modules/bonus/service/bonus-balance.service';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import { TransactionCounterParties, TransactionCounterParty } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatus, TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionTargetBalances } from '@modules/transaction-ledger/enum/target-balance.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { CreateBonusTransaction, CreateTransaction, CreateWithdrawalTransaction } from '@modules/transaction-ledger/types';
import { WithdrawalRequestMetadata } from '@modules/withdrawal/types';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Balance, Prisma, Transaction, UserBonusBalance, WithdrawalRequest } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { pointsToUsd } from '@utils/points-to-usd';
import { usdtToPoints } from '@utils/usdt-to-points';
import Redis from 'ioredis';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => TransactionLedgerService))
    private readonly transactionLedgerService: Wrapper<TransactionLedgerService>,
    @Inject(forwardRef(() => BonusBalanceService))
    private readonly bonusBalanceService: Wrapper<BonusBalanceService>,
    @Inject(forwardRef(() => BonusProgressionService))
    private readonly bonusProgressionService: Wrapper<BonusProgressionService>,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public async getBalancesWithUsers() {
    return this.prismaService.balance.findMany({
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  incrementTotalSettledAmount(
    userId: string,
    amount: Decimal,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Balance> {
    const client = this.getClient(transactionManager);
    return client.balance.update({
      where: {
        userId,
      },
      data: {
        totalSettled: {
          increment: amount,
        },
      },
    });
  }

  public async getLockedBalance(userId: string): Promise<Decimal> {
    const data = await this.prismaService.withdrawalRequest.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId,
        status: 'PENDING',
      },
    });
    return data?._sum?.amount ? data._sum.amount : new Decimal(0);
  }

  async getMasterPnl(userId: string): Promise<Decimal> {
    const vipBalances = await this.prismaService.balance.aggregate({
      where: {
        user: {
          masterId: userId,
        },
      },
      _sum: {
        debt: true,
        balance: true,
      },
    });
    return (vipBalances._sum.debt || new Decimal(0)).minus(
      vipBalances._sum.balance || new Decimal(0),
    );
  }

  async getBalance(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Decimal | null> {
    const client = this.getClient(transactionManager);
    const balance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
      },
    });
    return balance?.balance || null;
  }

  async getBalanceAndBonusBalance(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Decimal | null> {
    const client = this.getClient(transactionManager);
    const balance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
      },
    });

    if (!balance) {
      return null;
    }

    const bonusBalance = this.configService.get(ENV.DISABLE_BONUS_SYSTEM)
      ? new Decimal(0)
      : await this.bonusBalanceService.getUserBonusBalanceById(
        userId,
        transactionManager,
      );

    return balance.balance.add(bonusBalance);
  }

  async getBalanceOrThrow(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Decimal> {
    const client = this.getClient(transactionManager);
    const balance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
      },
    });
    if (!balance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'getBalanceOrThrow',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }
    return balance.balance;
  }

  async getDebt(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Decimal | null> {
    const client = this.getClient(transactionManager);
    const balance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        debt: true,
      },
    });
    return balance?.debt || null;
  }

  async getBalanceAnd<T extends Prisma.BalanceSelectScalar>(
    userId: string,
    select: T,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Partial<Balance> | null> {
    const client = this.getClient(transactionManager);
    const balance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
        ...(select as Prisma.BalanceSelectScalar),
      },
    });
    return balance || null;
  }

  async getBalanceAndVolumePlayed(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{ balance: Decimal; volumePlayed: Decimal } | null> {
    const client = this.getClient(transactionManager);
    return await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
        volumePlayed: true,
      },
    });
  }

  async getWithdrawableBalance(userId: string): Promise<{balance: Decimal, volumePlayed: Decimal}> {
    const client = this.getClient();
    const balance = await client.balance.findUnique({
      where: { userId },
      select: {
        balance: true,
        volumePlayed: true,
      },
    });

    const bonusBalance = await this.bonusBalanceService.getUserWithdrawableBonusBalance(userId);

    return {
      balance: balance?.balance.add(bonusBalance) || new Decimal(0),
      volumePlayed: balance?.volumePlayed || new Decimal(0),
    };
  }

  /**
   *
   * @param createWithdraw
   * @param transactionManager
   * @returns
   * @emits - {@link EventNamespace.USER_WITHDRAWAL} - Emits an event when a user makes a withdrawal
   */
  async createWithdraw(
    createWithdraw: CreateWithdrawalTransaction,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    bonusUsed: {
      amount: Decimal;
      bonusId: string;
      progressionId: string | undefined;
      balanceExpirationDate: Date;
    }[];
  }> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.createWithdraw(createWithdraw, client);
      });
    }

    const { consumedBonuses, transaction } = await this.makeWithdraw(
      createWithdraw.userId,
      createWithdraw.amount,
      createWithdraw.referenceId,
      transactionManager,
    );

    const balance = await this.getBalanceAndBonusBalance(
      createWithdraw.userId,
      transactionManager,
    );

    const user = await transactionManager.user.findFirst({
      where: {
        id: createWithdraw.userId,
      },
    });

    const bonusProgressions = await transactionManager.userBonusProgression.findMany({
      where: {
        bonusBalanceId: {
          in: consumedBonuses.map((c) => c.id),
        },
      },
      select: {
        id: true,
        bonusBalanceId: true,
      },
    });

    const bonusProgressionsMap = new Map<number, { id: string }>();
    for (const bonusProgression of bonusProgressions) {
      if (bonusProgression.bonusBalanceId) {
        bonusProgressionsMap.set(bonusProgression.bonusBalanceId, { id: bonusProgression.id });
      }
    }

    const bonusUsed = consumedBonuses.map((c) => ({
      amount: c.balance,
      bonusId: c.bonusId,
      progressionId: bonusProgressionsMap.get(c.id)?.id,
      balanceExpirationDate: c.expiresAt,
    })).filter((b): b is {
      amount: Decimal;
      bonusId: string;
      progressionId: string;
      balanceExpirationDate: Date;
    } => b.progressionId !== undefined);

    this.eventEmitter.emit(
      EventNamespace.USER_WITHDRAWAL,
      new WithdrawalEvent({
        amount: new Decimal(pointsToUsd(Number(createWithdraw.amount))),
        userId: createWithdraw.userId,
        pmId: user?.partnerMatrixId || undefined,
        pmBtag: user?.partnerMatrixBtag || undefined,
        status: transaction?.status as TransactionStatus ?? TransactionStatuses.SUCCESS,
        balance,
      }),
    );

    return { bonusUsed };
  }

  async revertWithdrawal(
    withdrawal: WithdrawalRequest,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction | null> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.revertWithdrawal(withdrawal, client);
      });
    }

    const withdrawalMetadata = withdrawal.metadata as WithdrawalRequestMetadata | null;
    let remainingAmount = new Decimal(usdtToPoints(Number(withdrawal.usdAmount)));
    const transactions: CreateTransaction[] = [];

    if (withdrawalMetadata && withdrawalMetadata.bonus?.length > 0) {
      for (const bonus of withdrawalMetadata.bonus) {
        const bonusTransaction = await this.bonusProgressionService.restoreWithdrawalBonusBalance({
          withdrawalId: withdrawal.id,
          bonusWithdrawal: bonus,
        }, transactionManager);
        if (bonusTransaction) {
          transactions.push(bonusTransaction);
          remainingAmount = remainingAmount.sub(bonus.amount);
        }
      }
    }

    if (remainingAmount.gt(0)) {
      await this.makeRestore(
        withdrawal.userId,
        remainingAmount,
        transactionManager,
      );
      transactions.push({
        amount: remainingAmount,
        counterParty: TransactionCounterParties.WITHDRAWAL_SERVICE,
        referenceId: withdrawal.id,
        operationType: TransactionOperationTypes.CREDIT,
        targetBalance: TransactionTargetBalances.ACCOUNT_BALANCE,
        status: TransactionStatuses.SUCCESS,
        userId: withdrawal.userId,
      });
    }

    await this.transactionLedgerService.createMany(transactions, transactionManager);

    const balance = await this.getBalanceAndBonusBalance(
      withdrawal.userId,
      transactionManager,
    );

    const restoreTransaction = await transactionManager.transaction.findFirst({
      where: {
        userId: withdrawal.userId,
        referenceId: withdrawal.id,
        operationType: TransactionOperationTypes.CREDIT,
      },
    });
    if (restoreTransaction) {
      this.eventEmitter.emit(
        EventNamespace.USER_RESTORE_TOKENS,
        new WithdrawalEvent({
          amount: new Decimal(usdtToPoints(Number(withdrawal.usdAmount))),
          userId: withdrawal.userId,
          status: restoreTransaction.status as TransactionStatus,
          balance,
        }),
      );
    }
    return restoreTransaction;
  }

  /**
   *  Decrement the user's balance by the given amount
   *  It also checks if the user's balance is enough to make the decrement
   * @param userId
   * @param amount
   * @param transactionManager
   * @returns
   */
  async decrementUserBalance(
    userId: string,
    amount: Decimal,
    transactionManager?: PrismaTransactionManager,
    increasePlayVolume = false,
    allowNegativeBalance = false,
  ): Promise<boolean> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.decrementUserBalance(userId, amount, client);
      });
    }
    const client = this.getClient(transactionManager);
    const balance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
        volumePlayed: true,
      },
    });
    if (!balance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'decrementUserBalance',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }

    if (balance.balance.lessThan(amount) && !allowNegativeBalance) {
      this.logger.error(
        {
          message: ErrorMessages.INSUFFICIENT_BALANCE,
          userId,
          currentBalance: balance.balance,
          desiredAmount: amount,
        },
        'decrementUserBalance',
      );

      throw new InsufficientBalanceError({
        currentAmount: balance.balance,
        desiredAmount: amount,
        userId,
      });
    }

    const newBalance = balance.balance.sub(amount);
    const newVolumePlayed = increasePlayVolume
      ? balance.volumePlayed.add(amount)
      : balance.volumePlayed;
    await client.balance.update({
      where: {
        userId,
      },
      data: {
        balance: newBalance,
        volumePlayed: newVolumePlayed,
      },
    });
    return true;
  }

  /**
   * Increment the user's balance by the given amount
   * @param userId
   * @param amount
   * @param transactionManager
   * @returns
   */
  async incrementUserBalance(
    userId: string,
    amount: Decimal,
    transactionManager?: PrismaTransactionManager,
  ): Promise<boolean> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.incrementUserBalance(userId, amount, client);
      });
    }
    const client = this.getClient(transactionManager);
    const balance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
      },
    });
    if (!balance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'incrementUserBalance',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }

    const newBalance = balance.balance.add(amount);

    await client.balance.update({
      where: {
        userId,
      },
      data: {
        balance: newBalance,
      },
    });
    return true;
  }

  async issueTokens(
    targetId: string,
    issuerId: string,
    amount: Decimal,
    transactionManager?: PrismaTransactionManager,
  ): Promise<boolean> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.issueTokens(targetId, issuerId, amount, client);
      });
    }
    const client = this.getClient(transactionManager);
    const targetBalance = await client.balance.findUnique({
      where: {
        userId: targetId,
      },
      select: {
        balance: true,
        totalIssuedTo: true,
        totalSettled: true,
      },
    });
    if (!targetBalance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          targetId,
        },
        'issueTokens',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }
    const newBalance = targetBalance.balance.add(amount);

    const issuerBalance = await client.balance.findUnique({
      where: {
        userId: issuerId,
      },
      select: {
        balance: true,
      },
    });
    if (!issuerBalance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          issuerId,
        },
        'issueTokens',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }
    if (issuerBalance.balance.lessThan(amount)) {
      this.logger.error(
        {
          message: ErrorMessages.INSUFFICIENT_BALANCE,
          issuerId,
          currentBalance: issuerBalance.balance,
          desiredAmount: amount,
        },
        'issueTokens',
      );

      throw new InsufficientBalanceError({
        currentAmount: issuerBalance.balance,
        desiredAmount: amount,
        userId: issuerId,
      });
    }
    const newIssuerBalance = issuerBalance.balance.sub(amount);
    const newTotalIssued = targetBalance.totalIssuedTo.add(amount);

    await client.balance.update({
      where: {
        userId: targetId,
      },
      data: {
        balance: newBalance,
        totalIssuedTo: newTotalIssued,
      },
    });

    await client.balance.update({
      where: {
        userId: issuerId,
      },
      data: {
        balance: newIssuerBalance,
      },
    });
    return true;
  }

  async issueTokensWithoutDecrement(
    params: { userId: string; amount: Decimal; debt: Decimal },
    transactionManager?: PrismaTransactionManager,
  ): Promise<boolean> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.issueTokensWithoutDecrement(params, client);
      });
    }
    const { userId, amount, debt } = params;
    const client = this.getClient(transactionManager);
    const targetBalance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
        totalIssuedTo: true,
        totalSettled: true,
        debt: true,
      },
    });
    if (!targetBalance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'issueTokens',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }
    const newBalance = targetBalance.balance.add(amount);

    const newTotalIssued = targetBalance.totalIssuedTo.add(amount);

    const newDebt = targetBalance.debt.add(debt);

    await client.balance.update({
      where: {
        userId,
      },
      data: {
        balance: newBalance,
        totalIssuedTo: newTotalIssued,
        debt: newDebt,
      },
    });
    return true;
  }

  /**
   * Make a deposit to the user's balance. It also updates the total deposit amount.
   * @param userId
   * @param amount
   * @param transactionManager
   * @returns
   * @throws {@link NotFoundError} if the user's balance is not found
   */
  async makeDeposit(
    userId: string,
    amount: Decimal,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Balance> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.makeDeposit(userId, amount, client);
      });
    }
    const client = this.getClient(transactionManager);
    const currentBalance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
        totalDeposit: true,
      },
    });
    if (!currentBalance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'makeDeposit',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }
    const newBalance = currentBalance.balance.add(amount);
    const newTotalDeposit = currentBalance.totalDeposit.add(amount);

    return client.balance.update({
      where: {
        userId,
      },
      data: {
        balance: newBalance,
        totalDeposit: newTotalDeposit,
      },
    });
  }

  /**
   * Make a withdraw from the user's balance. It also updates the total withdraw amount.
   * @param userId
   * @param amount
   * @param transactionManager
   * @returns
   * @throws {@link NotFoundError} if the user's balance is not found
   * @throws {@link InsufficientBallanceError} if the user's balance is not enough to make the withdraw
   */
  async makeWithdraw(
    userId: string,
    amount: Decimal,
    withdrawalId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    consumedBonuses: UserBonusBalance[];
    consumedBalance: Decimal;
    transaction: Transaction | undefined;
  }> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.makeWithdraw(userId, amount, withdrawalId, client);
      });
    }
    const client = this.getClient(transactionManager);
    const currentBalance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
      },
    });

    if (!currentBalance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'makeWithdraw',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }

    const withdrawableBalance = await this.bonusBalanceService.getUserWithdrawableBonusBalance(userId, transactionManager);

    const totalBalance = currentBalance.balance.plus(withdrawableBalance);

    if (totalBalance.lessThan(amount)) {
      this.logger.error(
        {
          message: 'Insufficient balance to make withdraw',
          userId,
          currentBalance: totalBalance,
          desiredAmount: amount,
        },
        'makeWithdraw',
      );

      throw new InsufficientBalanceError({
        currentAmount: totalBalance,
        desiredAmount: amount,
        userId,
      });
    }
    let balanceTransaction: Transaction | undefined;

    const balanceWithdrawable = currentBalance.balance.gte(amount) ? amount : currentBalance.balance;
    const remainingAmount = amount.sub(balanceWithdrawable);

    if (balanceWithdrawable.gt(0)) {
      const newBalance = currentBalance.balance.sub(balanceWithdrawable);
      await client.balance.update({
        where: {
          userId,
        },
        data: {
          balance: newBalance,
        },
      });
      balanceTransaction = await this.transactionLedgerService.create(
        {
          amount: balanceWithdrawable,
          userId,
          referenceId: withdrawalId,
          counterParty: TransactionCounterParties.WITHDRAWAL_SERVICE,
          operationType: TransactionOperationTypes.DEBIT,
          status: TransactionStatuses.SUCCESS,
          targetBalance: TransactionTargetBalances.ACCOUNT_BALANCE
        },
        transactionManager,
      );
    }

    const consumedBonuses: UserBonusBalance[] = [];

    if (remainingAmount.gt(0)) {
      const { consumedBonuses: consumedBonusesFromBonusBalanceService, transactions } = await this.bonusBalanceService.consumeWithdrawalBonusBalance(
        userId,
        remainingAmount,
        withdrawalId,
        transactionManager,
      );
      consumedBonuses.push(...consumedBonusesFromBonusBalanceService);
      balanceTransaction = transactions.at(-1);
    }
    return {
      consumedBonuses,
      consumedBalance: balanceWithdrawable,
      transaction: balanceTransaction,
    }
  }

  async makeRestore(
    userId: string,
    amount: Decimal,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Balance> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.makeRestore(userId, amount, client);
      });
    }
    const client = this.getClient(transactionManager);
    const currentBalance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
      },
    });
    if (!currentBalance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'makeRestore',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }
    const newBalance = currentBalance.balance.add(amount);

    return client.balance.update({
      where: {
        userId,
      },
      data: {
        balance: newBalance,
      },
    });
  }

  async settleAggregateBet(
    settleData: SettleAggregateBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    updatedBalance: Balance;
    transaction: Transaction | undefined;
  }> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.settleAggregateBet(settleData, client);
      });
    }
    const {
      userId,
      betId,
      provider,
      creditAmount,
      aggregateBetValue,
      aggregateBetCredit,
    } = settleData;

    let transaction: Transaction | undefined;
    if (creditAmount.greaterThan(0)) {
      transaction = await this.transactionLedgerService.create(
        {
          amount: creditAmount,
          userId,
          referenceId: betId,
          counterParty: provider,
          operationType: TransactionOperationTypes.CREDIT,
          status: TransactionStatuses.SUCCESS,
        },
        transactionManager,
      );
    }
    const balance = await this.prismaService.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
        biggestLoss: true,
        biggestWin: true,
        totalLoss: true,
        totalWin: true,
      },
    });
    if (!balance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'settleBet',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }
    const updateStatements: Prisma.BalanceUpdateInput = {};

    if (creditAmount.gt(0)) {
      updateStatements.balance = balance.balance.add(creditAmount);
    }

    const totalSettleAmount = aggregateBetCredit.sub(aggregateBetValue);

    const updateValues = this.getStatisticsUpdatePayload(
      totalSettleAmount,
      aggregateBetCredit,
      balance,
    );
    Object.assign(updateStatements, updateValues);

    const updatedBalance = await this.prismaService.balance.update({
      where: {
        userId,
      },
      data: updateStatements,
    });

    return {
      updatedBalance,
      transaction,
    };
  }

  async rollbackBetPlacing(
    refundData: RefundBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<void> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.rollbackBetPlacing(refundData, client);
      });
    }

    const { remainingAmount } =
      await this.bonusProgressionService.restoreWageringBonusBalance(
        {
          betInfo: {
            referenceId: refundData.thirdPartyIdentifier,
            counterParty: refundData.provider,
          },
          userId: refundData.userId,
          creditAmount: refundData.creditAmount,
          bonusUsedMetadata:
            (refundData.metadata as BetBonusMetadata | undefined)?.bonusUsed ??
            [],
        },
        transactionManager,
      );
    if (remainingAmount.gt(0)) {
      await this.incrementUserBalance(
        refundData.userId,
        remainingAmount,
        transactionManager,
      );
    }
  }

  async rollbackRefundBet(
    refundData: PlaceBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<void> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.rollbackRefundBet(refundData, client);
      });
    }

    const { remainingAmount } =
      await this.bonusBalanceService.rollbackRefundBet(
        refundData,
        transactionManager,
      );

    await this.decrementUserBalance(
      refundData.userId,
      remainingAmount,
      transactionManager,
      false,
      true,
    );
    await this.transactionLedgerService.create(
      {
        amount: remainingAmount,
        userId: refundData.userId,
        referenceId: refundData.bet.thirdPartyIdentifier,
        counterParty: refundData.provider,
        operationType: TransactionOperationTypes.CREDIT,
        status: TransactionStatuses.SUCCESS,
      },
      transactionManager,
    );
  }

  async refundBet(
    refundData: RefundBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    updatedBalance: Balance;
    accountBalanceCredit: Decimal;
    transaction: Transaction | undefined;
  }> {
    if (!transactionManager) {
      return await this.prismaService.$transaction(async (client) => {
        return await this.refundBet(refundData, client);
      });
    }
    const {
      betValue,
      creditAmount,
      userId,
      betId,
      provider,
      updateStatistics,
      thirdPartyIdentifier,
      metadata,
    } = refundData;
    // Check if the bet has tip bonus used
    const wageringBonusBet =
      (refundData.metadata as unknown as BetBonusMetadata)?.bonusUsed ?? [];
    let remainingCreditAmount = new Decimal(creditAmount);

    const { remainingAmount } =
      wageringBonusBet.length > 0
        ? await this.bonusProgressionService.restoreWageringBonusBalance(
          {
            creditAmount: remainingCreditAmount,
            betInfo: {
              counterParty: provider,
              referenceId: betId,
            },
            bonusUsedMetadata: wageringBonusBet,
            userId,
          },
          transactionManager,
        )
        : { remainingAmount: remainingCreditAmount };
    remainingCreditAmount = remainingAmount;

    // If there is remaining credit amount, refund the bonus balance and update the remaining credit amount
    if (remainingCreditAmount.gt(0)) {
      const result = await this.bonusBalanceService.refundBonusBalance(
        {
          betId,
          userId,
          thirdPartyIdentifier,
          revertAmount: remainingAmount,
          provider,
          metadata,
        },
        transactionManager,
      );

      remainingCreditAmount = result.remainingAmount;
    }

    // If there is remaining credit amount, create a transaction
    const result = await this.updateBalanceWithRemainingCreditAmount({
      remainingCreditAmount,
      userId,
      betId,
      provider,
      transactionManager,
      settleAmount: undefined,
      betValue,
      creditAmount,
      updateStatistics,
    });
    return {
      updatedBalance: result.updatedBalance,
      accountBalanceCredit: remainingCreditAmount,
      transaction: result.transaction,
    };
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async settleBet(
    settleData: SettleBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    updatedBalance: Balance;
    transaction: Transaction | undefined;
    accountBalanceCredit: Decimal;
    bonusBalanceChange: {
      bonusBalanceId: number;
      balanceChange: Decimal;
    }[];
  }> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.settleBet(settleData, client);
      });
    }
    const {
      betValue,
      userId,
      betId,
      creditAmount,
      provider,
      updateStatistics,
      metadata,
    } = settleData;
    const rawSettleMetadata = ((metadata as BetMetadata) ?? {}).settleBet ?? [];

    const settleAmount =
      Array.isArray(rawSettleMetadata) && rawSettleMetadata.length === 0
        ? betValue
          ? new Decimal(creditAmount).sub(betValue)
          : undefined
        : new Decimal(creditAmount);

    let remainingCreditAmount = new Decimal(creditAmount);
    let bonusBalanceChange: {
      bonusBalanceId: number;
      balanceChange: Decimal;
    }[] = [];
    if (creditAmount && creditAmount.gt(0)) {
      const { remainingAmount, balanceChange } =
        await this.bonusProgressionService.incrementWageringBonusBalance(
          {
            creditAmount: remainingCreditAmount,
            betInfo: {
              counterParty: provider,
              referenceId: betId,
            },
            userId,
            bonusUsedMetadata: (metadata as BetBonusMetadata)?.bonusUsed || [],
          },
          transactionManager,
        );
      remainingCreditAmount = remainingAmount;
      bonusBalanceChange = balanceChange;
    }

    const result = await this.updateBalanceWithRemainingCreditAmount({
      remainingCreditAmount,
      userId,
      betId,
      provider,
      transactionManager,
      betValue,
      settleAmount,
      creditAmount,
      updateStatistics,
    });
    return {
      updatedBalance: result.updatedBalance,
      transaction: result.transaction,
      accountBalanceCredit: remainingCreditAmount,
      bonusBalanceChange,
    };
  }

  private async updateBalanceWithRemainingCreditAmount(params: {
    remainingCreditAmount: Prisma.Decimal;
    userId: string;
    betId: string;
    provider: TransactionCounterParty;
    transactionManager: PrismaTransactionManager;
    betValue: Prisma.Decimal | undefined;
    creditAmount: Prisma.Decimal;
    settleAmount: Prisma.Decimal | undefined;
    updateStatistics: boolean;
  }): Promise<{
    updatedBalance: Balance;
    transaction: Transaction | undefined;
  }> {
    const {
      remainingCreditAmount,
      userId,
      betId,
      provider,
      transactionManager,
      settleAmount,
      updateStatistics,
    } = params;
    let transaction: Transaction | undefined;
    if (remainingCreditAmount.greaterThan(0)) {
      transaction = await this.transactionLedgerService.create(
        {
          amount: remainingCreditAmount,
          userId,
          referenceId: betId,
          counterParty: provider,
          operationType: TransactionOperationTypes.CREDIT,
          status: TransactionStatuses.SUCCESS,
          targetBalance: TransactionTargetBalances.ACCOUNT_BALANCE,
        },
        transactionManager,
      );
    }

    // Find the balance
    const balance = await transactionManager.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
        biggestLoss: true,
        biggestWin: true,
        totalLoss: true,
        totalWin: true,
      },
    });

    if (!balance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'settleBet',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }

    const updateStatements: Prisma.BalanceUpdateInput = {};

    // Update the balance
    if (remainingCreditAmount.gt(0)) {
      updateStatements.balance = balance.balance.add(remainingCreditAmount);
    }

    // Update the statistics
    if (updateStatistics && settleAmount) {
      const updateValues = this.getStatisticsUpdatePayload(
        settleAmount,
        remainingCreditAmount,
        balance,
      );
      Object.assign(updateStatements, updateValues);
    }

    // Update the balance
    const updatedBalance = await transactionManager.balance.update({
      where: {
        userId,
      },
      data: updateStatements,
    });
    return { updatedBalance, transaction };
  }

  private getStatisticsUpdatePayload(
    settleAmount: Prisma.Decimal,
    creditAmount: Prisma.Decimal,
    balance: {
      totalWin: Prisma.Decimal;
      totalLoss: Prisma.Decimal;
      biggestWin: Prisma.Decimal;
      biggestLoss: Prisma.Decimal;
    },
  ): Prisma.BalanceUpdateInput {
    const updateStatements: Prisma.BalanceUpdateInput = {};
    // If the bet is a win and resulted in a profit, update the total win and biggest win
    if (settleAmount.gt(0) && balance.biggestWin.lt(creditAmount)) {
      updateStatements.biggestWin = settleAmount;
    }
    // If the bet is a loss or a partial loss, update the total loss and biggest loss
    if (settleAmount.lt(0) && balance.biggestLoss.lt(settleAmount.abs())) {
      updateStatements.biggestLoss = settleAmount.abs();
    }
    return updateStatements;
  }

  /**
   * Updates user's balance with the given amount by performing an addition
   * @param userId
   * @param modifyAmount
   * @param betAmount
   * @param transactionManager
   * @returns
   */
  async fixBalanceOnBetUpdate(
    userId: string,
    modifyAmount: Decimal,
    previousStatus: BetStatus,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Balance> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.fixBalanceOnBetUpdate(
          userId,
          modifyAmount,
          previousStatus,
          client,
        );
      });
    }
    const client = this.getClient(transactionManager);

    const currentBalance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        userId: true,
        balance: true,
      },
    });

    if (!currentBalance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_BALANCE_NOT_FOUND,
          userId,
        },
        'resolveBet',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }

    const newBalance = currentBalance.balance.plus(modifyAmount);

    return client.balance.update({
      where: {
        userId,
      },
      data: {
        balance: newBalance,
      },
    });
  }

  /**
   *
   * @param userId
   * @param amount
   * @param transactionManager
   * @param exposure The amount that will be added to the balance if it is negative
   * @returns
   * @throws {@link NotFoundError} if the user's balance is not found
   */
  async placeBet(
    params: PlaceBet,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    balance: Balance;
    consumedAccountBalance: Decimal;
    consumedBonusBalance?: Decimal;
    transaction: Transaction;
    bonusUsed: BetBonusMetadata['bonusUsed'];
  }> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.placeBet(params, client);
      });
    }
    const { balanceChange, betAmount, provider, referenceId, userId } = params;
    const client = this.getClient(transactionManager);
    const currentBalance = await client.balance.findUnique({
      where: {
        userId,
      },
      select: {
        balance: true,
        volumePlayed: true,
      },
    });

    let bonusConsumptionResult: {
      remainingAmount: Decimal;
      transactions?: CreateBonusTransaction[];
      bonusUsed: BetBonusMetadata['bonusUsed'];
    } = { remainingAmount: balanceChange, bonusUsed: [] };

    // Consume bonus balance if the bet deducts from the balance
    if (balanceChange.isPositive()) {
      bonusConsumptionResult =
        await this.bonusBalanceService.consumeBonusBalance(
          params,
          transactionManager,
        );
    } else if (params.metadata && params.metadata?.roundId) {
      // Consume tip balance if the bet deducts from the balance
      // This is used for the case where a user places multiple bets in a round
      const usedBonusesBets = await client.bet.findMany({
        where: {
          userId,
          status: BetStatuses.PENDING,
          metadata: {
            path: ['placeBet', 'roundId'],
            equals: params.metadata.roundId,
          },
          provider: BetProviders.SPORTS_EXCHANGE,
        },
      });

      const bonusesUsed = usedBonusesBets.flatMap(
        (b) => (b.metadata as unknown as BetBonusMetadata)?.bonusUsed,
      );

      const { remainingAmount, transactions } =
        await this.bonusProgressionService.incrementWageringBonusBalance(
          {
            betInfo: {
              referenceId,
              counterParty: provider,
            },
            userId,
            creditAmount: balanceChange.abs(),
            bonusUsedMetadata: bonusesUsed,
          },
          transactionManager,
        );
      bonusConsumptionResult = {
        remainingAmount: remainingAmount.negated(),
        bonusUsed: [],
        transactions,
      };
    }

    const { remainingAmount, transactions, bonusUsed } = bonusConsumptionResult;

    const consumedBonusBalance = transactions?.reduce((sum, transaction) => {
      return sum.plus(transaction.amount);
    }, new Decimal(0));

    const availableBalance = this.verifyBalanceOnBetPlacement({
      currentBalance,
      userId,
      amount: remainingAmount,
    });

    const transaction = {
      amount: remainingAmount.abs(),
      counterParty: provider,
      operationType: remainingAmount.isNegative()
        ? TransactionOperationTypes.CREDIT
        : TransactionOperationTypes.DEBIT,
      referenceId,
      status: TransactionStatuses.SUCCESS,
      userId,
    };

    const savedTransaction = await this.transactionLedgerService.create(
      transaction,
      transactionManager,
    );

    const newBalance = availableBalance.balance.sub(remainingAmount);

    const newTotalBet = availableBalance.volumePlayed.add(betAmount);

    const updatedBalance = await client.balance.update({
      where: {
        userId,
      },
      data: {
        balance: newBalance,
        volumePlayed: newTotalBet,
      },
    });

    return {
      balance: updatedBalance,
      consumedAccountBalance: remainingAmount,
      consumedBonusBalance,
      transaction: savedTransaction,
      bonusUsed,
    };
  }

  private verifyBalanceOnBetPlacement({
    amount,
    currentBalance,
    userId,
  }: {
    currentBalance: {
      balance: Prisma.Decimal;
      volumePlayed: Prisma.Decimal;
    } | null;
    userId: string;
    amount: Prisma.Decimal;
  }): {
    balance: Prisma.Decimal;
    volumePlayed: Prisma.Decimal;
  } {
    if (!currentBalance) {
      this.logger.error(
        {
          message: 'Balance Not Found',
          userId,
        },
        'placeBet',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }
    if (amount.greaterThan(0) && currentBalance.balance.lessThan(amount)) {
      this.logger.error(
        {
          message: 'Insufficient balance',
          userId,
          currentBalance: currentBalance.balance,
          desiredAmount: amount,
        },
        'placeBet',
      );

      throw new InsufficientBalanceError({
        currentAmount: currentBalance.balance,
        desiredAmount: amount,
        userId,
      });
    }
    return currentBalance;
  }

  async updateTotalWithdrawal(
    userId: string,
    amount: Decimal,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Balance> {
    const client = this.getClient(transactionManager);
    const currentWithdrawal = await client.balance.findFirst({
      where: {
        userId,
      },
      select: {
        totalWithdraw: true,
      },
    });

    if (!currentWithdrawal) {
      this.logger.error(
        {
          message: 'Balance Not Found',
          userId,
        },
        'updateTotalWithdrawal',
      );

      throw new NotFoundError(ErrorMessages.USER_BALANCE_NOT_FOUND);
    }

    const newTotalWithdraw = currentWithdrawal.totalWithdraw.add(amount);

    return await client.balance.update({
      where: {
        userId,
      },
      data: {
        totalWithdraw: newTotalWithdraw,
      },
    });
  }

  async create(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Balance> {
    const client = this.getClient(transactionManager);
    return client.balance.create({
      data: {
        userId,
      },
    });
  }

  async updateStatistics(
    userId: string,
    data: Pick<
      Prisma.BalanceUpdateInput,
      'totalWin' | 'totalLoss' | 'biggestLoss' | 'biggestWin' | 'volumePlayed'
    >,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Balance> {
    const client = this.getClient(transactionManager);
    return client.balance.update({
      where: {
        userId,
      },
      data,
    });
  }

  async getExchangeRates(): Promise<{
    solUsdt: string | null;
    ethUsdt: string | null;
    trxUsdt: string | null;
    solUsdc: string | null;
    ethUsdc: string | null;
    trxUsdc: string | null;
  }> {
    const [solUsdt, ethUsdt, trxUsdt, solUsdc, ethUsdc, trxUsdc] = await Promise.all([
      this.redis.get(REDIS_KEY__BINANCE_SOL_USDT),
      this.redis.get(REDIS_KEY__BINANCE_ETH_USDT),
      this.redis.get(REDIS_KEY__BINANCE_TRX_USDT),
      this.redis.get(REDIS_KEY__BINANCE_SOL_USDC),
      this.redis.get(REDIS_KEY__BINANCE_ETH_USDC),
      this.redis.get(REDIS_KEY__BINANCE_TRX_USDC),
    ]);

    return {
      solUsdt,
      ethUsdt,
      trxUsdt,
      solUsdc,
      ethUsdc,
      trxUsdc,
    };
  }

  async getWidgetExchangeRates(): Promise<{
    usdtUsd: string | null;
    usdtEur: string | null;
    usdtPhp: string | null;
    usdcUsd: string | null;
    usdcEur: string | null;
    usdcPhp: string | null;
  }> {
    const [usdtUsd, usdtEur, usdtPhp, usdcUsd, usdcEur, usdcPhp] = await Promise.all([
      this.redis.get(REDIS_KEY__TATUM_USDT_USD),
      this.redis.get(REDIS_KEY__TATUM_USDT_EUR),
      this.redis.get(REDIS_KEY__TATUM_USDT_PHP),
      this.redis.get(REDIS_KEY__TATUM_USDC_USD),
      this.redis.get(REDIS_KEY__TATUM_USDC_EUR),
      this.redis.get(REDIS_KEY__TATUM_USDC_PHP),
    ]);

    return {
      usdtUsd,
      usdtEur,
      usdtPhp,
      usdcUsd,
      usdcEur,
      usdcPhp,
    };
  }

  getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
