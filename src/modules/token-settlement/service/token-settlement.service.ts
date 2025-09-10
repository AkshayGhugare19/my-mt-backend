import { ONE_MINUTE_IN_MS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { LockKeys } from '@common/enums/lock-keys.enum';
import { Role, Roles } from '@modules/role/enum/role.enum';
import { NotFoundError } from '@common/error/not-found.error';
import { PagePaginationResponse } from '@common/types';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { BalanceService } from '@modules/balance/service/balance.service';
import { TokenRequestStatuses } from '@modules/token-issue/enum/token-request-status.enum';
import { TokenSettlementTypes } from '@modules/token-settlement/enum/token-settlement-type.enum';
import { UserTokenSettlementFilterQuery } from '@modules/token-settlement/query/user-token-settlement-filter.query';
import {
  CloseTokenSettlement,
  MasterTokenSettlementRequestWithEmails,
  TokenSettlementRequestWithEmails,
  UploadTokenSettlementProof,
} from '@modules/token-settlement/types';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { UserService } from '@modules/user/services/user.service';
import { UserInfo } from '@modules/user/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TokenSettlementRequest } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { PermissionService } from '@modules/permission/service/permission.service';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { MasterVipTokenSettlementDto } from '@modules/token-settlement/dto/master-vip-token-settlement.dto';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationCodes } from '@infrastructure/database/prisma/constants';

@Injectable()
export class TokenSettlementService {
  protected readonly logger = new Logger(TokenSettlementService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly balanceService: BalanceService,
    protected readonly atomicLock: AtomicLock,
    private readonly permissionService: PermissionService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // !CHECK - https://trello.com/c/zyyBR2L0
  async getSettlementRequestAmount(targetId: string): Promise<number> {
    const requestsAmount =
      await this.prismaService.tokenSettlementRequest.aggregate({
        where: { targetId, status: TokenRequestStatuses.PENDING },
        _sum: { amount: true },
      });
    if (!requestsAmount || !requestsAmount._sum.amount) return 0;
    return decimalToNumber(requestsAmount._sum.amount);
  }

  async getOwnSettlementRequests(
    targetId: string,
    query: UserTokenSettlementFilterQuery,
  ): Promise<
    PagePaginationResponse<
      Omit<
        TokenSettlementRequest,
        | 'targetId'
        | 'masterId'
        | 'proofUploader'
        | 'superMasterApprovedAt'
        | 'masterApprovedAt'
        | 'initiator'
      >
    >
  > {
    const offset = (query.page - 1) * query.limit;
    const [count, data] = await Promise.all([
      this.prismaService.tokenSettlementRequest.count({
        where: { targetId },
      }),
      this.prismaService.tokenSettlementRequest.findMany({
        where: {
          targetId,
          status:
            query.status === 'pending'
              ? TokenRequestStatuses.PENDING
              : { not: TokenRequestStatuses.PENDING },
        },
        select: {
          id: true,
          amount: true,
          status: true,
          proof: true,
          type: true,
          settleAmount: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: offset,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      limit: query.limit,
      page: query.page,
      total: count,
      data,
    };
  }

  async getOwnVipSettlementRequests(
    targetId: string,
    filter: Prisma.TokenSettlementRequestWhereInput,
    query: UserTokenSettlementFilterQuery,
    page = 1,
    limit = 10,
  ): Promise<PagePaginationResponse<MasterVipTokenSettlementDto>> {
    const offset = (page - 1) * limit;
    const [count, data] = await Promise.all([
      this.prismaService.tokenSettlementRequest.count({
        where: {
          ...filter,
          masterId: targetId,
          type: TokenSettlementTypes.VIP,
        },
      }),
      this.prismaService.tokenSettlementRequest.findMany({
        where: {
          ...filter,
          masterId: targetId,
          type: TokenSettlementTypes.VIP,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          proof: true,
          type: true,
          settleAmount: true,
          createdAt: true,
          updatedAt: true,
          master: {
            select: {
              email: true,
              nickname: true,
            },
          },
          user: {
            select: {
              userBookieStake: true,
              email: true,
              nickname: true,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      limit,
      page,
      total: count,
      data: data.map((item) => ({
        id: item.id,
        amount: decimalToNumber(item.amount),
        createdAt: item.createdAt,
        status: item.status,
        settleAmount: decimalToNumber(item.settleAmount),
        updatedAt: item.updatedAt,
        targetEmail: item.user.email || '',
        masterEmail: item.master.email || '',
        masterNickname: item.master.nickname || '',
        targetNickname: item.user.nickname || '',
        userBookieStake: decimalToNumber(item.user.userBookieStake),
      })),
    };
  }

  async getMasterSettlementRequests(
    targetId: string,
    filters: Prisma.TokenSettlementRequestWhereInput,
    query: UserTokenSettlementFilterQuery,
    page?: number,
    limit?: number,
  ): Promise<PagePaginationResponse<MasterTokenSettlementRequestWithEmails>> {
    return this.getTokenSettlementRequestsAdmin(
      {
        targetId,
        type: TokenSettlementTypes.MASTER,
        ...filters,
      },
      page,
      limit,
    );
  }

  async getAllMasterTokenSettlements(
    masterId: string,
    filter: Prisma.TokenSettlementRequestWhereInput,
    query: UserTokenSettlementFilterQuery,
    page?: number,
    limit?: number,
  ): Promise<PagePaginationResponse<MasterTokenSettlementRequestWithEmails>> {
    return this.getTokenSettlementRequestsAdmin(
      {
        masterId,
        type: TokenSettlementTypes.MASTER,
        targetId: query.targetId,
        ...filter,
      },
      page,
      limit,
    );
  }

  async getTokenSettlementRequestsByPermissions({
    filter,
    requesterId,
    targetId,
    limit = 10,
    page = 1,
  }: {
    requesterId: string;
    targetId?: string;
    filter: Prisma.TokenSettlementRequestWhereInput;
    page?: number;
    limit?: number;
  }): Promise<PagePaginationResponse<MasterTokenSettlementRequestWithEmails>> {
    if (targetId) {
      await this.verifyRequesterReadPermissions(requesterId, targetId);
    }

    return this.getTokenSettlementRequestsAdmin(
      {
        ...filter,
        targetId,
      },
      page,
      limit,
    );
  }

  private async verifyRequesterReadPermissions(
    requesterId: string,
    targetId: string,
  ): Promise<void> {
    const permissions =
      await this.permissionService.getUserPermissions(requesterId);
    const hasReadOwnVipPermission = permissions.some(
      (permission) => permission === Permissions.READ_VIP_OWN,
    );
    const hasReadVipSettlementsPermission = permissions.some(
      (permission) => permission === Permissions.READ_SETTLEMENTS_VIPS,
    );
    const hasReadMasterSettlementsPermission = permissions.some(
      (permission) => permission === Permissions.READ_SETTLEMENTS_SMM,
    );
    const targetUser = await this.userService.findById(targetId);
    if (!targetUser) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    // Verify if the requester is the master of the user if the requester has the read vip own permission
    if (hasReadOwnVipPermission && targetUser.masterId !== requesterId) {
      throw new ForbiddenException();
    }

    // Verify if the requester has the permission to read master requests if the target user is a master
    if (
      !hasReadMasterSettlementsPermission &&
      targetUser.roles.some((role) => role.name === Roles.MASTER)
    ) {
      throw new ForbiddenException();
    }

    // Verify if the requester has the permission to read vip requests if the target user is a vip
    if (
      !hasReadVipSettlementsPermission &&
      targetUser.roles.some((role) => role.name === Roles.VIP_USER)
    ) {
      throw new ForbiddenException();
    }
  }

  async getTokenSettlementRequestsAdmin(
    filter: Prisma.TokenSettlementRequestWhereInput,
    page = 1,
    limit = 10,
  ): Promise<PagePaginationResponse<MasterTokenSettlementRequestWithEmails>> {
    const offset = (page - 1) * limit;
    const [count, data] = await Promise.all([
      this.prismaService.tokenSettlementRequest.count({
        where: {
          ...filter,
        },
      }),
      this.prismaService.tokenSettlementRequest.findMany({
        where: {
          ...filter,
        },
        select: {
          id: true,
          amount: true,
          targetId: true,
          status: true,
          proof: true,
          type: true,
          initiator: true,
          settleAmount: true,
          masterApprovedAt: true,
          proofUploader: true,
          superMasterApprovedAt: true,
          createdAt: true,
          updatedAt: true,
          masterId: true,
          master: {
            select: {
              email: true,
              nickname: true,
            },
          },
          user: {
            select: {
              email: true,
              nickname: true,
              flexibleBookieStake: true,
              predefinedBookieStake: true,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      limit,
      page,
      total: count,
      data: data.map((item) => ({
        ...item,
        targetId: item.targetId,
        masterId: item.masterId,
        masterEmail: item.master.email || '',
        targetEmail: item.user.email || '',
        masterNickname: item.master.nickname || '',
        targetNickname: item.user.nickname || '',
        flexibleBookieStake: item.user.flexibleBookieStake || new Decimal(0),
        predefinedBookieStake:
          item.user.predefinedBookieStake || new Decimal(0),
      })),
    };
  }

  /**
   *
   * @param params
   * @returns
   * @throws - {@link NotFoundError} - If the user is not found.
   * !The lock of the method is only released in case of error. If the method is successful, the lock is not released.
   */
  public async lockAndCreateTokenSettlement(params: {
    userId: string;
    // !CHECK - https://trello.com/c/R0xF81Lr
    amount: Decimal;
  }): Promise<TokenSettlementRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.createTokenSettlementRequest(params);
      },
      {
        lockKey: [`${LockKeys.REQUEST_TOKEN_SETTLEMENT}:${params.userId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'lockAndCreateTokenSettlement',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage: ErrorMessages.TOKEN_SETTLEMENT_IN_PROGRESS,
      },
    );
  }

  // !CHECK - https://trello.com/c/R0xF81Lr
  public async lockAndCreateMasterVipTokenSettlement(
    params: {
      targetId: string;
      amount?: Decimal;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<TokenSettlementRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.createMasterVipTokenSettlement(
          params,
          transactionManager,
        );
      },
      {
        lockKey: [`${LockKeys.REQUEST_TOKEN_SETTLEMENT}:${params.targetId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'lockAndCreateMasterVipTokenSettlement',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage: ErrorMessages.TOKEN_SETTLEMENT_IN_PROGRESS,
      },
    );
  }

  public async lockAndCreateSuperMasterTokenSettlement(params: {
    initiatorRole: Role;
    targetId: string;
    amount?: Decimal;
  }): Promise<TokenSettlementRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.createSuperMasterTokenSettlementRequest(
          params.initiatorRole,
          params.targetId,
          params.amount,
        );
      },
      {
        lockKey: [
          `${LockKeys.REQUEST_TOKEN_SETTLEMENT_MASTER}:${params.targetId}`,
        ],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'lockAndCreateMasterTokenSettlement',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage: ErrorMessages.TOKEN_SETTLEMENT_IN_PROGRESS,
      },
    );
  }

  public async lockAndCreateMasterTokenSettlement(params: {
    targetId: string;
    amount?: Decimal;
  }): Promise<TokenSettlementRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.createMasterTokenSettlementRequest(
          params.targetId,
          params.amount,
        );
      },
      {
        lockKey: [
          `${LockKeys.REQUEST_TOKEN_SETTLEMENT_MASTER}:${params.targetId}`,
        ],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'lockAndCreateMasterTokenSettlement',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage: ErrorMessages.TOKEN_SETTLEMENT_IN_PROGRESS,
      },
    );
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async createSuperMasterTokenSettlementRequest(
    initiatorRole: Role,
    targetId: string,
    amount?: Decimal,
  ): Promise<TokenSettlementRequestWithEmails> {
    const user = await this.userService.findById(targetId);

    if (!user) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }
    const permissions = await this.permissionService.getUserPermissions(
      user.id,
    );

    if (!permissions.includes(Permissions.CREATE_SETTLEMENTS_SMM_OWN)) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const masterId = user.masterId;

    if (!masterId) {
      this.logger.error(
        { message: 'No master found for', userId: user.id },
        'createMasterTokenSettlementRequest',
      );
      throw new BadRequestException(ErrorMessages.NO_MASTER_FOUND);
    }

    // create settlements for master's vip users
    // !CHECK - https://trello.com/c/VDj7Ctq6

    if (!amount) {
      await this.createSettlementForMasterVipUsers(user);
    }

    const userBalance = await this.balanceService.getBalanceAnd(user.id, {
      debt: true,
      totalSettled: true,
    });

    if (!userBalance) {
      this.logger.error(
        { message: 'No balance found for user', userId: user.id },
        'createMasterTokenSettlementRequest',
      );
      throw new BadRequestException(ErrorMessages.USER_NOT_FOUND);
    }

    if (userBalance.balance!.isZero() && userBalance.debt?.isZero()) {
      throw new BadRequestException(ErrorMessages.INSUFFICIENT_BALANCE);
    }
    if (amount && userBalance.balance!.lt(amount)) {
      throw new BadRequestException(ErrorMessages.INSUFFICIENT_BALANCE);
    }

    const savedRequest = await this.prismaService.$transaction(
      async (transactionManager) => {
        const settleValue = amount || userBalance.balance!;
        const settleAmount = settleValue!.minus(userBalance.debt || 0);
        const savedRequest =
          await transactionManager.tokenSettlementRequest.create({
            data: {
              settleAmount,
              amount: settleValue!,
              type: TokenSettlementTypes.MASTER,
              targetId: user.id,
              masterId: user.masterId!,
              initiator: initiatorRole,
            },
          });

        // Subtract Tokens from the user's balance and create a transaction ledger entry
        await this.transactionLedgerService.subtractUserTokens(
          {
            userId: targetId,
            masterId,
            amount: settleValue!,
            referenceId: savedRequest.id,
            operationType: TransactionCounterParties.MASTER_TOKEN_SETTLEMENT,
          },
          transactionManager,
        );

        await transactionManager.balance.update({
          where: {
            userId: targetId,
          },
          data: {
            debt: 0,
            totalSettled: (userBalance?.totalSettled || new Decimal(0)).plus(
              settleAmount.gt(0) ? settleAmount : 0,
            ),
          },
        });

        return savedRequest;
      },
    );

    const masterInfo = await this.userService.findById(masterId);

    this.notificationsService.createNotification(
      targetId,
      NotificationCodes.SETLLEMENT_REQUEST_CREATED_BY_SUPERMASTER,
      undefined,
      { superMasterName: masterInfo?.nickname, amount: savedRequest.amount },
    );

    return {
      ...savedRequest,
      masterEmail: masterInfo?.email || '',
      targetEmail: user.email || '',
      masterNickname: masterInfo?.nickname || '',
      targetNickname: user.nickname || '',
    };
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async createMasterTokenSettlementRequest(
    targetId: string,
    amount?: Decimal,
  ): Promise<TokenSettlementRequestWithEmails> {
    const user = await this.userService.findById(targetId);

    if (!user) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const masterId = user.masterId;

    if (!masterId) {
      this.logger.error(
        { message: 'No master found for', userId: user.id },
        'createMasterTokenSettlementRequest',
      );
      throw new BadRequestException(ErrorMessages.NO_MASTER_FOUND);
    }

    const userBalance = await this.balanceService.getBalanceAnd(user.id, {
      debt: true,
      totalSettled: true,
    });

    if (!userBalance) {
      this.logger.error(
        { message: 'No balance found for user', userId: user.id },
        'createMasterTokenSettlementRequest',
      );
      throw new BadRequestException(ErrorMessages.USER_NOT_FOUND);
    }

    if (amount && (!userBalance.balance || userBalance.balance.lt(amount))) {
      throw new BadRequestException(ErrorMessages.INSUFFICIENT_BALANCE);
    }

    if (!amount && (!userBalance.balance || userBalance.balance.lte(0))) {
      throw new BadRequestException(ErrorMessages.INSUFFICIENT_BALANCE);
    }

    const requestedAmount = amount || userBalance.balance!;
    const savedRequest = await this.prismaService.$transaction(
      async (transactionManager) => {
        const settleAmount = requestedAmount.minus(userBalance.debt || 0);
        const savedRequest =
          await transactionManager.tokenSettlementRequest.create({
            data: {
              settleAmount,
              amount: requestedAmount,
              type: TokenSettlementTypes.MASTER,
              targetId: user.id,
              masterId: user.masterId!,
              initiator: Roles.MASTER,
            },
          });

        // Subtract Tokens from the user's balance and create a transaction ledger entry
        await this.transactionLedgerService.subtractUserTokens(
          {
            userId: targetId,
            masterId,
            amount: requestedAmount,
            referenceId: savedRequest.id,
            operationType: TransactionCounterParties.MASTER_TOKEN_SETTLEMENT,
          },
          transactionManager,
        );

        await transactionManager.balance.update({
          where: {
            userId: targetId,
          },
          data: {
            debt: 0,
            totalSettled: (userBalance?.totalSettled || new Decimal(0)).plus(
              settleAmount.gt(0) ? settleAmount : 0,
            ),
          },
        });

        return savedRequest;
      },
    );

    const masterInfo = await this.userService.findById(masterId);

    return {
      ...savedRequest,
      masterEmail: masterInfo?.email || '',
      targetEmail: user.email || '',
      masterNickname: masterInfo?.nickname || '',
      targetNickname: user.nickname || '',
    };
  }

  private async createSettlementForMasterVipUsers(
    user: UserInfo,
  ): Promise<void> {
    await this.prismaService.$transaction(async (transactionManager) => {
      const vipUsers = await this.userService.getVipUsersByMasterId(
        user.id,
        transactionManager,
      );

      if (!vipUsers.length) return;

      for (const vip of vipUsers) {
        try {
          await this.lockAndCreateMasterVipTokenSettlement(
            {
              targetId: vip.id,
            },
            transactionManager,
          );
        } catch {
          continue;
        }
      }
    });
  }

  /**
   * Creates a token settlement request for a user.
   * @param userId - The ID of the user for whom the token settlement request is being created.
   * @param amount - The amount of tokens for the settlement request.
   * @returns The created token settlement request object with the master's email and the user's email.
   * @throws - {@link NotFoundError} - If the user is not found.
   * @throws - {@link BadRequestException} - If no master is found for the user or if the user has insufficient balance.
   */
  private async createTokenSettlementRequest({
    amount,
    userId,
  }: {
    userId: string;
    amount: Decimal;
  }): Promise<TokenSettlementRequestWithEmails> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const masterId = user.masterId;
    const userBalance = await this.balanceService.getBalanceAnd(userId, {
      debt: true,
    });

    if (!masterId || !userBalance) {
      this.logger.error(
        { message: 'No master found for user', userId },
        'createTokenSettlementRequest',
      );
      throw new BadRequestException(ErrorMessages.NO_MASTER_FOUND);
    }

    // Throw an error if the balance is not found or is less than the requested amount
    if (!userBalance.balance || userBalance.balance.lt(amount)) {
      throw new BadRequestException(ErrorMessages.INSUFFICIENT_BALANCE);
    }

    if (userBalance.balance.isZero() && userBalance.debt?.isZero()) {
      throw new BadRequestException(ErrorMessages.INSUFFICIENT_BALANCE);
    }

    const savedRequest = await this.prismaService.$transaction(
      async (transactionManager) => {
        const savedRequest =
          await transactionManager.tokenSettlementRequest.create({
            data: {
              amount,
              type: TokenSettlementTypes.VIP,
              targetId: userId,
              masterId,
              initiator: Roles.VIP_USER,
            },
          });

        // Subtract Tokens from the user's balance and create a transaction ledger entry
        await this.transactionLedgerService.subtractUserTokens(
          {
            userId,
            masterId,
            amount,
            referenceId: savedRequest.id,
            operationType: TransactionCounterParties.MASTER_TOKEN_SETTLEMENT,
          },
          transactionManager,
        );

        return savedRequest;
      },
    );

    const masterInfo = await this.userService.findById(masterId);

    this.notificationsService.createNotification(
      masterId,
      NotificationCodes.SETLLEMENT_REQUEST_CREATED_BY_USER,
      undefined,
      { amount: savedRequest.amount },
    );

    return {
      ...savedRequest,
      masterEmail: masterInfo?.email || '',
      masterNickname: masterInfo?.nickname || '',
      targetEmail: user.email || '',
      targetNickname: user.nickname || '',
    };
  }

  // !CHECK - https://trello.com/c/R0xF81Lr
  /**
   * Creates a token settlement request for a user.
   * @param targetId - The ID of the user for whom the token settlement request is being created.
   * @returns The created token settlement request object with the master's email and the user's email.
   * @throws - {@link NotFoundError} - If the user is not found.
   * @throws - {@link BadRequestException} - If no master is found for the user or if the user has insufficient balance.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async createMasterVipTokenSettlement(
    {
      targetId,
      amount,
    }: {
      targetId: string;
      amount?: Decimal;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<TokenSettlementRequestWithEmails> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (transactionManager) => {
        return this.createMasterVipTokenSettlement(
          {
            targetId,
            amount,
          },
          transactionManager,
        );
      });
    }

    const user = await this.userService.findById(
      targetId,
      false,
      transactionManager,
    );

    if (!user) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const masterId = user.masterId;
    if (!masterId) {
      this.logger.error(
        { message: 'No master found for user', targetId },
        'createTokenSettlementRequest',
      );
      throw new BadRequestException(ErrorMessages.NO_MASTER_FOUND);
    }

    const userBalance = await this.balanceService.getBalanceAnd(
      targetId,
      {
        balance: true,
        debt: true,
      },
      transactionManager,
    );

    if (!userBalance || !userBalance.balance) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    if (userBalance.balance.isZero() && userBalance.debt?.isZero()) {
      throw new BadRequestException(ErrorMessages.INSUFFICIENT_BALANCE);
    }

    if (amount && userBalance.balance.lessThan(amount)) {
      throw new BadRequestException(ErrorMessages.INSUFFICIENT_BALANCE);
    }

    const updateAmount = amount || userBalance.balance;

    const settleAmount = updateAmount!.minus(userBalance.debt || 0);
    const savedRequest = await transactionManager.tokenSettlementRequest.create(
      {
        data: {
          settleAmount,
          amount: updateAmount!,
          type: TokenSettlementTypes.VIP,
          targetId,
          masterId,
          initiator: Roles.MASTER,
          masterApprovedAt: new Date(),
          status: TokenRequestStatuses.APPROVED,
        },
      },
    );

    // Subtract Tokens from the user's balance and create a transaction ledger entry
    await this.transactionLedgerService.subtractUserTokens(
      {
        userId: targetId,
        masterId,
        amount: updateAmount!,
        referenceId: savedRequest.id,
        operationType: TransactionCounterParties.MASTER_TOKEN_SETTLEMENT,
      },
      transactionManager,
    );

    await this.transactionLedgerService.incrementMasterTokens(
      {
        masterId,
        amount: updateAmount!,
        tokenRequestId: savedRequest.id,
        operationType: TransactionCounterParties.MASTER_TOKEN_SETTLEMENT,
      },
      transactionManager,
    );

    await this.updateTargetAndMasterDebt(
      {
        masterId,
        targetId,
        settleAmount,
      },
      transactionManager,
    );

    if (settleAmount.gt(0)) {
      await this.balanceService.incrementTotalSettledAmount(
        targetId,
        settleAmount,
        transactionManager,
      );
    }

    const masterInfo = await this.userService.findById(masterId);
    return {
      ...savedRequest,
      masterEmail: masterInfo?.email || '',
      masterNickname: masterInfo?.nickname || '',
      targetEmail: user.email || '',
      targetNickname: user.nickname || '',
    };
  }

  public async lockAndApproveTokenSettlement(params: {
    requestId: string;
    masterId: string;
  }): Promise<TokenSettlementRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.acceptTokenSettlementRequest(
          params.requestId,
          params.masterId,
        );
      },
      {
        lockKey: [`${LockKeys.RESOLVE_TOKEN_SETTLEMENT}:${params.requestId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'lockAndCreateTokenIssue',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage:
          ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER,
      },
    );
  }

  async acceptTokenSettlementRequest(
    requestId: string,
    masterId: string,
  ): Promise<TokenSettlementRequestWithEmails> {
    const issue = await this.getTokenSettlementRequest(requestId, masterId);

    if (!issue || issue.type !== TokenSettlementTypes.VIP) {
      throw new NotFoundException(ErrorMessages.TOKEN_SETTLEMENT_NOT_FOUND);
    }

    if (issue.status !== TokenRequestStatuses.PENDING) {
      this.logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_ALREADY_RESOLVED,
          requestId,
        },
        'acceptTokenSettlementRequest',
      );

      throw new ConflictException(
        ErrorMessages.TOKEN_SETTLEMENT_ALREADY_RESOLVED,
      );
    }

    return await this.prismaService.$transaction(async (transactionManager) => {
      const userBalance = await this.balanceService.getBalanceAnd(
        issue.targetId,
        { debt: true },
        transactionManager,
      );

      if (!userBalance) {
        this.logger.error(
          {
            message: ErrorMessages.USER_NOT_FOUND,
            requestId,
            masterId,
          },
          'acceptTokenSettlementRequest',
        );
        throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
      }
      const settleAmount = issue.amount.minus(userBalance.debt || 0);
      const tokenSettlement =
        await transactionManager.tokenSettlementRequest.update({
          where: {
            id: requestId,
          },
          data: {
            settleAmount,
            status: TokenRequestStatuses.APPROVED,
          },
        });

      await this.transactionLedgerService.incrementMasterTokens(
        {
          masterId,
          amount: issue.amount,
          tokenRequestId: issue.id,
          operationType: TransactionCounterParties.MASTER_TOKEN_SETTLEMENT,
        },
        transactionManager,
      );

      await this.updateTargetAndMasterDebt(
        {
          masterId,
          targetId: issue.targetId,
          settleAmount,
        },
        transactionManager,
      );
      if (settleAmount.gt(0)) {
        await this.balanceService.incrementTotalSettledAmount(
          issue.targetId,
          settleAmount,
          transactionManager,
        );
      }

      return {
        ...tokenSettlement,
        targetEmail: issue.user.email || '',
        masterNickname: issue.master.nickname || '',
        masterEmail: issue.master.email || '',
        targetNickname: issue.user.nickname || '',
      };
    });
  }

  private async updateTargetAndMasterDebt(
    params: {
      masterId: string;
      targetId: string;
      settleAmount: Decimal;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<void> {
    const client = this.getClient(transactionManager);
    const { masterId, targetId, settleAmount } = params;

    const bookieStake = await this.userService.getUserBookieStake(targetId);

    const masterBalance = await this.balanceService.getBalanceAnd(masterId, {
      debt: true,
    });

    if (!masterBalance) {
      this.logger.error(
        {
          message: ErrorMessages.USER_NOT_FOUND,
          targetId,
        },
        'updateTargetAndMasterDebt',
      );
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    await client.balance.update({
      where: {
        userId: targetId,
      },
      data: {
        debt: 0,
      },
    });

    const newMasterDebt = settleAmount
      .mul(bookieStake || new Decimal(0))
      .plus(masterBalance.debt || new Decimal(0));

    await client.balance.update({
      where: {
        userId: masterId,
      },
      data: {
        debt: newMasterDebt,
      },
    });
  }

  public async lockAndUpdateTokenSettlementProof(
    params: UploadTokenSettlementProof,
  ): Promise<TokenSettlementRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.updateTokenSettlementProof(params);
      },
      {
        lockKey: [
          `${LockKeys.UPDATE_MASTER_TOKEN_SETTLEMENT}:${params.requestId}`,
        ],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'lockAndUpdateTokenSettlementProof',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage:
          ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER,
      },
    );
  }

  private async updateTokenSettlementProof(
    params: UploadTokenSettlementProof,
  ): Promise<TokenSettlementRequestWithEmails> {
    const { proof, requestId, uploaderId } = params;

    const settlement = await this.getTokenSettlementRequest(requestId);

    if (
      !settlement ||
      settlement.type !== TokenSettlementTypes.MASTER ||
      (settlement.masterId !== uploaderId && settlement.targetId !== uploaderId)
    ) {
      this.logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_NOT_FOUND,
          requestId,
          uploaderId,
          proof,
        },
        'updateTokenSettlementProof',
      );
      throw new NotFoundException(ErrorMessages.TOKEN_SETTLEMENT_NOT_FOUND);
    }

    if (
      settlement.status !== TokenRequestStatuses.PENDING ||
      settlement.proof
    ) {
      this.logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_PROOF_ALREADY_UPLOADED,
          requestId,
          uploaderId,
          proof,
        },
        'updateTokenSettlementProof',
      );
      throw new ConflictException(
        ErrorMessages.TOKEN_SETTLEMENT_PROOF_ALREADY_UPLOADED,
      );
    }

    const uploader = await this.userService.findById(uploaderId);

    if (!uploader) {
      this.logger.error(
        {
          message: ErrorMessages.USER_NOT_FOUND,
          requestId,
          uploaderId,
          proof,
        },
        'updateTokenSettlementProof',
      );
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const permissions =
      await this.permissionService.getUserPermissions(uploaderId);

    const hasTargetSettlementPermission = permissions.includes(
      Permissions.CREATE_SETTLEMENTS_SMM,
    );

    const updatedData = await this.prismaService.tokenSettlementRequest.update({
      where: {
        id: requestId,
      },
      data: {
        proof,
        superMasterApprovedAt: hasTargetSettlementPermission
          ? new Date()
          : null,
        proofUploader: hasTargetSettlementPermission
          ? Roles.SUPER_MASTER
          : Roles.MASTER,
        masterApprovedAt: hasTargetSettlementPermission ? null : new Date(),
        status: TokenRequestStatuses.PROOF_ADDED,
      },
      select: this.tokenSettlementSelectWithEmails(),
    });
    return {
      ...updatedData,
      masterEmail: settlement.master.email || '',
      masterNickname: settlement.master.nickname || '',
      targetEmail: settlement.user.email || '',
      targetNickname: settlement.user.nickname || '',
    };
  }

  public async lockAndCloseTokenSettlementStatus(
    params: CloseTokenSettlement,
  ): Promise<TokenSettlementRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.closeTokenSettlement(params);
      },
      {
        lockKey: [
          `${LockKeys.UPDATE_MASTER_TOKEN_SETTLEMENT}:${params.requestId}`,
        ],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'lockAndUpdateTokenSettlementProof',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage:
          ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER,
      },
    );
  }

  private async closeTokenSettlement(
    params: CloseTokenSettlement,
  ): Promise<TokenSettlementRequestWithEmails> {
    const { requestId, accepterId } = params;
    const settlement = await this.getTokenSettlementRequest(requestId);

    if (
      !settlement ||
      settlement.type !== TokenSettlementTypes.MASTER ||
      (settlement.masterId !== accepterId && settlement.targetId !== accepterId)
    ) {
      this.logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_NOT_FOUND,
          requestId,
          accepterId,
        },
        'closeTokenSettlement',
      );
      throw new NotFoundException(ErrorMessages.TOKEN_SETTLEMENT_NOT_FOUND);
    }

    if (settlement.status === TokenRequestStatuses.CLOSED) {
      this.logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_ALREADY_CLOSED,
          requestId,
          accepterId,
        },
        'closeTokenSettlement',
      );
      throw new ConflictException(
        ErrorMessages.TOKEN_SETTLEMENT_ALREADY_CLOSED,
      );
    }

    if (settlement.status !== TokenRequestStatuses.PROOF_ADDED) {
      this.logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_NOT_APPROVED,
          requestId,
          accepterId,
        },
        'closeTokenSettlement',
      );
      throw new ConflictException(ErrorMessages.TOKEN_SETTLEMENT_NOT_APPROVED);
    }

    const accepter = await this.userService.findById(accepterId);

    if (!accepter) {
      this.logger.error(
        {
          message: ErrorMessages.USER_NOT_FOUND,
          requestId,
          accepterId,
        },
        'closeTokenSettlement',
      );
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const permissions =
      await this.permissionService.getUserPermissions(accepterId);

    if (permissions.includes(Permissions.CREATE_SETTLEMENTS_SMM)) {
      return await this.closeTokenSettlementSuperMaster(settlement, accepter);
    }

    if (permissions.includes(Permissions.CREATE_SETTLEMENTS_SMM_OWN)) {
      return await this.closeTokenSettlementMaster(settlement, accepter);
    }

    throw new ForbiddenException(ErrorMessages.UNAUTHORIZED_ACTION);
  }

  /**
   * Closes a token settlement request as a super master.
   *
   * @param settlement - The token settlement request to be closed.
   * @param user - The user information of the super master.
   * @returns The updated token settlement request with emails of the master and target users.
   * @throws - {@link ConflictException} if the token settlement request has already been accepted by the user or if the master approval is missing.
   */
  private async closeTokenSettlementSuperMaster(
    settlement: TokenSettlementRequest,
    user: UserInfo,
  ): Promise<TokenSettlementRequestWithEmails> {
    if (settlement.superMasterApprovedAt || !settlement.masterApprovedAt) {
      this.logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER,
          requestId: settlement.id,
          accepterId: user.id,
        },
        'closeTokenSettlement',
      );
      throw new ConflictException(
        ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER,
      );
    }
    const updatedRequest =
      await this.prismaService.tokenSettlementRequest.update({
        where: {
          id: settlement.id,
        },
        data: {
          status: TokenRequestStatuses.CLOSED,
          superMasterApprovedAt: new Date(),
        },
        select: this.tokenSettlementSelectWithEmails(),
      });
    return {
      ...updatedRequest,
      masterEmail: updatedRequest.master.email || '',
      targetEmail: updatedRequest.user.email || '',
      masterNickname: updatedRequest.master.nickname || '',
      targetNickname: updatedRequest.user.nickname || '',
    };
  }

  /**
   * Closes a token settlement request for a master user.
   *
   * @param settlement - The token settlement request to be closed.
   * @param user - The information of the user closing the request.
   * @returns The updated token settlement request with emails of the master and target users.
   * @throws - {@link ConflictException} If the token settlement request has already been accepted by the user.
   */
  private async closeTokenSettlementMaster(
    settlement: TokenSettlementRequest,
    user: UserInfo,
  ): Promise<TokenSettlementRequestWithEmails> {
    if (!settlement.superMasterApprovedAt || settlement.masterApprovedAt) {
      this.logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER,
          requestId: settlement.id,
          accepterId: user.id,
        },
        'closeTokenSettlement',
      );
      throw new ConflictException(
        ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER,
      );
    }
    const updatedRequest =
      await this.prismaService.tokenSettlementRequest.update({
        where: {
          id: settlement.id,
        },
        data: {
          status: TokenRequestStatuses.CLOSED,
          masterApprovedAt: new Date(),
        },
        select: this.tokenSettlementSelectWithEmails(),
      });
    return {
      ...updatedRequest,
      masterEmail: updatedRequest.master.email || '',
      targetEmail: updatedRequest.user.email || '',
      masterNickname: updatedRequest.master.nickname || '',
      targetNickname: updatedRequest.user.nickname || '',
    };
  }

  /**
   * Locks and rejects a token settlement request.
   *
   * @param params - The parameters for the token settlement request.
   * @param params.requestId - The ID of the token settlement request.
   * @param params.masterId - The ID of the master.
   * @returns A promise that resolves to a TokenSettlementRequestWithEmails object.
   */
  public async lockAndRejectTokenSettlement(params: {
    requestId: string;
    masterId: string;
  }): Promise<TokenSettlementRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.rejectTokenSettlementRequest(
          params.requestId,
          params.masterId,
        );
      },
      {
        lockKey: [`${LockKeys.RESOLVE_TOKEN_SETTLEMENT}:${params.requestId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'lockAndRejectTokenSettlement',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage:
          ErrorMessages.TOKEN_SETTLEMENT_ALREADY_ACCEPTED_BY_USER,
      },
    );
  }

  /**
   * Rejects a token settlement request.
   *
   * @param requestId - The ID of the token settlement request.
   * @param masterId - The ID of the master associated with the token settlement request.
   * @returns A Promise that resolves to a TokenSettlementRequestWithEmails object representing the rejected token settlement request.
   * @throws NotFoundException if the token settlement request is not found or is not of type VIP.
   * @throws ConflictException if the token settlement request is already resolved.
   */
  private async rejectTokenSettlementRequest(
    requestId: string,
    masterId: string,
  ): Promise<TokenSettlementRequestWithEmails> {
    const issue = await this.getTokenSettlementRequest(requestId, masterId);

    if (!issue || issue.type !== TokenSettlementTypes.VIP) {
      throw new NotFoundException(ErrorMessages.TOKEN_SETTLEMENT_NOT_FOUND);
    }

    if (issue.status !== TokenRequestStatuses.PENDING) {
      Logger.error(
        {
          message: ErrorMessages.TOKEN_SETTLEMENT_ALREADY_RESOLVED,
          requestId,
        },
        'acceptTokenSettlementRequest',
      );

      throw new ConflictException(
        ErrorMessages.TOKEN_SETTLEMENT_ALREADY_RESOLVED,
      );
    }

    return await this.prismaService.$transaction(async (transactionManager) => {
      const tokenSettlement =
        await transactionManager.tokenSettlementRequest.update({
          where: {
            id: requestId,
          },
          data: {
            status: TokenRequestStatuses.REJECTED,
          },
        });

      await this.transactionLedgerService.restoreUserTokens(
        {
          userId: issue.targetId,
          amount: issue.amount,
          tokenRequestId: issue.id,
        },
        transactionManager,
      );

      return {
        ...tokenSettlement,
        targetEmail: issue.user.email || '',
        targetNickname: issue.user.nickname || '',
        masterEmail: issue.master.email || '',
        masterNickname: issue.master.nickname || '',
      };
    });
  }

  private async getTokenSettlementRequest(
    requestId: string,
    masterId?: string,
  ): Promise<
    | (TokenSettlementRequest & {
        master: { email: string | null; nickname: string | null };
        user: { email: string | null; nickname: string | null };
      })
    | null
  > {
    return await this.prismaService.tokenSettlementRequest.findFirst({
      where: {
        id: requestId,
        masterId,
      },
      select: this.tokenSettlementSelectWithEmails(),
    });
  }

  private tokenSettlementSelectWithEmails(
    additionalSelects?: Prisma.TokenSettlementRequestSelect,
  ): Prisma.TokenSettlementRequestSelect {
    return this.tokenSettlementSelectFull({
      ...additionalSelects,
      master: {
        select: {
          email: true,
          nickname: true,
        },
      },
      user: {
        select: {
          email: true,
          nickname: true,
        },
      },
    });
  }

  /**
   * Returns a Prisma.TokenSettlementRequestSelect object with the specified additional selects.
   *
   * @param additionalSelects - Additional fields to select in the TokenSettlementRequest.
   * @returns A Prisma.TokenSettlementRequestSelect object.
   */
  private tokenSettlementSelectFull(
    additionalSelects?: Prisma.TokenSettlementRequestSelect,
  ): Prisma.TokenSettlementRequestSelect {
    return {
      ...additionalSelects,
      id: true,
      amount: true,
      masterId: true,
      status: true,
      targetId: true,
      initiator: true,
      masterApprovedAt: true,
      superMasterApprovedAt: true,
      proofUploader: true,
      proof: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager || this.prismaService;
  }
}
