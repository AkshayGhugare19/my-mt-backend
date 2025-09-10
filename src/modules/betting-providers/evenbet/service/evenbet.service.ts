import { ENV } from '@common/env';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { joinObjectToStringRecursive, sortObjectDeep } from '../utils';
import { EvenBetCreateSessionResponse, EvenbetLogoutResponse } from '../types';
import { BalanceService } from '@modules/balance/service/balance.service';
import { EvenBetError } from '../error';
import { pointsToUsd } from '@utils/points-to-usd';
import { UserService } from '@modules/user/services/user.service';
import { usdtToPoints } from '@utils/usdt-to-points';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { ONE_SECOND_IN_MS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { LockKeys } from '@common/enums/lock-keys.enum';
import { DeadlockGuard } from '@infrastructure/database/prisma/utils/deadlock-guard';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PagePaginationRequest, PagePaginationResponse } from '@common/types';
import { PermissionService } from '@modules/permission/service/permission.service';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { Prisma, Transaction } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNamespace } from '@infrastructure/event/namespace';
import {
  EvenbetCreditEvent,
  EvenbetDebitEvent,
} from '@infrastructure/event/classes';
import { decimalToNumber } from '@utils/decimal-do-number';
// import { BalanceAdjustmentWithUserDetails } from '@modules/transaction-ledger/types';

@Injectable()
export class EvenBetService {
  private readonly _logger = new Logger(EvenBetService.name);
  private readonly apiBaseUrl: string = this.configService.getOrThrow<string>(
    ENV.EVENBET_BASE_API_URL,
  );

  private readonly clientId: string = this.configService.getOrThrow<string>(
    ENV.EVENBET_CLIENT_ID,
  );

  private readonly secretKey: string = this.configService.getOrThrow<string>(
    ENV.EVENBET_SECRET_KEY,
  );

