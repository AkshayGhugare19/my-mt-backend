/* eslint-disable sonarjs/no-duplicate-string */
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User, WithdrawalRequest } from '@prisma/client';
import { decimalToNumber } from '@utils/decimal-do-number';
import {
  WITHDRAWAL_STATUSES,
  WithdrawalStatusType,
} from '../enum/withdrawal-status.enum';
import { GetAllWithdrawalRequestsFilteredQuery } from '../query/get-all-withdrawals-filtered.query';
import { GetUserWithdrawalRequestsFilteredQuery } from '../query/get-user-withdrawals-filtered.query';
import { WithdrawalJobData, WithdrawalRequestMetadata, WithdrawalRequestWithUser, WithdrawalsReportFilters } from '../types';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { BalanceService } from '@modules/balance/service/balance.service';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import Redlock, { Settings } from 'redlock';
import { ONE_MINUTE_IN_MS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import {
  Blockchain,
  NotificationCodes,
  WithdrawalRequestCurrency,
  getAmountInCurrencyString,
} from '@infrastructure/database/prisma/constants';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { defaultJobConfig } from '@infrastructure/queue/bull/queue-config';
import {
  gamanzaBenefits,
  GamanzaRank,
} from '@external/gamanza-engage/service/client';
import { TronWeb } from 'tronweb';
import { isPublicKey } from '@metaplex-foundation/umi';
import { isAddress } from 'web3-validator';
import { Roles } from '@modules/role/enum/role.enum';
import {
  REDIS_KEY__BINANCE_ETH_USDT,
  REDIS_KEY__BINANCE_SOL_USDT,
  REDIS_KEY__BINANCE_TRX_USDT,
} from '@infrastructure/redis/keys';
import { WithdrawalRepository } from '@modules/withdrawal/repository/withdrawal.repository';
import { WithdrawalsExportData } from '@modules/withdrawal/repository/types';

const MIN_VOLUME_PLAYED_FOR_WITHDRAWAL = 100;

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly balanceService: BalanceService,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly configService: ConfigService,
    private readonly redlock: Redlock,
    @InjectQueue(QueuesDefinition.WITHDRAW_QUEUE.name)
    private readonly queue: Queue,
    private readonly notificationsService: NotificationsService,
    @InjectRedis() private readonly redis: Redis,
    private readonly withdrawalRepository: WithdrawalRepository,
  ) {}

  /**
   * Retrieves the total requested withdrawal amounts for the last 24 hours
   * @param userId The user
   */
  public async getUserWithdrawalTotal(params: {
    userId: string;
  }): Promise<number> {
    const { userId } = params;
    const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        canWithdraw: true,
        rank: true,
      },
    });

    if (!user?.canWithdraw) {
      return 0;
    }

    const userVolume = await this.prismaService.balance.findUnique({
      where: {
        userId,
      },
      select: {
        volumePlayed: true,
      },
    });

    if (
      !userVolume ||
      userVolume.volumePlayed.lt(MIN_VOLUME_PLAYED_FOR_WITHDRAWAL)
    ) {
      return 0;
    }

    const userRank = user.rank as GamanzaRank;

    const maxWithdrawable24h = gamanzaBenefits[userRank].withdrawalLimit;

    const requests = await this.prismaService.withdrawalRequest.aggregate({
      where: {
        AND: [
          {
            userId,
          },
          {
            createdAt: {
              gte: lastDay,
            },
          },
          {
            status: {
              notIn: [WITHDRAWAL_STATUSES.REJECTED],
            },
          },
        ],
      },
      _sum: {
        usdAmount: true,
      },
    });

    return Math.max(
      maxWithdrawable24h - (decimalToNumber(requests._sum.usdAmount) || 0),
      0,
    );
  }

  public async updateStatus(
    withdrawalId: string,
    status: WithdrawalStatusType,
  ): Promise<WithdrawalRequest> {
    return this.prismaService.withdrawalRequest.update({
      where: {
        id: withdrawalId,
      },
      data: {
        status,
      },
    });
  }

  private async withLockGuard<T>(
    callback: () => Promise<T>,
    {
      lockDuration,
      lockKey,
      options,
      context,
      conflictErrorMessage,
    }: {
      lockKey: string[];
      lockDuration: number;
      options?: Partial<Settings>;
      context?: string;
      conflictErrorMessage: string;
    },
  ): Promise<T> {
    let lock = null;

    try {
      lock = await this.redlock.acquire(lockKey, lockDuration, options);
    } catch (error) {
      throw new ConflictException(conflictErrorMessage);
    }

    try {
      return await callback();
    } catch (error) {
      this.logger.error(
        {
          message: error.message,
          stack: error.stack,
        },
        context || 'withLockGuard',
      );
      throw error;
    } finally {
      if (lock) {
        await lock.release();
      }
    }
  }

  public async lockAndCreateWithdrawRequest(params: {
    userId: string;
    amount: number;
    currency: number;
    wallet: string;
  }): Promise<any> {
    return this.withLockGuard(
      async () => {
        return await this.createWithdrawRequest(params);
      },
      {
        lockKey: [`newWithdrawal:${params.userId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'createWithdrawRequest',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage: ErrorMessages.MULTIPLE_WITHDRAWALS_PENDING,
      },
    );
  }

  /**
   *
   * @param params.amount the amount to withdraw, expressed in USD
   * @returns
   */
  private async createWithdrawRequest(params: {
    userId: string;
    amount: number; // crypto amount
    currency: number;
    wallet: string;
  }): Promise<any> {
    const { userId, amount, currency, wallet } = params;

    let blockchain: number;
    switch (true) {
      case TronWeb.isAddress(wallet): {
        blockchain = Blockchain.Tron;
        break;
      }
      case isPublicKey(wallet): {
        blockchain = Blockchain.Solana;
        break;
      }
      case isAddress(wallet): {
        blockchain = Blockchain.Ethereum;
        break;
      }
      default: {
        throw new Error('Invalid wallet');
      }
    }

    const { pointsAmount, usdAmount } = await this.getUsdtValue(
      currency,
      amount,
    );

    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        wallet: true,
        canWithdraw: true,
      },
    });

    if (!user?.canWithdraw) {
      throw new BadRequestException(
        ErrorMessages.WITHDRAWALS_STOPPED_FOR_THIS_ACCOUNT,
      );
    }
    try {
      const balance =
        await this.balanceService.getWithdrawableBalance(userId);

      if (!balance || !user) {
        throw new HttpException(
          ErrorMessages.INSUFFICIENT_BALANCE,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (balance.volumePlayed.lt(MIN_VOLUME_PLAYED_FOR_WITHDRAWAL)) {
        throw new HttpException(
          ErrorMessages.WITHDRAWALS_REQUIRE_MINIMUM_VOLUME_PLAYED,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (balance.balance.lt(pointsAmount)) {
        throw new HttpException(
          ErrorMessages.INSUFFICIENT_BALANCE,
          HttpStatus.BAD_REQUEST,
        );
      }

      // const available = await this.getUserWithdrawalTotal({ userId });

      // let status: string = WITHDRAWAL_STATUSES.PENDING;

      // if (available !== 0 && available - usdAmount.toNumber() >= 0) {
      //   status = WITHDRAWAL_STATUSES.AUTO_ACCEPTED;
      // }

      const status: string = WITHDRAWAL_STATUSES.PENDING;

      const { withdrawalRequest } =
        await this.prismaService.$transaction(async (transactionManager) => {
          const savedWithdrawalRequest =
            await transactionManager.withdrawalRequest.create({
              data: {
                amount,
                usdAmount,
                currency,
                blockchain,
                userId,
                status,
                targetWallet: wallet,
              },
            });

          const { bonusUsed } =
            await this.balanceService.createWithdraw(
              {
                userId,
                amount: pointsAmount,
                operationType: TransactionOperationTypes.DEBIT,
                counterParty: TransactionCounterParties.WITHDRAWAL_SERVICE,
                referenceId: savedWithdrawalRequest.id,
                status: TransactionStatuses.SUCCESS,
              },
              transactionManager,
            );
          if (bonusUsed.length > 0) {
            await transactionManager.withdrawalRequest.update({
              where: { id: savedWithdrawalRequest.id },
              data: { metadata: { bonus: bonusUsed } as WithdrawalRequestMetadata },
            });
          }
          return {
            withdrawalRequest: savedWithdrawalRequest,
          };
        });
      if (status === WITHDRAWAL_STATUSES.AUTO_ACCEPTED) {
        this.addToQueue({
          userId,
          amount,
          pointsAmount,
          currency,
          blockchain,
          withdrawalRequestId: withdrawalRequest.id,
        });
      }

      if (status !== WITHDRAWAL_STATUSES.AUTO_ACCEPTED) {
        Promise.all([
          this.notificationsService.createNotificationsForRole(
            Roles.RISK_MANAGEMENT,
            NotificationCodes.WITHDRAWAL_REQUEST_CREATED,
            undefined,
            { amount: getAmountInCurrencyString(amount, currency, blockchain) },
          ),
          this.notificationsService.createNotificationsForRole(
            Roles.RISK_MANAGEMENT_TRAINEE,
            NotificationCodes.WITHDRAWAL_REQUEST_CREATED,
            undefined,
            { amount: getAmountInCurrencyString(amount, currency, blockchain) },
          ),
        ]);
      }

      return withdrawalRequest;
    } catch (error) {
      this.logger.error(
        {
          message: 'Error while withdraw funds',
          error,
        },
        'WithdrawRequest',
      );
      throw error;
    }
  }

  public async getAllUsersRequests(params: {
    userId: string;
    filters: GetUserWithdrawalRequestsFilteredQuery;
  }): Promise<{ data: WithdrawalRequest[]; total: number }> {
    const { userId } = params;
    const { page, limit } = params.filters;

    const statusFilter =
      params.filters.status === 'all'
        ? {}
        : params.filters.status === 'pending'
          ? {
              in: [WITHDRAWAL_STATUSES.PENDING, WITHDRAWAL_STATUSES.REJECTED],
            }
          : {
              notIn: [
                WITHDRAWAL_STATUSES.PENDING,
                WITHDRAWAL_STATUSES.REJECTED,
              ],
            };
    const count = await this.prismaService.withdrawalRequest.count({
      where: {
        userId,
        status: statusFilter,
      },
    });
    const data = await this.prismaService.withdrawalRequest.findMany({
      where: {
        userId,
        status: statusFilter,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { data, total: count };
  }

  public async getAllRequests(params: {
    filters: GetAllWithdrawalRequestsFilteredQuery;
    requesterId?: string;
  }): Promise<WithdrawalRequestWithUser[]> {
    const {
      page,
      limit,
      status,
      search,
      startDate,
      endDate,
      amountMin,
      amountMax,
    } = params.filters;

    const withdrawalRequests =
      await this.prismaService.withdrawalRequest.findMany({
        include: {
          firstApprover: {
            select: {
              email: true,
              nickname: true,
            },
          },
          secondApprover: {
            select: {
              email: true,
              nickname: true,
            },
          },
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
        where: {
          usdAmount: {
            gte: amountMin,
            lte: amountMax,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          user: {
            OR: search
              ? [
                  {
                    nickname: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    email: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    wallet: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    id: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    playerTag: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                ]
              : undefined,
          },
          status: {
            in: status?.length ? status : undefined,
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
    return withdrawalRequests.map((withdrawalRequest) => ({
      ...withdrawalRequest,
      firstApproverEmail:
        withdrawalRequest.firstApprover?.email ||
        withdrawalRequest.firstApprover?.nickname ||
        null,
      firstApproverNickname: withdrawalRequest.firstApprover?.nickname || null,
      secondApproverEmail:
        withdrawalRequest.secondApprover?.email ||
        withdrawalRequest.secondApprover?.nickname ||
        null,
      firstApprovalAt: withdrawalRequest.firstApprovalAt || null,
      secondApprovalAt: withdrawalRequest.secondApprovalAt || null,
      secondApproverNickname:
        withdrawalRequest.secondApprover?.nickname || null,
      currency: withdrawalRequest.currency,
      user: {
        ...withdrawalRequest.user,
        roles: withdrawalRequest.user.userRoles.map(
          (userRole) => userRole.role,
        ),
      },
      targetWallet: withdrawalRequest.targetWallet,
      blockchain: withdrawalRequest.blockchain,
      usdAmount: withdrawalRequest.usdAmount,
    }));
  }

  public async getAllRequestCount(params: {
    filters: GetAllWithdrawalRequestsFilteredQuery;
  }): Promise<number> {
    const { search, startDate, endDate, amountMin, amountMax, status } =
      params.filters;

    return this.prismaService.withdrawalRequest.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        amount: {
          gte: amountMin,
          lte: amountMax,
        },
        user: {
          OR: search
            ? [
                {
                  nickname: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  wallet: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  id: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  playerTag: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ]
            : undefined,
        },
        status: {
          in: status?.length ? status : undefined,
        },
      },
    });
  }

  public async getWithdrawalsExport(filters: WithdrawalsReportFilters, pagination: { page: number, limit: number }): Promise<WithdrawalsExportData[]> {
    return await this.withdrawalRepository.getWithdrawalsExportDataQuery(filters, pagination);
  }

  public async lockAndAcceptRequest(params: {
    withdrawalId: string;
    accepterId: string;
  }): Promise<WithdrawalRequest | null> {
    return this.withLockGuard(
      async () => {
        return await this.acceptRequest(params);
      },
      {
        lockKey: [`withdrawal:${params.withdrawalId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'acceptRequest',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage:
          ErrorMessages.WITHDRAWAL_REQUEST_ALREADY_PROCESSED,
      },
    );
  }

  public async lockAndCloseRequest(params: {
    withdrawalId: string;
    closerId: string;
    proof: string;
  }): Promise<WithdrawalRequest | null> {
    return this.withLockGuard(
      async () => {
        return await this.closeRequest(params);
      },
      {
        lockKey: [`withdrawal:${params.withdrawalId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'acceptRequest',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage:
          ErrorMessages.WITHDRAWAL_REQUEST_ALREADY_PROCESSED,
      },
    );
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async closeRequest(params: {
    withdrawalId: string;
    closerId: string;
    proof: string;
  }): Promise<WithdrawalRequest | null> {
    const { withdrawalId } = params;

    const withdrawal = await this.prismaService.withdrawalRequest.findFirst({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      throw new NotFoundException(ErrorMessages.WITHDRAWAL_REQUEST_NOT_FOUND);
    }

    let updatedBlockchain: number | undefined;
    if (withdrawal.user.canWithdraw === false) {
      throw new BadRequestException(
        ErrorMessages.WITHDRAWALS_STOPPED_FOR_THIS_ACCOUNT,
      );
    }

    if (withdrawal.status !== WITHDRAWAL_STATUSES.ACCEPTED) {
      throw new HttpException(
        ErrorMessages.WITHDRAWAL_REQUEST_NOT_ACCEPTED,
        HttpStatus.BAD_REQUEST,
      );
    }

    const pointsAmount = (withdrawal.usdAmount ?? withdrawal.amount).mul(
      this.configService.getOrThrow<number>(ENV.USD_POINTS),
    );

    await this.prismaService.$transaction(async (transactionManager) => {
      await transactionManager.withdrawalRequest.update({
        where: {
          id: withdrawal.id,
        },
        data: {
          status: WITHDRAWAL_STATUSES.FULFILLED,
          secondApprovalAt: new Date(),
          secondApproverId: params.closerId,
          proof: params.proof,
          blockchain: updatedBlockchain,
        },
      });
      await this.balanceService.updateTotalWithdrawal(
        withdrawal.userId,
        pointsAmount,
        transactionManager,
      );

      this.notificationsService.createNotification(
        withdrawal.userId,
        NotificationCodes.WITHDRAWAL_REQUEST_COMPLETED,
        undefined,
        {
          amount: getAmountInCurrencyString(
            withdrawal.amount,
            withdrawal.currency,
            withdrawal.blockchain ?? Blockchain.Tron,
          ),
        },
      );
    });
    return await this.prismaService.withdrawalRequest.findFirst({
      where: { id: withdrawal.id },
    });
  }

  private async acceptRequest(params: {
    withdrawalId: string;
    accepterId: string;
  }): Promise<WithdrawalRequest | null> {
    const { withdrawalId } = params;

    const withdrawal = await this.prismaService.withdrawalRequest.findFirst({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      throw new HttpException('Not found withdraw.', HttpStatus.NOT_FOUND);
    }

    if (withdrawal.user.canWithdraw === false) {
      throw new HttpException(
        ErrorMessages.WITHDRAWALS_STOPPED_FOR_THIS_ACCOUNT,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (withdrawal.status !== WITHDRAWAL_STATUSES.PENDING) {
      throw new HttpException(
        ErrorMessages.WITHDRAWAL_REQUEST_ALREADY_PROCESSED,
        HttpStatus.BAD_REQUEST,
      );
    }
    const { amount, currency, blockchain } =
      await this.prismaService.withdrawalRequest.update({
        where: {
          id: withdrawal.id,
        },
        data: {
          status: WITHDRAWAL_STATUSES.ACCEPTED,
          firstApprovalAt: new Date(),
          firstApproverId: params.accepterId,
        },
        select: {
          amount: true,
          currency: true,
          blockchain: true,
        },
      });

    this.notificationsService.createNotificationsForRole(
      Roles.ACCOUNTANT,
      NotificationCodes.WITHDRAWAL_REQUEST_APPROVED,
      undefined,
      {
        amount: getAmountInCurrencyString(
          amount,
          currency,
          blockchain ?? Blockchain.Tron,
        ),
      },
    );

    return await this.prismaService.withdrawalRequest.findFirst({
      where: { id: withdrawal.id },
    });
    // remove the funds transfer from the treasury
    // !reference https://trello.com/c/e9FurBnx/82-double-approval-withdrawal-system
  }

  async getById(id: string): Promise<WithdrawalRequest | null> {
    return await this.prismaService.withdrawalRequest.findFirst({
      where: { id },
    });
  }

  public async lockAndRejectRequest(params: {
    withdrawalId: string;
    rejecterId: string;
  }): Promise<WithdrawalRequest> {
    return this.withLockGuard(
      async () => {
        return await this.rejectRequest(params);
      },
      {
        lockKey: [`withdrawal:${params.withdrawalId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'rejectRequest',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage:
          ErrorMessages.WITHDRAWAL_REQUEST_ALREADY_PROCESSED,
      },
    );
  }

  private async rejectRequest(params: {
    withdrawalId: string;
    rejecterId: string;
  }): Promise<WithdrawalRequest> {
    const { withdrawalId, rejecterId } = params;

    // 1. Verify request exists
    // 2. Give back the locked balance of the user
    // 3. Update the withdrawal request

    const withdrawal = await this.prismaService.withdrawalRequest.findFirst({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      throw new HttpException(
        ErrorMessages.WITHDRAWAL_REQUEST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (withdrawal.status === WITHDRAWAL_STATUSES.ACCEPTED) {
      return this.handleFinalRejection({
        rejecterId,
        withdrawal,
      });
    }

    if (withdrawal.status !== WITHDRAWAL_STATUSES.PENDING) {
      throw new HttpException(
        ErrorMessages.WITHDRAWAL_REQUEST_ALREADY_PROCESSED,
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.prismaService.$transaction(
      async (transactionManager) => {
        await this.restoreUserBalanceOnReject(withdrawal, transactionManager);
        return transactionManager.withdrawalRequest.update({
          where: {
            id: withdrawalId,
          },
          data: {
            status: WITHDRAWAL_STATUSES.REJECTED,
            firstApproverId: rejecterId,
            firstApprovalAt: new Date(),
          },
        });
      },
    );

    this.notificationsService.createNotification(
      withdrawal.userId,
      NotificationCodes.WITHDRAWAL_REQUEST_REJECTED,
      undefined,
      {
        amount: getAmountInCurrencyString(
          withdrawal.amount,
          withdrawal.currency,
          withdrawal.blockchain ?? Blockchain.Tron,
        ),
      },
    );

    return result;
  }

  private async handleFinalRejection(params: {
    rejecterId: string;
    withdrawal: WithdrawalRequest & { user: User };
  }): Promise<WithdrawalRequest> {
    const { rejecterId, withdrawal } = params;
    if (withdrawal.status !== WITHDRAWAL_STATUSES.ACCEPTED) {
      throw new HttpException(
        ErrorMessages.WITHDRAWAL_REQUEST_ALREADY_PROCESSED,
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = this.prismaService.$transaction(
      async (transactionManager) => {
        await this.restoreUserBalanceOnReject(withdrawal, transactionManager);
        return transactionManager.withdrawalRequest.update({
          where: {
            id: withdrawal.id,
          },
          data: {
            status: WITHDRAWAL_STATUSES.REJECTED,
            secondApproverId: rejecterId,
            secondApprovalAt: new Date(),
          },
        });
      },
    );

    this.notificationsService.createNotification(
      withdrawal.userId,
      NotificationCodes.WITHDRAWAL_REQUEST_REJECTED,
      undefined,
      {
        amount: getAmountInCurrencyString(
          withdrawal.amount,
          withdrawal.currency,
          withdrawal.blockchain ?? Blockchain.Tron,
        ),
      },
    );

    return result;
  }

  private async restoreUserBalanceOnReject(
    withdrawal: {
      user: User;
    } & WithdrawalRequest,
    transactionManager: PrismaTransactionManager,
  ): Promise<void> {
    await this.balanceService.revertWithdrawal(
      withdrawal,
      transactionManager
    );

    const transactionLedger =
      await this.transactionLedgerService.findByUserAndWithdraw(
        withdrawal.user.id,
        withdrawal.id,
        transactionManager,
      );

    await this.transactionLedgerService.updateStatus(
      transactionLedger.id,
      TransactionStatuses.FAILED,
      transactionManager,
    );
  }

  addToQueue(data: WithdrawalJobData): any {
    this.queue.add(JOB.WITHDRAW_TRANSACTION_JOB, data, {
      ...defaultJobConfig,
    });
  }

  async create(
    createWithdrawalDto: any,
    transactionManager?: PrismaTransactionManager,
  ): Promise<WithdrawalRequest> {
    const client = this.getClient(transactionManager);
    return client.withdrawalRequest.create({
      data: {
        ...createWithdrawalDto,
      },
    });
  }

  async setHashForRequest(
    withdrawalRequestId: string,
    tx: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<WithdrawalRequest> {
    const client = this.getClient(transactionManager);
    const withdrawalRequest = await client.withdrawalRequest.findFirst({
      where: { id: withdrawalRequestId },
    });

    return client.withdrawalRequest.update({
      where: { id: withdrawalRequestId },
      data: {
        transactionHash: tx,
        status:
          withdrawalRequest?.status !== WITHDRAWAL_STATUSES.AUTO_ACCEPTED
            ? WITHDRAWAL_STATUSES.ACCEPTED
            : undefined,
      },
    });
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }

  private async getUsdtValue(
    currency: number,
    amount: Decimal | number,
  ): Promise<{ usdAmount: Decimal; pointsAmount: Decimal }> {
    let usdAmount: Decimal;
    let pointsAmount: Decimal;

    switch (currency) {
      case WithdrawalRequestCurrency.Usdt:
      case WithdrawalRequestCurrency.Usdc: {
        usdAmount = new Decimal(amount);
        pointsAmount = new Decimal(amount).mul(
          this.configService.getOrThrow<number>(ENV.USD_POINTS),
        );
        break;
      }
      case WithdrawalRequestCurrency.Solana: {
        const exchangeRate =
          (await this.redis.get(REDIS_KEY__BINANCE_SOL_USDT)) ||
          ((): never => {
            throw new Error('Exchange rate not updated');
          })();

        usdAmount = new Decimal(amount).mul(exchangeRate);
        pointsAmount = usdAmount.mul(
          this.configService.getOrThrow<number>(ENV.USD_POINTS),
        );

        break;
      }
      case WithdrawalRequestCurrency.Ethereum: {
        const exchangeRate =
          (await this.redis.get(REDIS_KEY__BINANCE_ETH_USDT)) ||
          ((): never => {
            throw new Error('Exchange rate not updated');
          })();

        usdAmount = new Decimal(amount).mul(exchangeRate);
        pointsAmount = usdAmount.mul(
          this.configService.getOrThrow<number>(ENV.USD_POINTS),
        );

        break;
      }
      case WithdrawalRequestCurrency.Trx: {
        const exchangeRate =
          (await this.redis.get(REDIS_KEY__BINANCE_TRX_USDT)) ||
          ((): never => {
            throw new Error('Exchange rate not updated');
          })();

        usdAmount = new Decimal(amount).mul(exchangeRate);
        pointsAmount = usdAmount.mul(
          this.configService.getOrThrow<number>(ENV.USD_POINTS),
        );

        break;
      }
      default: {
        throw new Error('Incorrect currency');
      }
    }

    return {
      usdAmount,
      pointsAmount,
    };
  }
}
