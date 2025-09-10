// eslint-disable-next-line no-unused-vars
import { NotFoundError } from '@common/error/not-found.error';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { EventNamespace } from '@infrastructure/event/namespace';
import { BalanceService } from '@modules/balance/service/balance.service';
import { MasterTokenIssueEvent } from '@modules/transaction-ledger/event/master-token-issue.event';
import {
  CreateDepositTransaction,
  CreateTransaction,
  BalanceAdjustmentWithUserDetails,
} from '@modules/transaction-ledger/types';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Transaction } from '@prisma/client';
import { TransactionStatus, TransactionStatuses } from '../enum/status.enum';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { MasterTokenIssueLockEvent } from '@modules/transaction-ledger/event/master-token-issue-lock.event';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { MasterTokenIssueRestoreEvent } from '@modules/transaction-ledger/event/master-token-issue-restore.event';
import { MasterTokenUpdateEvent } from '@modules/transaction-ledger/event/master-token-update.event';
import { MasterTokenSettlementEvent } from '@modules/transaction-ledger/event/master-token-settlement.event';
import { UserBalanceAdjustmentEvent } from '@modules/transaction-ledger/event/user-balance-adjustment.event';
import { PagePaginationResponse } from '@common/types';
import { EventService } from '@infrastructure/event/service/event.service';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import { TransactionTargetBalance } from '@modules/transaction-ledger/enum/target-balance.enum';

type Wrapper<T> = T;