  private readonly signSecret: string = this.configService.getOrThrow<string>(
    ENV.EVENBET_SIGNING_SECRET,
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly balanceService: BalanceService,
    private readonly userService: UserService,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly deadlockGuard: DeadlockGuard,
    private readonly atomicLock: AtomicLock,
    private readonly prismaService: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public verifyEventSignature(rawEvent: string, signature: string): boolean {
    const payload = rawEvent + this.signSecret;
    const expectedSignature = createHash('sha256')
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  private generateQuerySignature(queryParams: Record<string, any>): string {
    const BLACKLIST_QUERY_PARAMS = [
      'clientId',
      'access-token',
      'action',
      'auth',
      'channel',
      'controller',
      'locale',
      'method',
      'module',
      'sign',
      'version',
      'per-page',
      'page',
      'sort',
    ];

    const clonedParams = structuredClone(queryParams);

    for (const key of BLACKLIST_QUERY_PARAMS) {
      delete clonedParams[key];
    }

    const sortedQueryParams = sortObjectDeep(clonedParams);
    const paramsString = joinObjectToStringRecursive(sortedQueryParams);

    const payload = paramsString + this.secretKey;
    return createHash('sha256').update(payload).digest('hex');
  }

  private async get<T>(
    path: string,
    queryParams: Record<string, any>,
  ): Promise<T> {
    const signature = this.generateQuerySignature(queryParams);

    const result = await this.httpService.axiosRef.get<T>(
      `${this.apiBaseUrl}${path}`,
      {
        params: queryParams,
        headers: {
          sign: signature,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      },
    );

    return result.data;
  }

  private async post<T>(
    path: string,
    queryParams: Record<string, any>,
  ): Promise<T> {
    const signature = this.generateQuerySignature(queryParams);

    try {
      const result = await this.httpService.axiosRef.post<T>(
        `${this.apiBaseUrl}${path}`,
        undefined,
        {
          params: queryParams,
          headers: {
            sign: signature,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      return result.data;
    } catch (ex) {
      this._logger.error(ex.response?.data);

      throw ex;
    }
  }

  async createSession(userId: string): Promise<{
    sessionId: string;
    redirectUrl: string;
  }> {
    const user = await this.userService.getUserInfo(userId);
    if (!user) {
      throw new EvenBetError('PLAYER_NOT_FOUND');
    }

    const result = await this.post<EvenBetCreateSessionResponse>(
      `/v2/app/users/${userId}/session`,
      {
        clientId: this.clientId,
        userId,
        gameCode: 'poker',
        authType: 'external',
        currency: 'USD',
        // nick: user.playerTag,
        longLifeLoginToken: true,
        // launchOptions: JSON.stringify({
        //   restoreSessionUrl: 'http://localhost:3000/new-pobkcer-session',
        // }),
      },
    );

    return {
      sessionId: result.data.attributes['session-id'],
      redirectUrl: result.data.attributes['redirect-url'],
    };
  }

  async logout(userId: string): Promise<EvenbetLogoutResponse> {
    const user = await this.userService.getUserInfo(userId);

    if (!user) {
      throw new EvenBetError('PLAYER_NOT_FOUND');
    }

    return await this.post<EvenbetLogoutResponse>(
      `/v2/app/users/${userId}/logout`,
      {
        clientId: this.clientId,
        userIds: userId,
      },
    );
  }

  async getBalanceAsUsdt(userId: string): Promise<number> {
    const balance = await this.balanceService.getBalance(userId);
    if (balance === null) {
      throw new EvenBetError('PLAYER_NOT_FOUND');
    }

    return Math.floor(pointsToUsd(balance.toNumber()));
  }

  async debitUsdt(
    userId: string,
    transactionId: string,
    amountUsdt: number,
  ): Promise<number> {
    return this.atomicLock.withLockGuard(
      async () =>
        await this.deadlockGuard.retryOnDeadlock(
          async () =>
            await this.debitUsdtSyncronized(userId, transactionId, amountUsdt),
        ),
      {
        lockKey: [[LockKeys.EVENBET_BALANCE_UPDATE, userId].join(':')],
        lockDuration: 5 * ONE_SECOND_IN_MS,
        context: 'debitUsdt',
        options: {
          retryCount: 1,
          retryDelay: 300,
        },
        conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
      },
    );
  }

  async debitUsdtSyncronized(
    userId: string,
    transactionId: string,
    amountUsdt: number,
  ): Promise<number> {
    return await this.prismaService.$transaction(async (transaction) => {
      const balance = await this.getBalanceAsUsdt(userId);

      const existingTransaction =
        await this.transactionLedgerService.getByReferenceId(transactionId);
      if (existingTransaction) {
        return balance;
      }

      const amount = usdtToPoints(amountUsdt);
      if (balance < amountUsdt) {
        throw new EvenBetError('INSUFFICIENT_FUNDS');
      }

      const newTransaction = await this.transactionLedgerService.create(
        {
          userId,
          amount: new Decimal(amount),
          counterParty: TransactionCounterParties.EVENBET_POKER,
          operationType: TransactionOperationTypes.DEBIT,
          referenceId: transactionId,
          status: TransactionStatuses.SUCCESS,
        },
        transaction,
      );

      await this.balanceService.decrementUserBalance(
        userId,
        new Decimal(amount),
        transaction,
        true, // increment user balance
      );

      const newBalance = await this.balanceService.getBalance(
        userId,
        transaction,
      );
      if (newBalance === null) {
        throw new EvenBetError('PLAYER_NOT_FOUND');
      }

      const balancePoints = usdtToPoints(balance);
      const newBalancePoints = usdtToPoints(decimalToNumber(newBalance));

      const user = await this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
      });

      this.eventEmitter.emit(
        EventNamespace.EVENBET_DEBIT,
        new EvenbetDebitEvent({
          userId,
          pmId: user?.partnerMatrixId || undefined,
          pmBtag: user?.partnerMatrixBtag || undefined,
          amount: new Decimal(pointsToUsd(amount)),
          transactionId: newTransaction.id,
          previousBalance: new Decimal(balancePoints),
          newBalance: new Decimal(newBalancePoints),
        }),
      );

      return Math.floor(pointsToUsd(newBalance.toNumber()));
    });
  }

  async creditUsdt(
    userId: string,
    transactionId: string,
    amountUsdt: number,
  ): Promise<number> {
    return this.atomicLock.withLockGuard(
      async () =>
        await this.deadlockGuard.retryOnDeadlock(
          async () =>
            await this.creditUsdtSyncronized(userId, transactionId, amountUsdt),
        ),
      {
        lockKey: [[LockKeys.EVENBET_BALANCE_UPDATE, userId].join(':')],
        lockDuration: 5 * ONE_SECOND_IN_MS,
        context: 'creditUsdt',
        options: {
          retryCount: 1,
          retryDelay: 300,
        },
        conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
      },
    );
  }

  async creditUsdtSyncronized(
    userId: string,
    transactionId: string,
    amountUsdt: number,
  ): Promise<number> {
    return await this.prismaService.$transaction(async (transaction) => {
      const balance = await this.getBalanceAsUsdt(userId);

      const existingTransaction =
        await this.transactionLedgerService.getByReferenceId(transactionId);
      if (existingTransaction) {
        return balance;
      }

      const amount = usdtToPoints(amountUsdt);

      const newTransaction = await this.transactionLedgerService.create(
        {
          userId,
          amount: new Decimal(amount),
          counterParty: TransactionCounterParties.EVENBET_POKER,
          operationType: TransactionOperationTypes.CREDIT,
          referenceId: transactionId,
          status: TransactionStatuses.SUCCESS,
        },
        transaction,
      );

      await this.balanceService.incrementUserBalance(
        userId,
        new Decimal(amount),
        transaction,
      );

      const newBalance = await this.balanceService.getBalance(
        userId,
        transaction,
      );
      if (newBalance === null) {
        throw new EvenBetError('PLAYER_NOT_FOUND');
      }

      const balancePoints = usdtToPoints(balance);
      const newBalancePoints = usdtToPoints(decimalToNumber(newBalance));

      const user = await this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
      });

      this.eventEmitter.emit(
        EventNamespace.EVENBET_CREDIT,
        new EvenbetCreditEvent({
          userId,
          pmId: user?.partnerMatrixId || undefined,
          pmBtag: user?.partnerMatrixBtag || undefined,
          amount: new Decimal(pointsToUsd(amount)),
          transactionId: newTransaction.id,
          previousBalance: new Decimal(balancePoints),
          newBalance: new Decimal(newBalancePoints),
        }),
      );

      return Math.floor(pointsToUsd(newBalance.toNumber()));
    });
  }

  async rollbackUsdt(
    userId: string,
    transactionId: string,
    referenceId: string,
    amountUsdt: number,
  ): Promise<number> {
    return this.atomicLock.withLockGuard(
      async () =>
        await this.deadlockGuard.retryOnDeadlock(
          async () =>
            await this.rollbackUsdtSyncronized(
              userId,
              transactionId,
              referenceId,
              amountUsdt,
            ),
        ),
      {
        lockKey: [[LockKeys.EVENBET_BALANCE_UPDATE, userId].join(':')],
        lockDuration: 5 * ONE_SECOND_IN_MS,
        context: 'rollbackUsdt',
        options: {
          retryCount: 1,
          retryDelay: 300,
        },
        conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
      },
    );
  }

  async rollbackUsdtSyncronized(
    userId: string,
    transactionId: string,
    referenceId: string,
    amountUsdt: number,
  ): Promise<number> {
    return await this.prismaService.$transaction(async (transaction) => {
      const balance = await this.getBalanceAsUsdt(userId);

      const existingTransaction =
        await this.transactionLedgerService.getByReferenceId(transactionId);

      if (existingTransaction) {
        return balance;
      }

      const referenceTransaction =
        await this.transactionLedgerService.getByReferenceId(referenceId);
      if (!referenceTransaction) {
        throw new EvenBetError('REFERENCE_TRANSACTION_NOT_FOUND');
      }

      const amount = usdtToPoints(amountUsdt);

      if (
        !referenceTransaction.amount.eq(new Decimal(amount)) ||
        referenceTransaction.userId !== userId
      ) {
        throw new EvenBetError('REFERENCE_TRANSACTION_INCOMPATIBLE');
      }

      await this.transactionLedgerService.create(
        {
          userId,
          amount: new Decimal(amount),
          counterParty: TransactionCounterParties.EVENBET_POKER,
          operationType: TransactionOperationTypes.CREDIT,
          referenceId: transactionId,
          status: TransactionStatuses.SUCCESS,
        },
        transaction,
      );

      await this.balanceService.incrementUserBalance(
        userId,
        new Decimal(amount),
        transaction,
      );

      const newBalance = await this.balanceService.getBalance(
        userId,
        transaction,
      );
      if (newBalance === null) {
        throw new EvenBetError('PLAYER_NOT_FOUND');
      }

      return Math.floor(pointsToUsd(newBalance.toNumber()));
    });
  }

  async getAllInfo(
    pagination: PagePaginationRequest = {},
    targetUserId: string,
    requesterId: string,
  ): Promise<PagePaginationResponse<Transaction>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;

    const permissions =
      await this.permissionService.getUserPermissions(requesterId);

    const isMaster = permissions.includes(Permissions.READ_VIP_OWN);

    const filter: Prisma.TransactionWhereInput = isMaster
      ? {
          user: { id: targetUserId, masterId: requesterId },
          counterParty: TransactionCounterParties.EVENBET_POKER,
        }
      : {
          userId: targetUserId,
          counterParty: TransactionCounterParties.EVENBET_POKER,
        };

    const count = await this.prismaService.transaction.count({
      where: filter,
    });

    const data = await this.prismaService.transaction.findMany({
      where: filter,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      limit,
      page,
      total: count,
    };
  }

  async getMyInfo(
    pagination: PagePaginationRequest = {},
    targetUserId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PagePaginationResponse<Transaction>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;

    const filter: Prisma.TransactionWhereInput = {
      userId: targetUserId,
      counterParty: TransactionCounterParties.EVENBET_POKER,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const count = await this.prismaService.transaction.count({
      where: filter,
    });

    const data = await this.prismaService.transaction.findMany({
      where: filter,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      limit,
      page,
      total: count,
    };
  }
}
