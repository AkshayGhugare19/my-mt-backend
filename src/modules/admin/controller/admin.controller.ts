import { UserContext } from '@common/decorators/user-context.decorator';
import { PagePaginationResponse, PagePaginationResponseSchema } from '@common/types';
import { AdminDto } from '@modules/admin/dtos/admin.dto';
import { CreateMasterResponseDto } from '@modules/admin/dtos/create-master-response.dto';
import { CreateMasterDto } from '@modules/admin/dtos/create-master.dto';
import { CreateUserResponseDto } from '@modules/admin/dtos/create-user-response.dto';
import { MasterStatisticsAdminDto } from '@modules/admin/dtos/master-statistics.dto';
import { UserStatisticsAdminDto } from '@modules/admin/dtos/user-statistics.dto';
import { GetAllUsersFilteredQuery } from '@modules/admin/query/get-users-filter.query';
import { AdminService } from '@modules/admin/service/admin.service';
import { JwtPayload } from '@modules/authentication/types';
import { UserService } from '@modules/user/services/user.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { decimalToNumber } from '@utils/decimal-do-number';
import { UpdateMasterLimitsDto } from '../dtos/update-master-limits.dto';
import { UpdateVipLimitsDto } from '../dtos/update-vip-limits.dto';
import { UpdateUserWithdrawalSettingsDto } from '@modules/admin/dtos/update-user-withdrawal-settings.dto';
import { ChangePasswordDto } from '@modules/user/dto/change-password.dto';
import { UserPasswordService } from '@modules/user/services/password.service';
import { CreateVipDto } from '@modules/admin/dtos/create-vip.dto';
import { RequirePermissions, allOf, anyOf } from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { CreateBaseAdminDto } from '@modules/admin/dtos/create-base-admin.dto';
import { CreateAdminResponseDto } from '@modules/admin/dtos/create-admin-response';
import {
  GameBetReportAdminDto,
  SportsExchangeBetReportAdminDto,
  SportsbookBetReportAdminDto,
  UserTransactionsReportAdminDto,
} from '../dtos/profile-reports.dto';
import { DepositService } from '@modules/deposits/service/deposit.service';
import { WithdrawalService } from '@modules/withdrawal/service/withdrawal.service';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { Update2FADto } from '../dtos/update-2fa.dto';
import { BetReportsService } from '@modules/bet/service/bet-reports.service';
import { UserWithStatistics } from '../types';
import { TokenSettlementService } from '@modules/token-settlement/service/token-settlement.service';
import { TokenSettlementAdminDto } from '@modules/token-settlement/dto/token-settlement-admin.dto';
import { TokenIssueService } from '@modules/token-issue/service/token-issue.service';
import { TokenIssueAdminDto } from '@modules/token-issue/dto/token-issue-admin.dto';
import { ManualUpdateMasterBalanceDto } from '@modules/admin/dtos/manual-adjust-user-balance.dto';
import { BalanceAdjustmentDto } from '@modules/admin/dtos/balance-adjustment.dto';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { FilterTokenRequestsQuery } from '@modules/admin/query/filter-token-requests.query';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { EvenBetService } from '@modules/betting-providers/evenbet/service/evenbet.service';
import { TransactionsDto } from '@modules/betting-providers/evenbet/dto/transaction.dto';
import { UploadPokerRakeDto } from '../dtos/upload-rake.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { UpdateVipPreferencesDto } from '@modules/admin/dtos/update-vip-preferences.dot';
import { UserStatisticsSchema } from '@modules/user/dto/user-statistics.dto';
import { $filters, Filterable } from '@meta/filters';
import { DateTime } from 'luxon';
import { ExportUsersDto } from '../dtos/export-users.dto';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { RequestSnapshotInterceptor } from '@common/interceptors/request-snapshot.interceptor';
import { ReadStream } from 'fs';
import { Response } from 'express';
import { pipeline } from 'stream';