@Injectable()
export class TransactionLedgerService {
  private readonly logger = new Logger(TransactionLedgerService.name);
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => BalanceService))
    private readonly balanceService: Wrapper<BalanceService>,
    private readonly eventEmitter: EventEmitter2,
    private readonly eventService: EventService,
  ) {}

  async getBalanceAdjustmentsWhere(
    filter: Omit<Prisma.TransactionWhereInput, 'counterParty'>,
    page = 1,
    limit = 10,
  ): Promise<PagePaginationResponse<BalanceAdjustmentWithUserDetails>> {
    const count = await this.prismaService.transaction.count({
      where: {
        ...filter,
        counterParty: TransactionCounterParties.MANUAL_ADJUSTMENT,
      },
    });

    const data = await this.prismaService.transaction.findMany({
      where: {
        ...filter,
        counterParty: TransactionCounterParties.MANUAL_ADJUSTMENT,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const userDetails = await this.prismaService.user.findMany({
      where: {
        id: {
          in: data.reduce((acc: string[], curr: Transaction) => {
            if (curr.userId) acc.push(curr.userId);
            if (curr.referenceId) acc.push(curr.referenceId);
            return acc;
          }, []),
        },
      },
      select: {
        id: true,
        email: true,
        nickname: true,
      },
    });
    const userDetailsMap = userDetails.reduce((acc, curr) => {
      acc.set(curr.id, curr);
      return acc;
    }, new Map());

    const dataWithUserDetails = data.map((transaction) => {
      const user = userDetailsMap.get(transaction.userId);
      const reference = userDetailsMap.get(transaction.referenceId);
      return {
        ...transaction,
        user,
        master: reference,
      };
    });

    return {
      data: dataWithUserDetails,
      limit,
      page,
      total: count,
    };
  }

  /**
   *
   * @param
   * @param transactionManager
   * @returns
   * @emits - {@link EventNamespace.MASTER_TOKEN_SETTLEMENT_RESTORE} - Emits an event when a master issues tokens to a user
   */
  async restoreUserTokens(
    {
      amount,
      userId,
      tokenRequestId,
    }: { userId: string; amount: Decimal; tokenRequestId: string },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.restoreUserTokens(
          { userId, amount, tokenRequestId },
          client,
        );
      });
    }

    const transaction = await this.create(
      {
        amount,
        counterParty: TransactionCounterParties.MASTER_TOKEN_SETTLEMENT,
        operationType: TransactionOperationTypes.RESTORE,
        referenceId: tokenRequestId,
        status: TransactionStatuses.SUCCESS,
        userId,
      },
      transactionManager,
    );
    await this.balanceService.incrementUserBalance(
      userId,
      amount,
      transactionManager,
    );

    this.eventEmitter.emit(
      EventNamespace.MASTER_TOKEN_SETTLEMENT_RESTORE,
      new MasterTokenSettlementEvent({
        amount,
        transactionId: transaction.id,
        masterId: userId,
      }),
    );

    return transaction;
  }

  /**
   *
   * @param
   * @param transactionManager
   * @returns
   * @emits - {@link EventNamespace.MASTER_TOKEN_ISSUE_LOCK} - Emits an event when a master issues tokens to a user
   */
  async restoreMasterTokens(
    {
      amount,
      masterId,
      tokenRequestId,
    }: { masterId: string; amount: Decimal; tokenRequestId: string },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.restoreMasterTokens(
          { masterId, amount, tokenRequestId },
          client,
        );
      });
    }

    const transaction = await this.create(
      {
        amount,
        counterParty: TransactionCounterParties.MASTER_TOKEN_ISSUE,
        operationType: TransactionOperationTypes.RESTORE,
        referenceId: tokenRequestId,
        status: TransactionStatuses.SUCCESS,
        userId: masterId,
      },
      transactionManager,
    );
    await this.balanceService.incrementUserBalance(
      masterId,
      amount,
      transactionManager,
    );

    this.eventEmitter.emit(
      EventNamespace.MASTER_TOKEN_ISSUE_RESTORE,
      new MasterTokenIssueRestoreEvent({
        amount,
        transactionId: transaction.id,
        masterId,
      }),
    );

    return transaction;
  }

  /**
   *
   * @param createMasterTokenIssue
   * @param transactionManager
   * @returns
   * @emits - {@link EventNamespace.MASTER_TOKEN_ISSUE_LOCK} - Emits an event when a master issues tokens to a user
   */
  async subtractMasterTokens(
    {
      amount,
      issuerId,
      tokenRequestId,
    }: { issuerId: string; amount: Decimal; tokenRequestId: string },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.subtractMasterTokens(
          { issuerId, amount, tokenRequestId },
          client,
        );
      });
    }

    const transaction = await this.create(
      {
        amount,
        counterParty: TransactionCounterParties.MASTER_TOKEN_ISSUE,
        operationType: 'DEBIT',
        referenceId: tokenRequestId,
        status: TransactionStatuses.SUCCESS,
        userId: issuerId,
      },
      transactionManager,
    );
    await this.balanceService.decrementUserBalance(
      issuerId,
      amount,
      transactionManager,
    );

    this.eventEmitter.emit(
      EventNamespace.MASTER_TOKEN_ISSUE,
      new MasterTokenIssueLockEvent({
        amount,
        transactionId: transaction.id,
        masterId: issuerId,
      }),
    );

    return transaction;
  }

  async incrementMasterTokens(
    {
      amount,
      masterId,
      tokenRequestId,
      operationType,
    }: {
      masterId: string;
      amount: Decimal;
      tokenRequestId: string;
      operationType: typeof TransactionCounterParties.MASTER_TOKEN_SETTLEMENT;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.incrementMasterTokens(
          { masterId, amount, tokenRequestId, operationType },
          client,
        );
      });
    }

    const transaction = await this.create(
      {
        amount,
        counterParty: operationType,
        operationType: TransactionOperationTypes.CREDIT,
        referenceId: tokenRequestId,
        status: TransactionStatuses.SUCCESS,
        userId: masterId,
      },
      transactionManager,
    );
    await this.balanceService.incrementUserBalance(
      masterId,
      amount,
      transactionManager,
    );

    if (operationType === TransactionCounterParties.MASTER_TOKEN_SETTLEMENT) {
      this.eventEmitter.emit(
        EventNamespace.MASTER_TOKEN_SETTLEMENT,
        new MasterTokenSettlementEvent({
          amount,
          transactionId: transaction.id,
          masterId,
        }),
      );
    }

    return transaction;
  }

  async updateUserBalance(
    {
      userId,
      amount,
      masterId,
    }: {
      userId: string;
      amount: Decimal;
      masterId: string;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.updateUserBalance({ masterId, userId, amount }, client);
      });
    }

    const transaction = await this.create(
      {
        amount,
        counterParty: TransactionCounterParties.MANUAL_ADJUSTMENT,
        operationType: amount.isNegative()
          ? TransactionOperationTypes.DEBIT
          : TransactionOperationTypes.CREDIT,
        referenceId: masterId,
        status: TransactionStatuses.SUCCESS,
        userId,
      },
      transactionManager,
    );
    if (amount.isNegative()) {
      await this.balanceService.decrementUserBalance(
        userId,
        amount.abs(),
        transactionManager,
      );
    } else {
      await this.balanceService.incrementUserBalance(
        userId,
        amount,
        transactionManager,
      );
    }

    this.eventEmitter.emit(
      EventNamespace.USER_BALANCE_ADJUSTMENT,
      new UserBalanceAdjustmentEvent({
        amount,
        userId,
        masterId,
        transactionId: transaction.id,
      }),
    );
    return transaction;
  }

  /**
   *
   * @param subtractUserTokens
   * @param transactionManager
   * @returns
   * @emits - @link EventNamespace.MASTER_TOKEN_SETTLEMENT} - Emits an event when a master subtracts tokens to a user
   */
  async subtractUserTokens(
    {
      amount,
      userId,
      masterId,
      referenceId,
      operationType,
    }: {
      userId: string;
      masterId: string;
      amount: Decimal;
      referenceId: string;
      operationType:
        | typeof TransactionCounterParties.MASTER_TOKEN_SETTLEMENT
        | typeof TransactionCounterParties.MASTER_TOKEN_ISSUE;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.subtractUserTokens(
          { masterId, userId, amount, referenceId, operationType },
          client,
        );
      });
    }

    const transaction = await this.create(
      {
        amount,
        counterParty: operationType,
        operationType: TransactionOperationTypes.DEBIT,
        referenceId,
        status: TransactionStatuses.SUCCESS,
        userId,
      },
      transactionManager,
    );
    await this.balanceService.decrementUserBalance(
      userId,
      amount,
      transactionManager,
    );
    switch (operationType) {
      case TransactionCounterParties.MASTER_TOKEN_SETTLEMENT:
        this.eventEmitter.emit(
          EventNamespace.MASTER_TOKEN_SETTLEMENT,
          new MasterTokenUpdateEvent({
            amount,
            userId,
            masterId,
            transactionId: transaction.id,
          }),
        );
        break;
      case TransactionCounterParties.MASTER_TOKEN_ISSUE:
        this.eventEmitter.emit(
          EventNamespace.MASTER_TOKEN_ISSUE,
          new MasterTokenUpdateEvent({
            amount,
            userId,
            masterId,
            transactionId: transaction.id,
          }),
        );
        break;
    }

    return transaction;
  }

  /**
   * It issues tokens to a user, increments the user's balance and emits an event
   * Also creates a transaction in the ledger
   * @param issueTokensToUser
   * @param transactionManager
   * @returns
   * @emits - {@link EventNamespace.MASTER_TOKEN_ISSUE} - Emits an event when a master issues tokens to a user
   */
  async issueTokensToUser(
    params: {
      targetId: string;
      amount: Decimal;
      tokenRequestId: string;
      debt: Decimal;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.issueTokensToUser(params, client);
      });
    }
    const { amount, debt, targetId, tokenRequestId } = params;
    const transaction = await this.create(
      {
        amount,
        counterParty: TransactionCounterParties.MASTER_TOKEN_ISSUE,
        operationType: TransactionOperationTypes.CREDIT,
        referenceId: tokenRequestId,
        status: TransactionStatuses.SUCCESS,
        userId: targetId,
      },
      transactionManager,
    );
    await this.balanceService.issueTokensWithoutDecrement(
      {
        debt,
        userId: targetId,
        amount,
      },
      transactionManager,
    );

    const balance =
      await this.balanceService.getBalanceAndBonusBalance(targetId);

    this.eventEmitter.emit(
      EventNamespace.MASTER_TOKEN_ISSUE,
      new MasterTokenIssueEvent({
        amount,
        transactionId: transaction.id,
        userId: targetId,
        status: transaction.status as TransactionStatus,
        balance,
      }),
    );

    return transaction;
  }

  /**
   *
   * @param createDeposit
   * @param transactionManager
   * @returns
   * @emits - {@link EventNamespace.USER_DEPOSIT} - Emits an event when a user makes a deposit
   */
  async createDeposit(
    createDeposit: CreateDepositTransaction,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.createDeposit(createDeposit, client);
      });
    }

    const transaction = await this.create(createDeposit, transactionManager);
    await this.balanceService.makeDeposit(
      createDeposit.userId,
      createDeposit.amount,
      transactionManager,
    );
    const balance = await this.balanceService.getBalanceAndBonusBalance(
      createDeposit.userId,
      transactionManager,
    );
    const user = await this.getClient(transactionManager).user.findUnique({
      where: {
        id: createDeposit.userId,
      },
    });
    this.eventService.emit(
      EventNamespace.USER_DEPOSIT,
      new UserDepositEvent({
        pointsAmount: createDeposit.amount,
        transactionId: transaction.id,
        userId: createDeposit.userId,
        pmId: user?.partnerMatrixId || undefined,
        pmBtag: user?.partnerMatrixBtag || undefined,
        status: createDeposit.status,
        balance,
      }),
    );
    return transaction;
  }

  async listDeposits(userId: string): Promise<Transaction[]> {
    return this.prismaService.transaction.findMany({
      where: {
        userId,
        operationType: TransactionOperationTypes.CREDIT,
        counterParty: TransactionCounterParties.DEPOSIT_SERVICE,
      },
    });
  }

  async listWithdrawals(userId: string): Promise<Transaction[]> {
    return this.prismaService.transaction.findMany({
      where: {
        userId,
        operationType: TransactionOperationTypes.DEBIT,
        counterParty: TransactionCounterParties.WITHDRAWAL_SERVICE,
      },
    });
  }

  async create(
    createTransaction: CreateTransaction,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    const client = this.getClient(transactionManager);
    return client.transaction.create({
      data: createTransaction,
    });
  }

  async createMany(
    createTransaction: CreateTransaction[],
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction[]> {
    const client = this.getClient(transactionManager);
    return await client.transaction.createManyAndReturn({
      data: createTransaction,
    });
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction> {
    const client = this.getClient(transactionManager);
    return client.transaction.update({
      where: { id },
      data: { status },
    });
  }

  async findByUserAndWithdraw(
    userId: string,
    withdrawId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<any> {
    const client = this.getClient(transactionManager);
    return client.transaction.findFirst({
      where: { userId, referenceId: withdrawId },
    });
  }

  async getByReferenceId(
    referenceId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction | null> {
    const client = this.getClient(transactionManager);
    return client.transaction.findFirst({
      where: { referenceId },
    });
  }

  async findByReferenceIdAndTargetBalance(
    referenceId: string,
    targetBalance: TransactionTargetBalance,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Transaction[]> {
    const client = this.getClient(transactionManager);
    return client.transaction.findMany({
      where: { referenceId, targetBalance },
    });
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager || this.prismaService;
  }
}
