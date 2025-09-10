import { ONE_MINUTE_IN_MS, ONE_SECOND_IN_MS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Role, Roles } from '@modules/role/enum/role.enum';
import { PagePaginationResponse } from '@common/types';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { CreateMasterTokenIssueDto } from '@modules/token-issue/dto/create-master-token-issue.dto';
import { CreateVipTokenIssueDto } from '@modules/token-issue/dto/create-vip-token-issue.dto';
import { TokenRequestStatuses } from '@modules/token-issue/enum/token-request-status.enum';
import { UserTokenIssueFilterQuery } from '@modules/token-issue/query/user-token-issue-filter.query';
import {
  CreateMasterTokenIssue,
  TokenIssueRequestWithEmails,
  TokenIssueWithRequester,
} from '@modules/token-issue/types';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { UserService } from '@modules/user/services/user.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TokenIssueRequest } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PermissionService } from '@modules/permission/service/permission.service';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { decimalToNumber } from '@utils/decimal-do-number';
import { LockKeys } from '@common/enums/lock-keys.enum';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationCodes } from '@infrastructure/database/prisma/constants';
import { GetAllTokenRequestsFilteredQuery } from '../query/get-all-tokes-filtered.query';

@Injectable()
export class TokenIssueService {
  protected readonly logger = new Logger(TokenIssueService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly permissionService: PermissionService,
    private readonly atomicLock: AtomicLock,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAllTokenIssuesMaster({
    filters,
    masterId,
  }: {
    filters: GetAllTokenRequestsFilteredQuery;
    masterId: string;
  }): Promise<PagePaginationResponse<TokenIssueWithRequester>> {
    const permissions =
      await this.permissionService.getUserPermissions(masterId);
    const { page, limit, search, startDate, endDate, amountMin, amountMax } =
      filters;
    const requestPage = page ?? 1;
    const requestLimit = limit ?? 10;
    const readMasterRequests = permissions.some(
      (permission) => permission === Permissions.READ_TOKEN_REQUESTS_MASTER,
    );
    const filter: Prisma.TokenIssueRequestWhereInput = {
      masterId: readMasterRequests ? undefined : masterId,
      amount: {
        gte: amountMin,
        lte: amountMax,
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      OR: search
        ? [
            {
              master: {
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
            },
            {
              requester: {
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
            },
          ]
        : undefined,

      // if the user has the permission to read master requests, we only show approved requests. VIP and Master requests
      ...(readMasterRequests ? { status: TokenRequestStatuses.APPROVED } : {}),
    };

    const count = await this.prismaService.tokenIssueRequest.count({
      where: filter,
    });
    const data = await this.prismaService.tokenIssueRequest.findMany({
      where: filter,
      select: {
        id: true,
        amount: true,
        requesterId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        paymentType: true,
        prepaidPercent: true,
        proof: true,
        initiator: true,
        masterId: true,
        master: {
          select: {
            email: true,
            nickname: true,
          },
        },
        requester: {
          select: {
            email: true,
            nickname: true,
            userBookieStake: true,
            flexibleBookieStake: true,
            predefinedBookieStake: true,
          },
        },
      },
      skip: (requestPage - 1) * requestLimit,
      take: filters.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      limit: requestLimit,
      page: requestPage,
      total: count,
      data,
    };
  }

  async getUserOwnTokenIssuesByPermissions({
    query,
    requesterId,
    userId,
  }: {
    userId?: string;
    requesterId: string;
    query: UserTokenIssueFilterQuery;
  }): Promise<PagePaginationResponse<TokenIssueWithRequester>> {
    if (userId) {
      await this.verifyRequesterReadPermissions(requesterId, userId);
    }

    return this.getAllTokenRequests({
      ...query,
      filter: { requesterId: userId || requesterId },
    });
  }

  async getMasterTokenIssuesByPermissions(
    userId: string,
    query: UserTokenIssueFilterQuery,
  ): Promise<PagePaginationResponse<TokenIssueWithRequester>> {
    return this.getAllTokenRequests({ ...query, filter: { masterId: userId } });
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
    const hasReadVipIssuesPermission = permissions.some(
      (permission) => permission === Permissions.READ_TOKEN_REQUESTS_VIP,
    );
    const hasReadMasterIssuesPermission = permissions.some(
      (permission) => permission === Permissions.READ_TOKEN_REQUESTS_MASTER,
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
      !hasReadMasterIssuesPermission &&
      targetUser.roles.some((role) => role.name === Roles.MASTER)
    ) {
      throw new ForbiddenException();
    }

    // Verify if the requester has the permission to read vip requests if the target user is a vip
    if (
      !hasReadVipIssuesPermission &&
      targetUser.roles.some((role) => role.name === Roles.VIP_USER)
    ) {
      throw new ForbiddenException();
    }
  }

  async getAllTokenRequests(
    query: UserTokenIssueFilterQuery & {
      filter?: Prisma.TokenIssueRequestWhereInput;
    },
  ): Promise<PagePaginationResponse<TokenIssueWithRequester>> {
    const offset = (query.page - 1) * query.limit;

    const count = await this.prismaService.tokenIssueRequest.count({
      where: {
        ...(query.filter || {}),
        status: query.status
          ? query.status === 'pending'
            ? TokenRequestStatuses.PENDING
            : {
                not: TokenRequestStatuses.PENDING,
              }
          : undefined,
      },
    });
    const data = await this.prismaService.tokenIssueRequest.findMany({
      where: {
        ...(query.filter || {}),
        status: query.status
          ? query.status === 'pending'
            ? TokenRequestStatuses.PENDING
            : {
                not: TokenRequestStatuses.PENDING,
              }
          : undefined,
      },
      include: {
        master: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            nickname: true,
            userBookieStake: true,
            flexibleBookieStake: true,
            predefinedBookieStake: true,
          },
        },
      },
      skip: offset,
      take: query.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      limit: query.limit,
      page: query.page,
      total: count,
      data,
    };
  }

  public async lockAndApproveTokenIssueRequest(params: {
    masterId: string;
    requestId: string;
    prepaidPercent?: number;
    paymentType?: 'usdt' | 'cash';
    proof?: string;
  }): Promise<TokenIssueRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.approveTokenIssueRequest(params);
      },
      {
        lockKey: [`resolveTokenIssue:${params.requestId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'acceptTokenIssueRequest',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage: ErrorMessages.TOKEN_REQUEST_IN_PROGRESS,
      },
    );
  }

  async approveTokenIssueRequest(params: {
    masterId: string;
    requestId: string;
    prepaidPercent?: number;
    paymentType?: 'usdt' | 'cash';
    proof?: string;
  }): Promise<TokenIssueRequestWithEmails> {
    const { requestId, masterId, prepaidPercent, paymentType, proof } = params;
    const issue = await this.getTokenIssueRequest(requestId, masterId);

    if (!issue) {
      throw new NotFoundException(ErrorMessages.TOKEN_ISSUE_NOT_FOUND);
    }

    if (issue.status !== TransactionStatuses.PENDING) {
      Logger.error(
        {
          message: ErrorMessages.TOKEN_ISSUE_ALREADY_RESOLVED,
          requestId,
        },
        'acceptTokenIssueRequest',
      );

      throw new ConflictException(ErrorMessages.TOKEN_ISSUE_ALREADY_RESOLVED);
    }
    const permissions =
      await this.permissionService.getUserPermissions(masterId);
    let request: TokenIssueRequest | null = null;
    if (
      permissions.some(
        (permission) => permission === Permissions.EDIT_TOKEN_REQUESTS_MASTER,
      )
    ) {
      request = await this.approveMasterTokenIssueRequest({
        requestId,
        prepaidPercent,
        paymentType,
        proof,
        tokenIssueRequest: issue,
      });
    } else if (
      permissions.some(
        (permission) => permission === Permissions.EDIT_TOKEN_REQUESTS_VIP,
      )
    ) {
      request = await this.approveVipTokenIssueRequest({
        masterId,
        requestId,
        prepaidPercent,
        paymentType,
        proof,
        tokenIssueRequest: issue,
      });
    }

    if (!request) {
      throw new ForbiddenException();
    }

    return {
      ...request,
      targetEmail: issue.requester.email || '',
      targetNickname: issue.requester.nickname || '',
      masterEmail: issue.master.email || '',
      masterNickname: issue.master.nickname || '',
    };
  }

  async approveVipTokenIssueRequest(params: {
    masterId: string;
    requestId: string;
    prepaidPercent?: number;
    paymentType?: 'usdt' | 'cash';
    proof?: string;
    tokenIssueRequest: TokenIssueRequest;
  }): Promise<TokenIssueRequest> {
    const {
      requestId,
      masterId,
      prepaidPercent,
      paymentType,
      proof,
      tokenIssueRequest,
    } = params;

    await this.verifyMasterTokenIssueConditions({
      issuerId: masterId,
      userId: tokenIssueRequest.requesterId,
      amount: tokenIssueRequest.amount,
    });

    return await this.prismaService.$transaction(async (transactionManager) => {
      await this.transactionLedgerService.subtractMasterTokens(
        {
          issuerId: masterId,
          amount: tokenIssueRequest.amount,
          tokenRequestId: tokenIssueRequest.id,
        },
        transactionManager,
      );

      await this.transactionLedgerService.issueTokensToUser(
        {
          amount: tokenIssueRequest.amount,
          targetId: tokenIssueRequest.requesterId,
          tokenRequestId: tokenIssueRequest.id,
          debt: this.calculateDebt({
            amount: tokenIssueRequest.amount,
            prepaidPercent,
          }),
        },
        transactionManager,
      );

      const issueRequest = await transactionManager.tokenIssueRequest.update({
        where: {
          id: requestId,
        },
        data: {
          prepaidPercent,
          status: TokenRequestStatuses.APPROVED,
          paymentType,
          proof,
        },
      });

      this.notificationsService.createNotification(
        issueRequest.requesterId,
        NotificationCodes.TOPUP_REQUEST_APPROVED,
        undefined,
        { amount: issueRequest.amount },
      );

      return issueRequest;
    });
  }

  async approveMasterTokenIssueRequest(params: {
    requestId: string;
    prepaidPercent?: number;
    paymentType?: 'usdt' | 'cash';
    proof?: string;
    tokenIssueRequest: TokenIssueRequest;
  }): Promise<TokenIssueRequest> {
    const { requestId, prepaidPercent, paymentType, proof, tokenIssueRequest } =
      params;

    return await this.prismaService.$transaction(async (transactionManager) => {
      await this.transactionLedgerService.issueTokensToUser(
        {
          amount: tokenIssueRequest.amount,
          targetId: tokenIssueRequest.requesterId,
          tokenRequestId: tokenIssueRequest.id,
          debt: this.calculateDebt({
            amount: tokenIssueRequest.amount,
            prepaidPercent,
          }),
        },
        transactionManager,
      );

      const updatedIssue = await transactionManager.tokenIssueRequest.update({
        where: {
          id: requestId,
        },
        data: {
          prepaidPercent,
          paymentType,
          status: TokenRequestStatuses.APPROVED,
          proof,
        },
      });

      this.notificationsService.createNotification(
        updatedIssue.requesterId,
        NotificationCodes.TOPUP_REQUEST_APPROVED,
        undefined,
        { amount: updatedIssue.amount },
      );

      return updatedIssue;
    });
  }

  private async getTokenIssueRequest(
    requestId: string,
    masterId?: string,
  ): Promise<
    | (TokenIssueRequest & {
        master: { email: string | null; nickname: string | null };
        requester: { email: string | null; nickname: string | null };
      })
    | null
  > {
    return await this.prismaService.tokenIssueRequest.findFirst({
      where: {
        id: requestId,
        masterId,
      },
      select: {
        id: true,
        amount: true,
        initiator: true,
        masterId: true,
        status: true,
        requesterId: true,
        paymentType: true,
        prepaidPercent: true,
        proof: true,
        createdAt: true,
        updatedAt: true,
        master: {
          select: {
            email: true,
            nickname: true,
          },
        },
        requester: {
          select: {
            email: true,
            nickname: true,
          },
        },
      },
    });
  }

  public async lockAndRejectTokenIssueRequest(params: {
    masterId: string;
    requestId: string;
  }): Promise<TokenIssueRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.rejectTokenIssueRequest(
          params.requestId,
          params.masterId,
        );
      },
      {
        lockKey: [`resolveTokenIssue:${params.requestId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'rejectTokenIssueRequest',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage: ErrorMessages.TOKEN_REQUEST_IN_PROGRESS,
      },
    );
  }

  async rejectTokenIssueRequest(
    requestId: string,
    masterId: string,
  ): Promise<TokenIssueRequestWithEmails> {
    const issue = await this.getTokenIssueRequest(requestId, masterId);

    if (!issue) {
      throw new NotFoundException(ErrorMessages.TOKEN_ISSUE_NOT_FOUND);
    }

    if (issue.status !== TokenRequestStatuses.PENDING) {
      Logger.error(
        {
          message: ErrorMessages.TOKEN_ISSUE_ALREADY_RESOLVED,
          requestId,
        },
        'masterRejectTokenIssueRequest',
      );

      throw new BadRequestException(ErrorMessages.TOKEN_ISSUE_ALREADY_RESOLVED);
    }

    const tokenIssue = await this.prismaService.tokenIssueRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: TokenRequestStatuses.REJECTED,
      },
    });

    this.notificationsService.createNotification(
      tokenIssue.requesterId,
      NotificationCodes.TOPUP_REQUEST_REJECTED,
      undefined,
      { amount: tokenIssue.amount },
    );

    return {
      ...tokenIssue,
      targetEmail: issue.requester.email || '',
      masterEmail: issue.master.email || '',
      targetNickname: issue.requester.nickname || '',
      masterNickname: issue.master.nickname || '',
    };
  }