@ApiTags('Admin Users')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userService: UserService,
    private readonly passwordService: UserPasswordService,
    private readonly permissionService: PermissionService,
    private readonly depositService: DepositService,
    private readonly withdrawalsService: WithdrawalService,
    private readonly betReportsService: BetReportsService,
    private readonly settlementService: TokenSettlementService,
    private readonly tokenIssueService: TokenIssueService,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly evenBetService: EvenBetService,
  ) {}

  @Get('/me')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_MASTER_OWN_DETAILS, Permissions.READ_SUPER_MASTER_DETAILS, Permissions.READ_OWN_PROFILE),
  )
  async getAdminInfo(@UserContext() { sub }: JwtPayload): Promise<AdminDto> {
    const userPermissions = await this.permissionService.getUserPermissions(sub);

    if (userPermissions.includes(Permissions.READ_MASTER_OWN_DETAILS)) {
      const user = await this.adminService.getMasterProfileInfo(sub);
      const permissions = await this.permissionService.getUserPermissions(sub);
      return AdminDto.from({ ...user, permissions });
    }

    if (userPermissions.includes(Permissions.READ_OWN_PROFILE)) {
      const user = await this.adminService.getAdminProfileInfo(sub);
      const permissions = await this.permissionService.getUserPermissions(sub);
      return new AdminDto({
        createdAt: user.createdAt,
        balance: 0,
        email: user.email || '',
        role: user.roles.at(0)?.name as string,
        id: user.id,
        enable2FA: user.enable2FA,
        resetPasswordRequired: false,
        nickname: user.nickname || undefined,
        maxExposurePerVip: null,
        maxNumberOfUsers: null,
        managedUsers: 0,
        permissions,
      });
    }

    const user = await this.adminService.getSuperMasterProfileInfo(sub);
    const permissions = await this.permissionService.getUserPermissions(sub);
    return new AdminDto({
      createdAt: user.createdAt,
      balance: decimalToNumber(user.balance) || 0,
      email: user.email || '',
      role: user.roles.at(0)?.name as string,
      id: user.id,
      enable2FA: user.enable2FA,
      resetPasswordRequired: false,
      nickname: user.nickname || undefined,
      maxExposurePerVip: null,
      maxNumberOfUsers: null,
      managedUsers: user.managedUsers,
      permissions,
    });
  }

  @Get('/users')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.READ_ALL_USER,
      Permissions.READ_VIP_OWN,
      Permissions.READ_USER,
      Permissions.READ_MASTER,
      Permissions.READ_ACCOUNTANT,
      Permissions.READ_CUSTOMER_SUPPORT,
      Permissions.READ_RISK_MANAGEMENT,
      Permissions.READ_MARKETING,
      Permissions.READ_VIP,
      Permissions.READ_LIVE_USERS,
    ),
  )
  async getAllUsers(
    @UserContext() { sub }: JwtPayload,
    @Query() getAllUsersFilteredQuery: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserStatisticsAdminDto>> {
    const users = await this.adminService.getAllUsers(sub, getAllUsersFilteredQuery);
    return {
      data: users.data.map((user) => {
        return UserStatisticsAdminDto.fromUserStatistics(user);
      }),
      limit: users.limit,
      page: users.page,
      total: users.total,
    };
  }

  @Get('/users/vips')
  @RequirePermissions('admin', anyOf(Permissions.READ_VIP, Permissions.READ_VIP_OWN))
  @ApiCreatedResponse({
    type: PagePaginationResponseSchema({ UserStatisticsSchema }),
  })
  async getAllVipUsers(
    @UserContext() { sub }: JwtPayload,
    @Query() getAllUsersFilteredQuery: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserStatisticsAdminDto>> {
    const users = await this.adminService.getAllVipUsers(sub, getAllUsersFilteredQuery);
    return {
      data: users.data.map((user) => {
        return UserStatisticsAdminDto.fromUserStatistics(user);
      }),
      limit: users.limit,
      page: users.page,
      total: users.total,
    };
  }

  @Get('/users/live-users')
  @RequirePermissions('admin', anyOf(Permissions.READ_LIVE_USERS))
  async getAllLiveUsers(
    @UserContext() { sub }: JwtPayload,
    @Query() getAllUsersFilteredQuery: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserStatisticsAdminDto>> {
    const { data, limit, page, total } = await this.adminService.getLiveUsers(sub, getAllUsersFilteredQuery);

    return {
      data: data.map((user) => {
        return UserStatisticsAdminDto.fromUserStatistics(user);
      }),
      limit,
      page,
      total,
    };
  }

  @Get('/users/blocked-users')
  @RequirePermissions('admin', anyOf(Permissions.READ_BLOCKED_USERS, Permissions.READ_BLOCKED_VIP_OWN))
  async getAllBlockedUsers(
    @UserContext() { sub }: JwtPayload,
    @Query() getAllUsersFilteredQuery: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserStatisticsAdminDto>> {
    const { data, limit, page, total } = await this.adminService.getBlockedUsers(sub, getAllUsersFilteredQuery);

    return {
      data: data.map((user) => {
        return UserStatisticsAdminDto.fromUserStatistics(user);
      }),
      limit,
      page,
      total,
    };
  }

  @Get('/users/masters')
  @RequirePermissions('admin', allOf(Permissions.READ_MASTER))
  async getAllMastersUsers(
    @Query() getAllMastersFilteredQuery: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<MasterStatisticsAdminDto>> {
    const users = await this.userService.filterMasterUsers(getAllMastersFilteredQuery);
    return {
      data: users.data.map((user) => {
        return MasterStatisticsAdminDto.fromMasterStatistics(user);
      }),
      limit: users.limit,
      page: users.page,
      total: users.total,
    };
  }

  @Get('/users/masters/:id')
  @RequirePermissions('admin', allOf(Permissions.READ_MASTER))
  async getMasterUserProfile(@Param('id') masterId: string): Promise<MasterStatisticsAdminDto> {
    const user = await this.adminService.getAdminInfo(masterId);
    return MasterStatisticsAdminDto.fromMasterStatistics({
      ...user,
      _count: { users: user.managedUsers },
      balance: {
        debt: user.debt,
        balance: user.balance,
        userId: user.id,
        totalIssuedTo: user.totalIssuedTo,
        totalSettled: user.totalSettled,
      },
    });
  }

  @Get('/users/masters/:id/vips')
  @RequirePermissions('admin', allOf(Permissions.READ_MASTER))
  async getMasterVips(
    @Param('id') masterId: string,
    @Query() getAllUsersFilteredQuery: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserStatisticsAdminDto>> {
    const users = await this.adminService.getAllVipUsers(masterId, getAllUsersFilteredQuery);
    return {
      data: users.data.map((user) => {
        return UserStatisticsAdminDto.fromUserStatistics(user);
      }),
      limit: users.limit,
      page: users.page,
      total: users.total,
    };
  }

  @Get('/users/:id/deposits')
  @RequirePermissions('admin', allOf(Permissions.READ_USER_DETAILS))
  async getUserDeposits(
    @Param('id') userId: string,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<UserTransactionsReportAdminDto>> {
    const { data: deposits, count } = await this.depositService.getUserDeposits(userId, page, limit);

    const items = deposits.map(
      (deposit) =>
        new UserTransactionsReportAdminDto({
          id: deposit.id,
          transactionId: deposit.transaction_id,
          date: deposit.created_at,
          amount: decimalToNumber(deposit.amount),
          status: deposit.status,
          currency: deposit.currency,
          blockchain: deposit.blockchain,
          usdAmount: deposit.usd_amount,
          cryptoAmount: deposit.crypto_amount,
        }),
    );

    return {
      data: items,
      limit,
      page,
      total: count,
    };
  }

  @Get('/users/:id/withdrawals')
  @RequirePermissions('admin', allOf(Permissions.READ_USER_DETAILS))
  async getUserWithdrawals(
    @Param('id') userId: string,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<UserTransactionsReportAdminDto>> {
    const { data: withdrawals, total } = await this.withdrawalsService.getAllUsersRequests({
      userId,
      filters: {
        status: 'all',
        page,
        limit,
      },
    });

    const items = withdrawals.map(
      (w) =>
        new UserTransactionsReportAdminDto({
          id: w.id,
          transactionId: w.transactionHash ?? w.proof ?? '-',
          date: w.createdAt,
          amount: decimalToNumber(w.amount),
          status: w.status,
          currency: w.currency,
          targetWallet: w.targetWallet,
          blockchain: w.blockchain,
          usdAmount: w.usdAmount?.toNumber(),
        }),
    );

    return {
      data: items,
      limit,
      page,
      total,
    };
  }

  @Get('/users/:id/sports-book-bets')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_USER_DETAILS, Permissions.READ_VIP_DETAILS, Permissions.READ_VIP_OWN),
  )
  async getUserSportsBookBets(
    @Param('id') userId: string,
    @UserContext() { sub }: JwtPayload,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<SportsbookBetReportAdminDto>> {
    await this.verifyUserMaster(sub, userId);
    const items = await this.betReportsService.getUserSportbookBets(userId, page, limit);

    const data = items.data.map((item) => new SportsbookBetReportAdminDto(item));

    return {
      data,
      limit,
      page,
      total: items.count,
    };
  }

  @Get('/users/:id/sports-exchange-bets')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_USER_DETAILS, Permissions.READ_VIP_DETAILS, Permissions.READ_VIP_OWN),
  )
  async getUserSportsExchangeBets(
    @Param('id') userId: string,
    @UserContext() { sub }: JwtPayload,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<SportsExchangeBetReportAdminDto>> {
    await this.verifyUserMaster(sub, userId);
    const items = await this.betReportsService.getUserSportsExchangeBets(userId, page, limit);

    const data = items.data.map((item) => new SportsExchangeBetReportAdminDto(item));

    return {
      data,
      limit,
      page,
      total: items.count,
    };
  }

  @Get('/users/:id/games-bets')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_USER_DETAILS, Permissions.READ_VIP_DETAILS, Permissions.READ_VIP_OWN),
  )
  async getUserGameBets(
    @Param('id') userId: string,
    @UserContext() { sub }: JwtPayload,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<GameBetReportAdminDto>> {
    await this.verifyUserMaster(sub, userId);
    const items = await this.betReportsService.getUserGamesBets(userId, page, limit);

    const data = items.data.map((item) => new GameBetReportAdminDto(item));

    return {
      data,
      limit,
      page,
      total: items.count,
    };
  }

  @Get('/users/balance/adjustments')
  @RequirePermissions('admin', allOf(Permissions.READ_BALANCE_ADJUSTMENTS))
  async getBalanceAdjustments(
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<BalanceAdjustmentDto>> {
    const adjustments = await this.transactionLedgerService.getBalanceAdjustmentsWhere({}, page, limit);

    return {
      data: adjustments.data.map((adjustment) => BalanceAdjustmentDto.fromAdjustmentWithUserDetails(adjustment)),
      limit: adjustments.limit,
      page: adjustments.page,
      total: adjustments.total,
    };
  }

  @Get('/users/balance/adjustments/own')
  @RequirePermissions('admin', allOf(Permissions.READ_OWN_BALANCE_ADJUSTMENTS))
  async getOwnBalanceAdjustments(
    @UserContext('sub') sub: string,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<BalanceAdjustmentDto>> {
    const adjustments = await this.transactionLedgerService.getBalanceAdjustmentsWhere(
      {
        userId: sub,
      },
      page,
      limit,
    );

    return {
      data: adjustments.data.map((adjustment) => BalanceAdjustmentDto.fromAdjustmentWithUserDetails(adjustment)),
      limit: adjustments.limit,
      page: adjustments.page,
      total: adjustments.total,
    };
  }

  @Get('/users/:id/balance/adjustments')
  @RequirePermissions('admin', allOf(Permissions.READ_BALANCE_ADJUSTMENTS))
  async getUserBalanceAdjustments(
    @Param('id') userId: string,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<BalanceAdjustmentDto>> {
    const adjustments = await this.transactionLedgerService.getBalanceAdjustmentsWhere(
      {
        userId,
      },
      page,
      limit,
    );

    return {
      data: adjustments.data.map((adjustment) => BalanceAdjustmentDto.fromAdjustmentWithUserDetails(adjustment)),
      limit: adjustments.limit,
      page: adjustments.page,
      total: adjustments.total,
    };
  }

  @Get('/users/token/settlements')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_SETTLEMENTS, Permissions.READ_SETTLEMENTS_SMM, Permissions.READ_SETTLEMENTS_VIPS),
  )
  async getUserTokenSettlements(
    @UserContext('sub') sub: string,
    @Query() { page, limit, userId }: FilterTokenRequestsQuery,
  ): Promise<PagePaginationResponse<TokenSettlementAdminDto>> {
    const requests = await this.settlementService.getTokenSettlementRequestsByPermissions({
      requesterId: sub,
      filter: {},
      targetId: userId ?? sub,
      page,
      limit,
    });

    return {
      data: requests.data.map((request) => TokenSettlementAdminDto.from(request)),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }

  @Get('/users/vips/token/settlements')
  @RequirePermissions('admin', anyOf(Permissions.READ_SETTLEMENTS, Permissions.READ_SETTLEMENTS_VIPS))
  /**
   * Get all token settlement requests for VIPS of a master user.
   */
  async getMasterVipsTokenSettlements(
    @UserContext('sub') sub: string,
    @Query() { page, limit, userId }: FilterTokenRequestsQuery,
  ): Promise<PagePaginationResponse<TokenSettlementAdminDto>> {
    const permissions = await this.permissionService.getUserPermissions(sub);
    const targetId = permissions.includes(Permissions.READ_VIP_OWN) ? sub : userId;
    const requests = await this.settlementService.getTokenSettlementRequestsByPermissions({
      requesterId: sub,
      filter: {
        masterId: targetId ?? sub,
      },
      page,
      limit,
    });

    return {
      data: requests.data.map((request) => TokenSettlementAdminDto.from(request)),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }

  @Get('/users/token/issues')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_TOKEN_REQUESTS, Permissions.READ_TOKEN_REQUESTS_VIP, Permissions.READ_TOKEN_REQUESTS_MASTER),
  )
  /**
   * Get all token issue requests for the user, which can be either a VIP or a Master.
   * The requests returned are the ones for which the userId is the requester.
   */
  async getUserTokenIssueRequests(
    @UserContext('sub') sub: string,
    @Query() { page, limit, userId }: FilterTokenRequestsQuery,
  ): Promise<PagePaginationResponse<TokenIssueAdminDto>> {
    const requests = await this.tokenIssueService.getUserOwnTokenIssuesByPermissions({
      userId,
      requesterId: sub,
      query: {
        limit,
        page,
      },
    });
    return {
      data: requests.data.map((request) => TokenIssueAdminDto.fromTokenIssueWithRequester(request)),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }

  @Get('/users/vips/token/issues')
  /**
   * Get all token settlement requests for VIPS of a master user.
   */
  @RequirePermissions('admin', anyOf(Permissions.READ_TOKEN_REQUESTS_MASTER))
  async getMasterUserTokenIssueRequests(
    @UserContext('sub') sub: string,
    @Query() { page, limit, userId }: FilterTokenRequestsQuery,
  ): Promise<PagePaginationResponse<TokenIssueAdminDto>> {
    const permissions = await this.permissionService.getUserPermissions(sub);
    const targetId = permissions.includes(Permissions.READ_VIP_OWN) ? sub : userId;
    const requests = await this.tokenIssueService.getMasterTokenIssuesByPermissions(targetId ?? sub, {
      limit,
      page,
    });
    return {
      data: requests.data.map((request) => TokenIssueAdminDto.fromTokenIssueWithRequester(request)),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }

  @Post('/users/:id/password')
  @HttpCode(200)
  @RequirePermissions('admin', anyOf(Permissions.EDIT_PASSWORD, Permissions.EDIT_OWN_VIP_PASSWORD))
  async regenerateUserPassword(
    @UserContext('sub') sub: string,
    @Param('id') userId: string,
  ): Promise<{ password: string }> {
    const password = await this.passwordService.regeneratePassword(sub, userId);

    return {
      password,
    };
  }

  private async verifyUserMaster(sub: string, userId: string): Promise<void> {
    const permissions = await this.permissionService.getUserPermissions(sub);
    if (
      permissions.includes(Permissions.READ_VIP_OWN) &&
      !permissions.some(
        (permission) => permission === Permissions.READ_USER_DETAILS || permission === Permissions.READ_VIP_DETAILS,
      )
    ) {
      await this.adminService.checkIfUserBelongsToMasterOrThrow(userId, sub);
    }
  }

  @Post('/users/:id/block')
  @RequirePermissions('admin', anyOf(Permissions.BLOCK_USER, Permissions.BLOCK_VIP_OWN))
  async blockUser(
    @UserContext() { sub }: JwtPayload,
    @Param('id') userToBlockId: string,
  ): Promise<UserWithStatistics | undefined> {
    return await this.adminService.blockUser(sub, userToBlockId);
  }

  @Post('/users/:id/unblock')
  @RequirePermissions('admin', anyOf(Permissions.BLOCK_USER, Permissions.BLOCK_VIP_OWN))
  async unblockUser(
    @UserContext() { sub }: JwtPayload,
    @Param('id') userToUnblockId: string,
  ): Promise<UserWithStatistics | undefined> {
    return await this.adminService.unblockUser(sub, userToUnblockId);
  }

  @Get('/users/:id')
  @RequirePermissions('admin', anyOf(Permissions.READ_USER_DETAILS, Permissions.READ_VIP_OWN))
  async getUserAdminInfo(
    @UserContext() { sub }: JwtPayload,
    @Param('id') userId: string,
  ): Promise<UserStatisticsAdminDto> {
    const user = await this.adminService.getUserStatistics(userId, sub);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return UserStatisticsAdminDto.fromUserStatistics(user);
  }

  @Post('/users/vips')
  @RequirePermissions('admin', allOf(Permissions.CREATE_VIP))
  async createUser(
    @UserContext() { sub }: JwtPayload,
    @Body() createUserDto: CreateVipDto,
  ): Promise<CreateUserResponseDto> {
    const savedUser = await this.adminService.createVip(sub, createUserDto);
    return {
      nickname: savedUser.nickname,
      email: savedUser.email,
      password: savedUser.password,
      role: savedUser.role,
      balance: decimalToNumber(savedUser.balance),
      userId: savedUser.userId,
      maxBetSize: decimalToNumber(savedUser.maxBetSize),
      userBookieStake: savedUser.userBookieStake,
      isBonusEnabled: savedUser.isBonusEnabled,
    };
  }

  @Post('/users/masters')
  @RequirePermissions('admin', allOf(Permissions.CREATE_MASTER))
  async createMasterUser(
    @UserContext() { sub }: JwtPayload,
    @Body() createMasterDto: CreateMasterDto,
  ): Promise<CreateMasterResponseDto> {
    const savedUser = await this.adminService.createMaster(sub, createMasterDto);
    return CreateMasterResponseDto.from(savedUser);
  }

  @Post('/users/marketing')
  @RequirePermissions('admin', allOf(Permissions.CREATE_MARKETING))
  async createMarketingUser(
    @UserContext() { sub }: JwtPayload,
    @Body() createMarketingUserDto: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    const savedUser = await this.adminService.createMarketing(sub, createMarketingUserDto);
    return new CreateAdminResponseDto({
      id: savedUser.id,
      email: savedUser.email,
      password: savedUser.password,
      role: savedUser.role,
      nickname: savedUser.nickname,
    });
  }

  @Post('/users/partners')
  @RequirePermissions('admin', allOf(Permissions.CREATE_PARTNER))
  async createMPartnerUser(
    @UserContext() { sub }: JwtPayload,
    @Body() createPartnerDto: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    const savedUser = await this.adminService.createPartner(sub, createPartnerDto);
    return new CreateAdminResponseDto({
      id: savedUser.id,
      email: savedUser.email,
      password: savedUser.password,
      role: savedUser.role,
      nickname: savedUser.nickname,
    });
  }

  @Post('/users/risk-management')
  @RequirePermissions('admin', allOf(Permissions.CREATE_RISK_MANAGEMENT))
  async createRiskManagementUser(
    @UserContext() { sub }: JwtPayload,
    @Body() createRiskManagementDto: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    const savedUser = await this.adminService.createRiskManagement(sub, createRiskManagementDto);
    return new CreateAdminResponseDto({
      id: savedUser.id,
      email: savedUser.email,
      password: savedUser.password,
      role: savedUser.role,
      nickname: savedUser.nickname,
    });
  }

  @Post('/users/accountants')
  @RequirePermissions('admin', allOf(Permissions.CREATE_ACCOUNTANT))
  async createAccountantsUser(
    @UserContext() { sub }: JwtPayload,
    @Body() createAccountantDto: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    const savedUser = await this.adminService.createAccountant(sub, createAccountantDto);
    return new CreateAdminResponseDto({
      id: savedUser.id,
      email: savedUser.email,
      password: savedUser.password,
      role: savedUser.role,
      nickname: savedUser.nickname,
    });
  }

  @Post('/users/customer-support')
  @RequirePermissions('admin', allOf(Permissions.CREATE_CUSTOMER_SUPPORT))
  async createCustomerSupportUser(
    @UserContext() { sub }: JwtPayload,
    @Body() createCustomerSupportDto: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    const savedUser = await this.adminService.createCustomerSupport(sub, createCustomerSupportDto);
    return new CreateAdminResponseDto({
      id: savedUser.id,
      email: savedUser.email,
      password: savedUser.password,
      role: savedUser.role,
      nickname: savedUser.nickname,
    });
  }

  @Put('/users/change-password')
  @HttpCode(200)
  @RequirePermissions('admin', allOf(Permissions.EDIT_OWN_PASSWORD))
  async changePassword(
    @UserContext('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.passwordService.changePassword(userId, changePasswordDto);
  }

  @Put('2fa')
  @HttpCode(200)
  @RequirePermissions('admin', allOf(Permissions.READ_OWN_PROFILE))
  async updateTwoFactorAuthentication(
    @UserContext('sub') userId: string,
    @Body() update2fa: Update2FADto,
  ): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new BadRequestException(ErrorMessages.USER_NOT_FOUND);
    }

    if (!update2fa.code) {
      if (!user.email && update2fa.email) {
        const existingUser = await this.userService.findByEmail(update2fa.email);

        if (existingUser) {
          throw new BadRequestException(ErrorMessages.EMAIL_ALREADY_IN_USE);
        }

        return this.userService.sendTwoFactorAuthenticationCode(userId, update2fa.email);
      }

      return this.userService.sendTwoFactorAuthenticationCode(userId);
    }

    await this.userService.update2FA(userId, update2fa.enable, update2fa.code, update2fa.email);
  }

  @Patch('/users/master/limits')
  @RequirePermissions('admin', allOf(Permissions.EDIT_MASTER_MAXEXPOSUREPERVIP, Permissions.EDIT_MASTER_MAXNUMBERUSERS))
  async updateMasterLimits(@Body() updateMasterLimitsDto: UpdateMasterLimitsDto): Promise<MasterStatisticsAdminDto> {
    const master = await this.adminService.updateMasterLimits(updateMasterLimitsDto);
    return MasterStatisticsAdminDto.fromMasterStatistics(master);
  }

  @Patch('/users/vip/limits')
  @RequirePermissions('admin', allOf(Permissions.EDIT_VIP_MAXBET))
  async updateVipLimits(@Body() updateVipLimitsDto: UpdateVipLimitsDto): Promise<UserStatisticsAdminDto> {
    const vip = await this.adminService.updateVipLimits(updateVipLimitsDto);
    return UserStatisticsAdminDto.fromUserStatistics(vip);
  }

  @Patch('/users/vips/:id/preferences')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_VIP_PREFERENCES, Permissions.EDIT_OWN_VIP_PREFERENCES))
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateVipPreferences(
    @UserContext('sub') requesterId: string,
    @Param('id') userId: string,
    @Body() updateVipPreferencesDto: UpdateVipPreferencesDto,
  ): Promise<void> {
    await this.adminService.updateVipPreferences(requesterId, userId, updateVipPreferencesDto);
  }

  @Patch('/users/:id/withdrawals')
  @RequirePermissions('admin', allOf(Permissions.EDIT_USER_WITHDRAWAL_AVAILABILITY))
  async updateUserWithdrawalSettings(
    @Param('id') userId: string,
    @Body() updateData: UpdateUserWithdrawalSettingsDto,
  ): Promise<UserStatisticsAdminDto> {
    const vip = await this.adminService.updateWithdrawalSettings(userId, updateData);
    return UserStatisticsAdminDto.fromUserStatistics(vip);
  }

  @Patch('/users/:id/balance')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_BALANCE))
  async manualAdjustUserBalance(
    @UserContext('sub') adminId: string,
    @Param('id') userId: string,
    @Body() { amount }: ManualUpdateMasterBalanceDto,
  ): Promise<{ balance: number }> {
    const balance = await this.adminService.updateUserBalance(userId, adminId, amount);
    return { balance: decimalToNumber(balance) };
  }

  @Get('evenbet/users/:userId/transactions')
  @RequirePermissions('admin', anyOf(Permissions.READ_EVENBET_TRANSACTIONS))
  async listUserProgress(
    @Param('userId') targetUserId: string,
    @UserContext('sub') userId: string,
    @Query() paginationQuery: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<TransactionsDto>> {
    const data = await this.evenBetService.getAllInfo(paginationQuery, targetUserId, userId);
    return {
      data: data.data.map((transaction) =>
        TransactionsDto.from({
          ...transaction,
          amount: decimalToNumber(transaction.amount),
        }),
      ),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }

  @Post('poker-rake/upload')
  @RequirePermissions('admin', anyOf(Permissions.CREATE_POKER_RAKE))
  async uploadPokerRake(@Body() uploadPokerRakeDto: UploadPokerRakeDto): Promise<void> {
    return this.adminService.uploadPokerRake(uploadPokerRakeDto);
  }

  @Get('poker-rake/filter')
  @RequirePermissions('admin', anyOf(Permissions.READ_POKER_RAKE))
  @Filterable('poker-rake')
  async filterPokerRake(): Promise<
    PagePaginationResponse<{
      user_id: string;
      nickname: string;
      wallet: string;
      poker_player_id: string;
      totalRake: Decimal;
    }>
    > {
    const casinoPlayerId = $filters.text('casinoPlayerId', {
      display: 'Casino player ID',
      minLen: 9,
    });

    const nickname = $filters.text('nickname', {
      display: 'Casino player nickname',
      minLen: 1,
    });

    const wallet = $filters.text('wallet', {
      display: 'Casino player wallet',
      minLen: 1,
    });

    const pokerPlayerId = $filters.text('pokerPlayerId', {
      display: 'Poker player ID',
      minLen: 1,
    });

    const dateInterval = $filters
      .dateInterval('dateInterval')
      .or([new Date(DateTime.now().minus({ days: 30 }).toISO()), new Date(DateTime.now().toISO())]);

    return this.adminService.filterPokerRake({
      casinoPlayerId: casinoPlayerId.value,
      nickname: nickname.value,
      wallet: wallet.value,
      pokerPlayerId: pokerPlayerId.value,
      dateInterval,
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
    });
  }

  @SkipResponseFormatting()
  @RequirePermissions('admin', anyOf(Permissions.READ_EXPORT_USERS))
  @Get('export-users')
  async exportUsers(@Query() params: ExportUsersDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');

    const csvStream = await this.adminService.exportUsers(params);

    pipeline(csvStream, res, (err) => {
      if (err) {
        console.error('Pipeline failed:', err);
        res.status(500).send('Failed to export data');
      }
    });
  }

  @Post('snapshot-requests')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_PERMISSIONS))
  async setSnapshotRequests(@Body() { operation }: { operation: 'start' | 'stop' }): Promise<void> {
    RequestSnapshotInterceptor.setRecordSnapshot(operation === 'start');
  }

  @Get('snapshot-requests/:id')
  @SkipResponseFormatting()
  @RequirePermissions('admin', anyOf(Permissions.EDIT_PERMISSIONS))
  async getSnapshotRequests(
    @Param('id') snapshotId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const snapshot = await RequestSnapshotInterceptor.getSnapshotById(snapshotId);
    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }
    const buffer = Buffer.from(JSON.stringify(snapshot));
    const readStream = ReadStream.from(buffer);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename=${snapshotId}.json`,
      'Content-Length': `${buffer.byteLength}`,
    });
    return new StreamableFile(readStream);
  }

  @Get('success')
  @RequirePermissions('admin', anyOf())
  async getSuccess(@Headers() headers: any): Promise<{ headers: any; success: boolean }> {
    return {
      headers,
      success: true,
    };
  }
}