  public async lockAndCreateTokenIssue(params: {
    target: string;
    issuer: string;
    createTokenIssueDto: CreateVipTokenIssueDto | CreateMasterTokenIssueDto;
  }): Promise<TokenIssueRequestWithEmails> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.createTokenIssue({
          createTokenIssueDto: params.createTokenIssueDto,
          issuer: params.issuer,
          target: params.target,
        });
      },
      {
        lockKey: [
          `${LockKeys.REQUEST_TOKEN_ISSUE}:${params.issuer}:${params.target}`,
        ],
        lockDuration: ONE_MINUTE_IN_MS,
        context: 'createTokenIssue',
        options: {
          retryCount: 0,
        },
        conflictErrorMessage: ErrorMessages.TOKEN_REQUEST_IN_PROGRESS,
      },
    );
  }

  async createSuperMasterTokenIssue(
    params: {
      target: string;
      issuer: string;
      createTokenIssue: CreateMasterTokenIssue;
      masterEmail: string;
      masterNickname: string;
      userEmail: string;
      targetNickname: string;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<TokenIssueRequestWithEmails> {
    if (!transactionManager) {
      return await this.prismaService.$transaction(
        async (transactionManager) => {
          return await this.createSuperMasterTokenIssue(
            params,
            transactionManager,
          );
        },
      );
    }
    const {
      createTokenIssue: createTokenIssueDto,
      issuer,
      target,
      masterEmail,
      userEmail,
      masterNickname,
      targetNickname,
    } = params;
    const tokenIssue = await transactionManager.tokenIssueRequest.create({
      data: {
        amount: new Decimal(createTokenIssueDto.amount),
        paymentType: createTokenIssueDto.paymentType,
        proof: createTokenIssueDto.proof,
        prepaidPercent: createTokenIssueDto.prepaid,
        requesterId: target,
        masterId: issuer,
        initiator: Roles.SUPER_MASTER,
        status: TokenRequestStatuses.APPROVED,
      },
    });

    await this.transactionLedgerService.issueTokensToUser(
      {
        amount: new Decimal(createTokenIssueDto.amount),
        targetId: target,
        tokenRequestId: tokenIssue.id,
        debt: this.calculateDebt({
          amount: createTokenIssueDto.amount,
          prepaidPercent: createTokenIssueDto.prepaid,
        }),
      },
      transactionManager,
    );
    return {
      ...tokenIssue,
      targetEmail: userEmail,
      masterEmail,
      targetNickname,
      masterNickname,
    };
  }

  async createMasterTokenIssue(
    params: {
      target: string;
      issuer: string;
      amount: Decimal;
      masterEmail: string;
      masterNickname: string;
      userEmail: string;
      targetNickname: string;
      prepaidPercent: number | undefined;
      proof?: string;
      paymentType?: 'usdt' | 'cash';
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<TokenIssueRequestWithEmails> {
    if (!transactionManager) {
      return await this.prismaService.$transaction(
        async (transactionManager) => {
          return await this.createMasterTokenIssue(params, transactionManager);
        },
      );
    }

    await this.verifyMasterTokenIssueConditions(
      {
        issuerId: params.issuer,
        userId: params.target,
        amount: params.amount,
      },
      transactionManager,
    );

    const savedRequest = await transactionManager.tokenIssueRequest.create({
      data: {
        amount: params.amount,
        requesterId: params.target,
        masterId: params.issuer,
        initiator: Roles.MASTER,
        prepaidPercent: params.prepaidPercent,
        paymentType: params.paymentType,
        proof: params.proof,
        status: TokenRequestStatuses.APPROVED,
      },
    });

    await this.transactionLedgerService.subtractMasterTokens(
      {
        issuerId: params.issuer,
        amount: params.amount,
        tokenRequestId: savedRequest.id,
      },
      transactionManager,
    );
    await this.transactionLedgerService.issueTokensToUser(
      {
        debt: this.calculateDebt({
          amount: params.amount,
          prepaidPercent: params.prepaidPercent,
        }),
        amount: params.amount,
        targetId: params.target,
        tokenRequestId: savedRequest.id,
      },
      transactionManager,
    );

    const userBookieStake = await this.userService.getUserBookieStakeOrThrow(
      params.target,
      transactionManager,
    );

    return {
      ...savedRequest,
      masterEmail: params.masterEmail || '',
      targetEmail: params.userEmail || '',
      targetNickname: params.targetNickname || '',
      masterNickname: params.masterNickname || '',
      userBookieStake: decimalToNumber(userBookieStake.userBookieStake),
    };
  }

  private async createTokenIssue(params: {
    target: string;
    issuer: string;
    createTokenIssueDto: CreateVipTokenIssueDto | CreateMasterTokenIssueDto;
  }): Promise<TokenIssueRequestWithEmails> {
    const { createTokenIssueDto, issuer, target } = params;
    const user = await this.userService.findById(target);

    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const permissions = await this.permissionService.getUserPermissions(issuer);

    const master = user.masterId;

    if (!master || master !== issuer) {
      this.logger.error(
        {
          message: 'User without a master requested tokens',
          target,
        },
        'createTokenIssueRequest',
      );
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const masterInfo = await this.userService.findById(issuer);

    if (
      permissions.some(
        (permission) => permission === Permissions.CREATE_TOKEN_REQUESTS_MASTER,
      )
    ) {
      return await this.createSuperMasterTokenIssue({
        createTokenIssue: createTokenIssueDto as CreateMasterTokenIssueDto,
        issuer,
        masterEmail: masterInfo?.email || '',
        masterNickname: masterInfo?.nickname || '',
        target,
        userEmail: user.email || '',
        targetNickname: user.nickname || '',
      });
    }

    if (
      permissions.some(
        (permission) => permission === Permissions.CREATE_TOKEN_REQUESTS_VIP,
      )
    ) {
      return await this.createMasterTokenIssue({
        amount: new Decimal(createTokenIssueDto.amount),
        issuer,
        masterEmail: masterInfo?.email || '',
        masterNickname: masterInfo?.nickname || '',
        target,
        userEmail: user.email || '',
        targetNickname: user.nickname || '',
        prepaidPercent: createTokenIssueDto.prepaid,
      });
    }

    throw new ForbiddenException();
  }

  public async lockAndCreateTokenIssueRequest(params: {
    userId: string;
    amount: Decimal;
  }): Promise<TokenIssueRequest> {
    return this.atomicLock.withLockGuard(
      async () => {
        return await this.createTokenIssueRequest(params.userId, params.amount);
      },
      {
        lockKey: [`${LockKeys.REQUEST_TOKEN_ISSUE}:${params.userId}`],
        lockDuration: ONE_SECOND_IN_MS * 5,
        context: 'createTokenIssueRequest',
        options: {
          retryCount: 0,
        },
        releaseOnComplete: false,
        releaseOnFail: true,
        conflictErrorMessage: ErrorMessages.TOKEN_REQUEST_IN_PROGRESS,
      },
    );
  }

  private async verifyMasterTokenIssueConditions(
    params: {
      issuerId: string;
      userId: string;
      amount: Decimal;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<void> {
    const { issuerId, userId, amount } = params;
    const masterInfo = await this.userService.getMasterUserDetails(
      issuerId,
      transactionManager,
    );

    if (masterInfo === null) {
      throw new ForbiddenException(ErrorMessages.USER_NOT_FOUND);
    }

    const usersExposure = await this.getMasterUsersExposure({
      masterId: issuerId,
      userId,
    });

    if (
      masterInfo.maxExposurePerVip !== null &&
      Decimal.sum(usersExposure, amount).greaterThan(
        masterInfo.maxExposurePerVip,
      )
    ) {
      throw new ForbiddenException(
        ErrorMessages.MASTER_REACHED_MAX_USER_EXPOSURE,
      );
    }
  }

  /**
   * Fetch the total exposure a master has for all his users
   * @param props.masterId The id of the master
   * @returns The total exposure of the master
   */
  async getMastersExposure(props: { masterId: string }): Promise<Decimal> {
    const { masterId } = props;

    // NOTE - this could be optimized with a hypertable, that fetches the
    // aggregate directly

    const startWeekDate = new Date();
    startWeekDate.setHours(0, 0, 0, 0);
    startWeekDate.setDate(startWeekDate.getDate() - startWeekDate.getDay());

    const lastDayOfWeek = new Date(startWeekDate);

    lastDayOfWeek.setDate(startWeekDate.getDate() + 6);

    const masterIssues = await this.prismaService.tokenIssueRequest.findMany({
      where: {
        masterId,
        status: TokenRequestStatuses.APPROVED,
        createdAt: {
          gte: startWeekDate,
          lte: lastDayOfWeek,
        },
      },
      select: {
        amount: true,
      },
    });

    return masterIssues.reduce(
      (total, { amount }) => Decimal.sum(total, amount),
      new Decimal(0),
    );
  }

  /**
   * Fetch the total exposure a master has for a specific user
   * @param props.masterId The id of the master of the vip user
   * @param props.userId The id of the vip user
   * @returns The total exposure of the user
   */
  async getMasterUsersExposure(
    props: {
      masterId: string;
      userId: string;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Decimal> {
    const { masterId, userId } = props;

    // NOTE - this could be optimized with a hypertable, that fetches the
    // aggregate directly
    const startWeekDate = new Date();
    startWeekDate.setHours(0, 0, 0, 0);
    startWeekDate.setDate(startWeekDate.getDate() - startWeekDate.getDay());

    const lastDayOfWeek = new Date(startWeekDate);

    lastDayOfWeek.setDate(startWeekDate.getDate() + 6);
    const client = this.getClient(transactionManager);
    const masterIssues = await client.tokenIssueRequest.findMany({
      where: {
        masterId,
        requesterId: userId,
        status: TokenRequestStatuses.APPROVED,
        createdAt: {
          gte: startWeekDate,
          lte: lastDayOfWeek,
        },
      },
      select: {
        amount: true,
      },
    });

    return masterIssues.reduce(
      (total, { amount }) => Decimal.sum(total, amount),
      new Decimal(0),
    );
  }

  private async createTokenIssueRequest(
    userId: string,
    amount: Decimal,
  ): Promise<TokenIssueRequest> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const master = user.masterId;

    if (!master) {
      this.logger.error(
        {
          message: 'User without a master requested tokens',
          userId,
        },
        'createTokenIssueRequest',
      );
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const request = await this.prismaService.tokenIssueRequest.create({
      data: {
        amount,
        requesterId: userId,
        masterId: master,
        initiator: user.roles[0].name as Role,
        status: TokenRequestStatuses.PENDING,
      },
    });

    this.notificationsService.createNotification(
      master,
      NotificationCodes.TOPUP_REQUEST_CREATED,
      undefined,
      { amount },
    );

    return request;
  }

  private calculateDebt(params: {
    amount: Decimal;
    prepaidPercent?: number;
  }): Decimal {
    return Decimal.mul(params.amount, 1 - (params.prepaidPercent || 0));
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
