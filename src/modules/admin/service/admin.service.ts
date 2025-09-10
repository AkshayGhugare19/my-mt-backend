import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Role, Roles } from '@modules/role/enum/role.enum';
import { PagePaginationResponse } from '@common/types';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CreateMasterResponseDto } from '@modules/admin/dtos/create-master-response.dto';
import { CreateMasterDto } from '@modules/admin/dtos/create-master.dto';
import { CreateVipDto } from '@modules/admin/dtos/create-vip.dto';
import { GetAllUsersFilteredQuery } from '@modules/admin/query/get-users-filter.query';
import {
  AdminUser,
  TransactionsReportItem,
  MasterUser,
  MasterUserWithStatistics,
  SuperMasterUser,
  UpdateUserWithdrawalSettings,
  UserWithStatistics,
  Wallets,
  UpdateVipPreferences,
} from '@modules/admin/types';
import { BalanceService } from '@modules/balance/service/balance.service';
import { TokenIssueService } from '@modules/token-issue/service/token-issue.service';
import { UserService } from '@modules/user/services/user.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { PermissionService } from '@modules/permission/service/permission.service';
import {
  Permission,
  Permissions,
} from '@modules/permission/enum/permission.enum';
import { MasterUserDetails } from '@modules/user/types';
import { CreateBaseAdminDto } from '@modules/admin/dtos/create-base-admin.dto';
import { CreateAdminResponseDto } from '@modules/admin/dtos/create-admin-response';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { UserBlacklistService } from '@modules/user/services/user-blacklist.service';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import {
  ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET,
  ETHEREUM_WITHDRAWAL_PUBLIC_KEY_SECRET,
  SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
  SOLANA_FEES_PUBLIC_KEY_SECRET,
  SOLANA_WITHDRAWAL_PUBLIC_KEY_SECRET,
  TRON_DEPOSIT_PUBLIC_KEY_SECRET,
  TRON_FEES_PUBLIC_KEY_SECRET,
  TRON_SETTLEMENT_PUBLIC_KEY_SECRET,
  TRON_WITHDRAW_PUBLIC_KEY_SECRET,
} from '@infrastructure/secrets/config';
import { runIfPermission } from '@modules/permission/utils/run-if-permission';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';
import { generateSimplePassword } from '@utils/generate-simple-password';
import {
  Blockchain,
  NotificationCodes,
} from '@infrastructure/database/prisma/constants';
import { Prisma } from '@prisma/client';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { UploadPokerRakeDto } from '../dtos/upload-rake.dto';
import { DateTime } from 'luxon';
import { RoleService } from '@modules/role/service/role.service';
import { ExportUsersDto } from '../dtos/export-users.dto';
import { format } from 'fast-csv';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private readonly userService: UserService,
    private readonly balanceService: BalanceService,
    private readonly tokenIssueService: TokenIssueService,
    private readonly prismaService: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly usersBlacklistService: UserBlacklistService,
    private readonly secretsService: SecretsService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
    private readonly roleService: RoleService,
  ) {}

  async createVip(
    masterId: string,
    createUserDto: CreateVipDto,
  ): Promise<{
    userId: string;
    email?: string;
    nickname?: string;
    balance: Decimal;
    password: string;
    role: Role;
    maxBetSize: Decimal;
    userBookieStake: number;
    isBonusEnabled: boolean;
  }> {
    await this.verifyCreateUserEmailAndNickname(createUserDto);

    const masterInfo = await this.userService.getMasterUserDetails(masterId);

    if (masterInfo === null) {
      throw new ForbiddenException(ErrorMessages.USER_NOT_FOUND);
    }

    if (
      masterInfo.maxNumberOfUsers !== null &&
      masterInfo._count.users >= masterInfo.maxNumberOfUsers
    ) {
      throw new ForbiddenException(ErrorMessages.MASTER_REACHED_MAX_USER_COUNT);
    }

    const bookieStake = this.getBookieStake(
      createUserDto.userBookieStake,
      masterInfo,
    );

    const password = generateSimplePassword();
    const savedVip = await this.prismaService.$transaction(
      async (transactionManager) => {
        const data = await this.userService.createVipUser(
          masterId,
          {
            email: createUserDto.email,
            nickname: createUserDto.nickname,
            password,
            maxBetSize: createUserDto.maxBetSize
              ? new Decimal(createUserDto.maxBetSize)
              : null,
            userBookieStake: bookieStake,
            isBonusEnabled: createUserDto.isBonusEnabled || false,
          },
          transactionManager,
        );
        if (createUserDto.balance) {
          await this.tokenIssueService.createMasterTokenIssue(
            {
              amount: createUserDto.balance,
              issuer: masterId,
              masterEmail: masterInfo.email!,
              masterNickname: masterInfo.nickname!,
              target: data.id,
              userEmail: data.email!,
              targetNickname: data.nickname!,
              prepaidPercent: createUserDto.prepaid,
            },
            transactionManager,
          );
        }
        return data;
      },
    );

    const balance = await this.balanceService.getBalance(savedVip.id);

    return {
      email: savedVip.email || undefined,
      password,
      balance: balance || new Decimal(0),
      nickname: savedVip.nickname || undefined,
      role: savedVip.roles.at(0)?.name as Role,
      userId: savedVip.id!,
      maxBetSize: savedVip.maxBetSize || null,
      userBookieStake: decimalToNumber(savedVip.userBookieStake),
      isBonusEnabled: savedVip.isBonusEnabled || false,
    };
  }

  private getBookieStake(
    userBookieStake: number,
    masterInfo: MasterUserDetails,
  ): number {
    if (
      !masterInfo.predefinedBookieStake &&
      !masterInfo.flexibleBookieStake &&
      userBookieStake
    ) {
      throw new BadRequestException(ErrorMessages.INVALID_BOOKIE_STAKE);
    }

    if (masterInfo.predefinedBookieStake) {
      return decimalToNumber(masterInfo.predefinedBookieStake);
    }
    if (
      masterInfo.flexibleBookieStake &&
      masterInfo.flexibleBookieStake.lt(userBookieStake)
    ) {
      throw new BadRequestException(ErrorMessages.INVALID_BOOKIE_STAKE);
    }
    return userBookieStake;
  }

  private async verifyCreateUserEmailAndNickname(createUserDto: {
    email?: string;
    nickname?: string;
  }): Promise<void> {
    if (createUserDto.email) {
      const findDuplicate = await this.userService.findByEmailOrNickname(
        createUserDto.email,
      );
      if (findDuplicate) {
        throw new BadRequestException(ErrorMessages.EMAIL_ALREADY_IN_USE);
      }
    }

    if (createUserDto.nickname) {
      const findDuplicate = await this.userService.findByEmailOrNickname(
        createUserDto.nickname,
      );
      if (findDuplicate) {
        throw new BadRequestException(ErrorMessages.NICKNAME_ALREADY_IN_USE);
      }
    }
  }

  async createMaster(
    masterId: string,
    createMasterDto: CreateMasterDto,
  ): Promise<CreateMasterResponseDto> {
    await this.verifyCreateUserEmailAndNickname(createMasterDto);

    const superMasterInfo = await this.userService.findById(masterId);

    if (superMasterInfo === null) {
      throw new ForbiddenException(ErrorMessages.USER_NOT_FOUND);
    }

    const password = generateSimplePassword();
    const savedMaster = await this.prismaService.$transaction(
      async (transactionManager) => {
        const savedMaster = await this.userService.createMasterUser(
          masterId,
          {
            email: createMasterDto.email,
            nickname: createMasterDto.nickname,
            maxExposurePerVip: createMasterDto.maxExposurePerVip,
            maxNumberOfUsers: createMasterDto.maxNumberOfUsers,
            password,
            prepaid: createMasterDto.prepaid,
            flexibleBookieStake: createMasterDto.flexibleBookieStake,
            predefinedBookieStake: createMasterDto.predefinedBookieStake,
          },
          transactionManager,
        );
        if (createMasterDto.balance) {
          await this.tokenIssueService.createSuperMasterTokenIssue(
            {
              createTokenIssue: {
                amount: createMasterDto.balance,
                prepaid: createMasterDto.prepaid,
                proof: createMasterDto.proof,
                paymentType: createMasterDto.paymentType,
              },
              issuer: masterId,
              masterEmail: superMasterInfo.email!,
              masterNickname: superMasterInfo.nickname!,
              target: savedMaster.id,
              userEmail: savedMaster.email!,
              targetNickname: savedMaster.nickname!,
            },
            transactionManager,
          );
        }
        return savedMaster;
      },
    );
    const masterBalance = await this.balanceService.getBalance(savedMaster.id);
    return {
      email: savedMaster.email!,
      password,
      role: savedMaster.roles.at(0)?.name as Role,
      nickname: savedMaster.nickname!,
      balance: decimalToNumber(masterBalance || new Decimal(0)),
      userId: savedMaster.id,
      maxExposurePerVip: decimalToNumber(savedMaster.maxExposurePerVip),
      maxNumberOfUsers: savedMaster.maxNumberOfUsers,
      flexibleBookieStake: decimalToNumber(savedMaster.flexibleBookieStake),
      predefinedBookieStake: decimalToNumber(savedMaster.predefinedBookieStake),
    };
  }

  async createRiskManagement(
    masterId: string,
    riskManagement: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    return this.createBaseAdmin(
      masterId,
      Roles.RISK_MANAGEMENT,
      riskManagement,
    );
  }

  async createMarketing(
    masterId: string,
    marketingUser: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    return this.createBaseAdmin(masterId, Roles.MARKETING, marketingUser);
  }

  async createPartner(
    masterId: string,
    partnerUser: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    return this.createBaseAdmin(masterId, Roles.PARTNER, partnerUser);
  }

  async createAccountant(
    masterId: string,
    riskManagement: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    return this.createBaseAdmin(masterId, Roles.ACCOUNTANT, riskManagement);
  }

  async createCustomerSupport(
    masterId: string,
    riskManagement: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    return this.createBaseAdmin(
      masterId,
      Roles.CUSTOMER_SUPPORT,
      riskManagement,
    );
  }

  async createBaseAdmin(
    masterId: string,
    role: Role,
    adminInfo: CreateBaseAdminDto,
  ): Promise<CreateAdminResponseDto> {
    await this.verifyCreateUserEmailAndNickname(adminInfo);

    const superMasterInfo = await this.userService.findById(masterId);

    if (superMasterInfo === null) {
      throw new ForbiddenException(ErrorMessages.USER_NOT_FOUND);
    }

    const password = generateSimplePassword();
    const savedUser = await this.userService.createBaseAdminUser(masterId, {
      email: adminInfo.email!,
      nickname: adminInfo.nickname!,
      password,
      role,
    });

    return {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.roles.at(0)?.name as Role,
      password,
      nickname: savedUser.nickname,
    };
  }

  async getMasterProfileInfo(userId: string): Promise<MasterUser> {
    const userDetails = await this.userService.getMasterUserDetails(userId);

    if (!userDetails) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const masterPnl = await this.balanceService.getMasterPnl(userDetails.id);
    const currentExposure = await this.tokenIssueService.getMastersExposure({
      masterId: userDetails.id,
    });

    return {
      ...userDetails,
      wallet: userDetails.wallet,
      managedUsers: userDetails._count.users,
      pnl: masterPnl,
      currentExposure,
    };
  }

  async getAdminProfileInfo(userId: string): Promise<AdminUser> {
    const details = await this.userService.getAdminDetails(userId);

    if (!details) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return {
      createdAt: details.createdAt,
      id: details.id!,
      email: details.email!,
      enable2FA: details.enable2FA,
      roles: details.roles,
      nickname: details.nickname!,
    };
  }

  async getSuperMasterProfileInfo(userId: string): Promise<SuperMasterUser> {
    const details = await this.userService.getAdminDetails(userId);

    if (!details) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return {
      createdAt: details.createdAt,
      id: details.id,
      email: details.email!,
      enable2FA: details.enable2FA,
      roles: details.roles,
      nickname: details.nickname!,
      balance: details.balance,
      managedUsers: details._count.users,
    };
  }

  async getAdminInfo(userId: string): Promise<MasterUser> {
    const userDetails = await this.userService.getMasterUserDetails(userId);

    if (!userDetails) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    let masterPnl;
    let masterCurrentExposure;
    if (userDetails.roles.some((role) => role.name === Roles.MASTER)) {
      masterPnl = await this.balanceService.getMasterPnl(userDetails.id);
      masterCurrentExposure = await this.tokenIssueService.getMastersExposure({
        masterId: userDetails.id,
      });
    }
    return {
      ...userDetails,
      managedUsers: userDetails._count.users,
      maxNumberOfUsers: userDetails.maxNumberOfUsers,
      roles: userDetails.roles,
      balance: userDetails.balance,
      debt: userDetails.debt,
      totalIssuedTo: userDetails.totalIssuedTo || new Decimal(0),
      totalSettled: userDetails.totalSettled || new Decimal(0),
      blockedAt: userDetails.blockedAt,
      pnl: masterPnl,
      currentExposure: masterCurrentExposure,
    };
  }

  async getAllUsers(
    masterId: string,
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    const permissions =
      await this.permissionService.getUserPermissions(masterId);

    if (
      permissions.some((permission) => permission === Permissions.READ_VIP_OWN)
    ) {
      return await this.getVipUsers(masterId, getAllFilters);
    }
    if (
      permissions.some((permission) => permission === Permissions.READ_ALL_USER)
    ) {
      return await this.getUsers(getAllFilters);
    }
    // Get the allowed roles for the user
    const allowedRoles = this.getAllowedRolesForFind(permissions);
    const rolesFilter =
      getAllFilters.roles && getAllFilters.roles.length
        ? allowedRoles.filter((role) => getAllFilters.roles.includes(role))
        : allowedRoles;

    return await this.getUsers({
      ...getAllFilters,
      roles: rolesFilter,
    });
  }

  private getAllowedRolesForFind(permissions: Permission[]): Role[] {
    const allowedRoles: Role[] = [];
    permissions.forEach((permission) => {
      switch (permission) {
        case Permissions.READ_MASTER:
          allowedRoles.push(Roles.MASTER);
          break;
        case Permissions.READ_VIP:
          allowedRoles.push(Roles.VIP_USER);
          break;
        case Permissions.READ_CUSTOMER_SUPPORT:
          allowedRoles.push(Roles.CUSTOMER_SUPPORT);
          break;
        case Permissions.READ_RISK_MANAGEMENT:
          allowedRoles.push(Roles.RISK_MANAGEMENT);
          break;
        case Permissions.READ_MARKETING:
          allowedRoles.push(Roles.MARKETING);
          break;
        case Permissions.READ_ACCOUNTANT:
          allowedRoles.push(Roles.ACCOUNTANT);
          break;
        case Permissions.READ_USER:
          allowedRoles.push(Roles.USER);
          break;
        default:
      }
    });
    return allowedRoles;
  }

  private getVipUsers(
    masterId: string,
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    return this.userService.getAllUsersFiltered(
      {
        masterId,
        OR: getAllFilters.username
          ? [
              {
                email: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                nickname: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                wallet: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                id: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                playerTag: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      getAllFilters.page,
      getAllFilters.limit,
    );
  }

  private getUsers(
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    return this.userService.getAllUsersFiltered(
      {
        userRoles: getAllFilters.roles
          ? {
              some: {
                role: {
                  name: {
                    in: getAllFilters.roles,
                  },
                },
              },
            }
          : undefined,
        OR: getAllFilters.username
          ? [
              {
                email: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                nickname: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                wallet: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                id: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                playerTag: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
        createdAt: {
          gte: getAllFilters.startRegisterDate,
          lte: getAllFilters.endRegisterDate,
        },
      },
      getAllFilters.page,
      getAllFilters.limit,
    );
  }

  async getAllVipUsers(
    masterId: string,
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    const permissions =
      await this.permissionService.getUserPermissions(masterId);
    if (permissions.some((permission) => permission === Permissions.READ_VIP)) {
      return await this.getAllVips(getAllFilters);
    }
    if (
      permissions.some((permission) => permission === Permissions.READ_VIP_OWN)
    ) {
      return await this.getAllVipsForMaster(masterId, getAllFilters);
    }
    throw new ForbiddenException();
  }

  private getAllVips(
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    return this.userService.getAllUsersFiltered(
      {
        userRoles: {
          some: {
            role: {
              name: Roles.VIP_USER,
            },
          },
        },
        OR: getAllFilters.username
          ? [
              {
                email: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                nickname: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                wallet: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                id: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                playerTag: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      getAllFilters.page,
      getAllFilters.limit,
    );
  }

  private getAllVipsForMaster(
    masterId: string,
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    return this.userService.getAllUsersFiltered(
      {
        masterId,
        userRoles: {
          some: {
            role: {
              name: Roles.VIP_USER,
            },
          },
        },
        OR: getAllFilters.username
          ? [
              {
                email: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                nickname: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                wallet: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                id: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                playerTag: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      getAllFilters.page,
      getAllFilters.limit,
    );
  }

  async getUserStatistics(
    userId: string,
    adminId: string,
  ): Promise<UserWithStatistics | null> {
    const permissions =
      await this.permissionService.getUserPermissions(adminId);

    if (
      permissions.some(
        (permission) => permission === Permissions.READ_USER_DETAILS,
      )
    ) {
      return await this.userService.findWithStatistics(userId);
    }

    if (
      permissions.some((permission) => permission === Permissions.READ_VIP_OWN)
    ) {
      return await this.userService.findWithStatistics(userId, adminId);
    }

    throw new ForbiddenException();
  }

  async updateMasterLimits(params: {
    masterId: string;
    maxExposurePerVip?: number;
    maxNumberOfUsers?: number;
  }): Promise<MasterUserWithStatistics> {
    const { masterId, maxExposurePerVip, maxNumberOfUsers } = params;
    const updatedUser = await this.userService.updateById(masterId, {
      maxExposurePerVip: maxExposurePerVip
        ? new Decimal(maxExposurePerVip)
        : undefined,
      maxNumberOfUsers,
    });

    const user = await this.getAdminInfo(updatedUser.id);

    return {
      createdAt: user.createdAt,
      _count: { users: user.managedUsers },
      balance: {
        balance: user.balance,
        userId: user.id,
        debt: user.debt || new Decimal(0),
        totalIssuedTo: user.totalIssuedTo,
      },
      blockedAt: user.blockedAt,
      email: user.email,
      id: user.id,
      nickname: user.nickname,
      masterId: user.masterId,
      wallet: user.wallet,
      maxExposurePerVip: user.maxExposurePerVip,
      maxNumberOfUsers: user.maxNumberOfUsers,
      roles: user.roles,
      flexibleBookieStake: user.flexibleBookieStake,
      predefinedBookieStake: user.predefinedBookieStake,
      currentExposure: user.currentExposure || null,
    };
  }

  async updateUserBalance(
    userId: string,
    masterId: string,
    amount: Decimal,
  ): Promise<Decimal> {
    await this.transactionLedgerService.updateUserBalance({
      amount,
      masterId,
      userId,
    });
    const master = await this.userService.findById(masterId);
    this.notificationsService.createNotification(
      userId,
      NotificationCodes.BALANCE_ADJUSTED,
      undefined,
      {
        amount: decimalToDollarsValue(amount),
        masterName: master?.nickname,
      },
    );
    return this.balanceService.getBalanceOrThrow(userId);
  }

  async editSettlementWallet(
    userId: string,
    wallet: string,
    twoFactorCode?: string,
  ): Promise<void> {
    if (!twoFactorCode) {
      throw new BadRequestException(
        ErrorMessages.INVALID_TWO_FACTOR_AUTHENTICATION_CODE,
      );
    }
    const verificationResult =
      await this.userService.verifyTwoFactorAuthentication(
        userId,
        twoFactorCode,
      );
    if (!verificationResult) {
      throw new BadRequestException(
        ErrorMessages.INVALID_TWO_FACTOR_AUTHENTICATION_CODE,
      );
    }

    await this.secretsService.setSecret(
      TRON_SETTLEMENT_PUBLIC_KEY_SECRET,
      wallet,
    );
  }

  async editOwnSettlementWallet(
    userId: string,
    wallet: string,
    twoFactorCode?: string,
  ): Promise<void> {
    const verificationResult =
      await this.userService.verifyTwoFactorAuthenticationIfEnabled(
        userId,
        twoFactorCode,
      );
    if (!verificationResult) {
      throw new BadRequestException(
        ErrorMessages.INVALID_TWO_FACTOR_AUTHENTICATION_CODE,
      );
    }

    await this.userService.updateSettlementWallet(userId, wallet);
  }

  async getWallets(userId: string): Promise<Wallets> {
    const permissions = await this.permissionService.getUserPermissions(userId);

    const walletPermissions = await this.getWalletPermissions(permissions);

    const [
      depositTronWallet,
      withdrawalTronWallet,
      feesTronWallet,
      depositSolanaWallet,
      withdrawalSolanaWallet,
      feesSolanaWallet,
      depositEthereumWallet,
      withdrawalEthereumWallet,
      settlementWallet,
      ownWallet,
    ] = await Promise.all([
      runIfPermission(
        walletPermissions.readDeposit,
        async () =>
          await this.secretsService.getSecret(TRON_DEPOSIT_PUBLIC_KEY_SECRET),
      ),
      runIfPermission(
        walletPermissions.readWithdrawal,
        async () =>
          await this.secretsService.getSecret(TRON_WITHDRAW_PUBLIC_KEY_SECRET),
      ),
      runIfPermission(
        walletPermissions.readWithdrawal,
        async () =>
          await this.secretsService.getSecret(TRON_FEES_PUBLIC_KEY_SECRET),
      ),
      runIfPermission(
        walletPermissions.readDeposit,
        async () =>
          await this.secretsService.getSecret(SOLANA_DEPOSIT_PUBLIC_KEY_SECRET),
      ),
      runIfPermission(
        walletPermissions.readWithdrawal,
        async () =>
          await this.secretsService.getSecret(
            SOLANA_WITHDRAWAL_PUBLIC_KEY_SECRET,
          ),
      ),
      runIfPermission(
        walletPermissions.readWithdrawal,
        async () =>
          await this.secretsService.getSecret(SOLANA_FEES_PUBLIC_KEY_SECRET),
      ),
      runIfPermission(
        walletPermissions.readDeposit,
        async () =>
          await this.secretsService.getSecret(
            ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET,
          ),
      ),
      runIfPermission(
        walletPermissions.readWithdrawal,
        async () =>
          await this.secretsService.getSecret(
            ETHEREUM_WITHDRAWAL_PUBLIC_KEY_SECRET,
          ),
      ),
      runIfPermission(
        walletPermissions.readSettlement,
        async () =>
          await this.secretsService.getSecret(
            TRON_SETTLEMENT_PUBLIC_KEY_SECRET,
          ),
      ),
      runIfPermission(walletPermissions.readOwn, async () => {
        const user = await this.userService.findById(userId);
        return user?.wallet || undefined;
      }),
    ]);

    return {
      depositTronPublicKey: depositTronWallet,
      withdrawTronPublicKey: withdrawalTronWallet,
      feesTronWalletPublicKey: feesTronWallet,
      depositSolanaPublicKey: depositSolanaWallet,
      withdrawSolanaPublicKey: withdrawalSolanaWallet,
      feesSolanaWalletPublicKey: feesSolanaWallet,
      depositEthereumPublicKey: depositEthereumWallet,
      withdrawEthereumPublicKey: withdrawalEthereumWallet,
      ownWallet,
      settlementPublicKey: settlementWallet,
    };
  }

  private async getWalletPermissions(permissions: Permission[]): Promise<{
    readDeposit: boolean;
    readWithdrawal: boolean;
    readSettlement: boolean;
    readOwn: boolean;
  }> {
    return {
      readDeposit: permissions.some(
        (permission) => permission === Permissions.READ_DEPOSIT_WALLET,
      ),
      readOwn: permissions.some(
        (permission) => permission === Permissions.READ_OWN_WALLET,
      ),
      readSettlement: permissions.some(
        (permission) => permission === Permissions.READ_SETTLEMENT_WALLET,
      ),
      readWithdrawal: permissions.some(
        (permission) => permission === Permissions.READ_WITHDRAWAL_WALLET,
      ),
    };
  }

  async getLiveUsers(
    masterId: string,
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    const permissions =
      await this.permissionService.getUserPermissions(masterId);

    if (
      !permissions.some(
        (permission) => permission === Permissions.READ_LIVE_USERS,
      )
    ) {
      throw new ForbiddenException();
    }

    if (
      permissions.some((permission) => permission === Permissions.READ_VIP_OWN)
    ) {
      return await this.getAllLiveUsersForMaster(masterId, getAllFilters);
    }

    return await this.getAllLiveUsers(getAllFilters);
  }

  async getAllLiveUsers(
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    const [users, [{ total }]] = await Promise.all([
      this.prismaService.$queryRaw<
        { id: string; volume_played: Decimal }[]
      >(Prisma.sql`
      WITH recent_bets AS (
        SELECT "user_id", SUM("bet_amount") AS "total_bet"
        FROM "bets"
        WHERE "created_at" >= NOW() - INTERVAL '1 day'
        GROUP BY "user_id"
      ),
      recent_transactions AS (
        SELECT "user_id", SUM("amount") AS "total_transaction"
        FROM "transactions_ledger"
        WHERE "created_at" >= NOW() - INTERVAL '1 day'
          AND "counter_party" IN (${TransactionCounterParties.EVENBET_POKER})
        GROUP BY "user_id"
      )
      SELECT U."id", 
        COALESCE(SUM(RB."total_bet"), 0) AS "volume_played",
        COALESCE(SUM(RB."total_bet"), 0) + COALESCE(SUM(RT."total_transaction"), 0) AS "total_amount"
      FROM "users" U
      LEFT JOIN "user_roles" UR ON U."id" = UR."user_id"
      LEFT JOIN "roles" R ON UR."role_id" = R."id"
      LEFT JOIN recent_bets RB ON U."id" = RB."user_id"
      LEFT JOIN recent_transactions RT ON U."id" = RT."user_id"
      WHERE R."name" IN (${Roles.USER}, ${Roles.VIP_USER})
      AND (RB."user_id" IS NOT NULL OR RT."user_id" IS NOT NULL)
      ${
        getAllFilters.username
          ? Prisma.sql`
          AND U."id" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."nickname" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."wallet" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."player_tag" ILIKE ${'%' + getAllFilters.username + '%'}`
          : Prisma.empty
      }
      GROUP BY U."id"
      ORDER BY total_amount DESC
      LIMIT ${getAllFilters.limit}
      OFFSET ${(getAllFilters.page - 1) * getAllFilters.limit}
    `),
      this.prismaService.$queryRaw<{ total: BigInt }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT U."id") AS "total"
      FROM "users" U
      LEFT JOIN "user_roles" UR ON U."id" = UR."user_id"
      LEFT JOIN "roles" R ON UR."role_id" = R."id"
      LEFT JOIN "bets" B ON U."id" = B."user_id" 
          AND B."created_at" >= NOW() - INTERVAL '1 day'
      LEFT JOIN "transactions_ledger" T ON U."id" = T."user_id" 
          AND T."created_at" >= NOW() - INTERVAL '1 day'
          AND T."counter_party" IN (${TransactionCounterParties.EVENBET_POKER})
      WHERE 
        R."name" IN (${Roles.USER}, ${Roles.VIP_USER})
        AND (B."user_id" IS NOT NULL OR T."user_id" IS NOT NULL)
        ${
          getAllFilters.username
            ? Prisma.sql`
          AND U."id" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."nickname" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."wallet" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."player_tag" ILIKE ${'%' + getAllFilters.username + '%'}`
            : Prisma.empty
        }
      `),
    ]);

    const { data } = await this.userService.getAllUsersFiltered(
      {
        id: {
          in: users.map((user) => user.id),
        },
      },
      1,
      users.length,
    );

    const usersMap = new Map(users.map((user) => [user.id, user]));

    data.forEach((user) => {
      const userStats = usersMap.get(user.id);

      if (!userStats || !user.balance) return;

      user.balance.volumePlayed = userStats.volume_played;
    });

    return {
      data,
      total: Number(total),
      limit: getAllFilters.limit,
      page: getAllFilters.page,
    };
  }

  private async getAllLiveUsersForMaster(
    masterId: string,
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    const [users, [{ total }]] = await Promise.all([
      this.prismaService.$queryRaw<
        { id: string; volume_played: Decimal }[]
      >(Prisma.sql`
      WITH recent_bets AS (
        SELECT "user_id", SUM("bet_amount") AS "total_bet"
        FROM "bets"
        WHERE "created_at" >= NOW() - INTERVAL '1 day'
        GROUP BY "user_id"
      ),
      recent_transactions AS (
        SELECT "user_id", SUM("amount") AS "total_transaction"
        FROM "transactions_ledger"
        WHERE "created_at" >= NOW() - INTERVAL '1 day'
          AND "counter_party" IN (${TransactionCounterParties.EVENBET_POKER})
        GROUP BY "user_id"
      )
      SELECT U."id", 
        COALESCE(SUM(RB."total_bet"), 0) AS "volume_played",
        COALESCE(SUM(RB."total_bet"), 0) + COALESCE(SUM(RT."total_transaction"), 0) AS "total_amount"
      FROM "users" U
      LEFT JOIN "user_roles" UR ON U."id" = UR."user_id"
      LEFT JOIN "roles" R ON UR."role_id" = R."id"
      LEFT JOIN recent_bets RB ON U."id" = RB."user_id"
      LEFT JOIN recent_transactions RT ON U."id" = RT."user_id"
      WHERE R."name" IN (${Roles.USER}, ${Roles.VIP_USER})
        AND (RB."user_id" IS NOT NULL OR RT."user_id" IS NOT NULL)
        AND U."master_id" = ${masterId}
        ${
          getAllFilters.username
            ? Prisma.sql`
          AND U."id" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."nickname" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."wallet" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."player_tag" ILIKE ${'%' + getAllFilters.username + '%'}`
            : Prisma.empty
        }
      GROUP BY U."id"
      ORDER BY total_amount DESC
      LIMIT ${getAllFilters.limit}
      OFFSET ${(getAllFilters.page - 1) * getAllFilters.limit}
    `),
      this.prismaService.$queryRaw<{ total: BigInt }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT U."id") AS "total"
      FROM "users" U
      LEFT JOIN "user_roles" UR ON U."id" = UR."user_id"
      LEFT JOIN "roles" R ON UR."role_id" = R."id"
      LEFT JOIN "bets" B ON U."id" = B."user_id" 
          AND B."created_at" >= NOW() - INTERVAL '1 day'
      LEFT JOIN "transactions_ledger" T ON U."id" = T."user_id" 
          AND T."created_at" >= NOW() - INTERVAL '1 day'
          AND T."counter_party" IN (${TransactionCounterParties.EVENBET_POKER})
      WHERE 
        R."name" IN (${Roles.USER}, ${Roles.VIP_USER})
        AND (B."user_id" IS NOT NULL OR T."user_id" IS NOT NULL)
        AND U."master_id" = ${masterId}
        ${
          getAllFilters.username
            ? Prisma.sql`
          AND U."id" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."nickname" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."wallet" ILIKE ${'%' + getAllFilters.username + '%'} 
          OR U."player_tag" ILIKE ${'%' + getAllFilters.username + '%'}`
            : Prisma.empty
        }
    `),
    ]);

    const { data } = await this.userService.getAllUsersFiltered(
      {
        id: {
          in: users.map((user) => user.id),
        },
      },
      1,
      users.length,
    );

    const usersMap = new Map(users.map((user) => [user.id, user]));

    data.forEach((user) => {
      const userStats = usersMap.get(user.id);

      if (!userStats || !user.balance) return;

      user.balance.volumePlayed = userStats.volume_played;
    });

    return {
      data,
      total: Number(total),
      limit: getAllFilters.limit,
      page: getAllFilters.page,
    };
  }

  async updateVipLimits(params: {
    vipId: string;
    maxBetSize?: number;
  }): Promise<UserWithStatistics> {
    const { vipId, maxBetSize } = params;
    const updatedUser = await this.userService.updateById(vipId, {
      maxBetSize: maxBetSize ? new Decimal(maxBetSize) : undefined,
    });

    const userWithStatistics = await this.userService.findWithStatistics(
      updatedUser.id,
    );

    if (userWithStatistics === null) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return userWithStatistics;
  }

  async updateVipPreferences(
    requesterId: string,
    vipId: string,
    params: UpdateVipPreferences,
  ): Promise<void> {
    const permissions =
      await this.permissionService.getUserPermissions(requesterId);

    // If the requester has the permission to edit their own vip preferences,
    // verify if the vip belongs to the requester or throw an error
    if (
      permissions.some(
        (permission) => permission === Permissions.EDIT_OWN_VIP_PREFERENCES,
      )
    ) {
      await this.checkIfUserBelongsToMasterOrThrow(vipId, requesterId);
    }

    // Check if the user has the VIP role
    const isVip = await this.roleService.getUserRoles(vipId);

    const hasVipRole = isVip.some((role) => role.name === Roles.VIP_USER);

    if (!hasVipRole) {
      throw new ForbiddenException();
    }

    this.verifyUpdateVipPreferencesPermissions(params, permissions);

    await this.userService.updateById(vipId, params);
  }

  /**
   * Verify if the requester has the permission to update the VIP preferences
   * @param params
   * @param permissions
   * @throws - ForbiddenException if the requester does not have the permission
   * @throws - BadRequestException if the property has no associated permission
   */
  private verifyUpdateVipPreferencesPermissions(
    params: UpdateVipPreferences,
    permissions: Permission[],
  ): void {
    const properties = Object.keys(params) as (keyof UpdateVipPreferences)[];
    const permissionMap: Record<keyof UpdateVipPreferences, Permission> = {
      isBonusEnabled: Permissions.EDIT_VIP_BONUS_PREFERENCES,
    };
    for (const property of properties) {
      const propertyPermission = permissionMap[property];

      // If the property has a permission, verify if the requester has it
      if (
        propertyPermission &&
        !permissions.some((permission) => permission === propertyPermission)
      ) {
        throw new ForbiddenException();
      }

      // If the property has no permission and the value is not undefined, throw an error
      // We should never update a property without permission
      if (!propertyPermission && params[property] !== undefined) {
        this.logger.error(
          {
            message: 'Invalid property without permission',
            property,
          },
          'updateVipPreferences',
        );
        throw new BadRequestException();
      }
    }
  }

  async updateWithdrawalSettings(
    userId: string,
    { canWithdraw }: UpdateUserWithdrawalSettings,
  ): Promise<UserWithStatistics> {
    const updatedData = await this.userService.updateById(userId, {
      canWithdraw,
    });
    if (!updatedData) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return await this.userService.findWithStatisticsOrThrow(updatedData.id);
  }

  async getUserDeposits(userId: string): Promise<TransactionsReportItem[]> {
    const depositTransactions =
      await this.transactionLedgerService.listDeposits(userId);

    return depositTransactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.createdAt,
      amount: decimalToNumber(transaction.amount),
      status: transaction.status,
      proof: '',
    }));
  }

  async getUserWithdrawals(userId: string): Promise<TransactionsReportItem[]> {
    const withdrawalTransactions =
      await this.transactionLedgerService.listWithdrawals(userId);

    return withdrawalTransactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.createdAt,
      amount: decimalToNumber(transaction.amount),
      status: transaction.status,
      proof: '',
    }));
  }

  /**
   * Check if the user belongs to the master and throw an error if it doesn't
   * @param userId
   * @param masterId
   * @throws - NotFoundException if the user does not belong to the master
   */
  async checkIfUserBelongsToMasterOrThrow(
    userId: string,
    masterId: string,
  ): Promise<void> {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        masterId,
      },
    });
    if (!user) {
      this.logger.error(
        {
          message: 'Mismatch userId and masterId',
          userId,
          masterId,
          stack: Error.captureStackTrace(new Error()),
        },
        'checkIfUserBelongsToMaster',
      );
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
  }

  async checkIfUserBelongsToMaster(
    userId: string,
    masterId: string,
  ): Promise<boolean> {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        masterId,
      },
    });
    return !!user;
  }

  async blockUser(
    masterId: string,
    userId: string,
  ): Promise<UserWithStatistics | undefined> {
    const permissions =
      await this.permissionService.getUserPermissions(masterId);
    const userToUpdate = await this.userService.findById(userId);

    if (
      permissions.some((permission) => permission === Permissions.BLOCK_USER)
    ) {
      const updatedUser = await this.userService.updateById(userId, {
        blockedAt: new Date(),
      });

      await Promise.all([
        this.usersBlacklistService.addToBlacklist(updatedUser.id),
        this.usersBlacklistService.addToBlacklist(updatedUser.playerTag),
      ]);

      await this.realtimeService.pushMessageToUser(updatedUser.id, {
        type: 'logout',
      });

      return await this.userService.findWithStatisticsOrThrow(updatedUser.id);
    }

    if (
      permissions.some((permission) => permission === Permissions.BLOCK_VIP_OWN)
    ) {
      if (userToUpdate?.masterId !== masterId) {
        throw new ForbiddenException(ErrorMessages.USER_NOT_FOUND);
      }

      const updatedUser = await this.userService.updateById(userId, {
        blockedAt: new Date(),
      });

      await Promise.all([
        this.usersBlacklistService.addToBlacklist(updatedUser.id),
        this.usersBlacklistService.addToBlacklist(updatedUser.playerTag),
      ]);

      await this.realtimeService.pushMessageToUser(updatedUser.id, {
        type: 'logout',
      });

      return await this.userService.findWithStatisticsOrThrow(updatedUser.id);
    }
  }

  async unblockUser(
    masterId: string,
    userId: string,
  ): Promise<UserWithStatistics | undefined> {
    const permissions =
      await this.permissionService.getUserPermissions(masterId);
    const userToUpdate = await this.userService.findById(userId);

    if (
      permissions.some((permission) => permission === Permissions.BLOCK_USER)
    ) {
      const updatedUser = await this.userService.updateById(userId, {
        blockedAt: null,
      });

      await Promise.all([
        this.usersBlacklistService.removeFromBlacklist(updatedUser.id),
        this.usersBlacklistService.removeFromBlacklist(updatedUser.playerTag),
      ]);

      return await this.userService.findWithStatisticsOrThrow(updatedUser.id);
    }

    if (
      permissions.some((permission) => permission === Permissions.BLOCK_VIP_OWN)
    ) {
      if (userToUpdate?.masterId !== masterId) {
        throw new ForbiddenException(ErrorMessages.USER_NOT_FOUND);
      }

      const updatedUser = await this.userService.updateById(userId, {
        blockedAt: null,
      });

      await Promise.all([
        this.usersBlacklistService.removeFromBlacklist(updatedUser.id),
        this.usersBlacklistService.removeFromBlacklist(updatedUser.playerTag),
      ]);

      return await this.userService.findWithStatisticsOrThrow(updatedUser.id);
    }
  }

  private async getAllBlockedUsers(
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    return this.userService.getAllUsersFiltered(
      {
        blockedAt: {
          not: null,
        },
        OR: getAllFilters.username
          ? [
              {
                email: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                nickname: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                wallet: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                id: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                playerTag: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      getAllFilters.page,
      getAllFilters.limit,
    );
  }

  private async getAllBlockedVipsForMaster(
    masterId: string,
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    return this.userService.getAllUsersFiltered(
      {
        masterId,
        userRoles: {
          some: {
            role: {
              name: Roles.VIP_USER,
            },
          },
        },
        OR: getAllFilters.username
          ? [
              {
                email: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                nickname: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                wallet: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                id: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
              {
                playerTag: {
                  contains: getAllFilters.username,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
        AND: {
          blockedAt: {
            not: null,
          },
        },
      },
      getAllFilters.page,
      getAllFilters.limit,
    );
  }

  async getBlockedUsers(
    masterId: string,
    getAllFilters: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    const permissions =
      await this.permissionService.getUserPermissions(masterId);
    if (
      !permissions.some(
        (permission) =>
          permission === Permissions.READ_BLOCKED_USERS ||
          permission === Permissions.READ_BLOCKED_VIP_OWN,
      )
    ) {
      throw new ForbiddenException();
    }

    if (
      permissions.some(
        (permission) => permission === Permissions.READ_BLOCKED_VIP_OWN,
      )
    ) {
      return await this.getAllBlockedVipsForMaster(masterId, getAllFilters);
    }

    return await this.getAllBlockedUsers(getAllFilters);
  }

  async uploadPokerRake(uploadPokerRakeDto: UploadPokerRakeDto): Promise<void> {
    const foundUsers = await this.prismaService.user.findMany({
      where: {
        id: {
          in: uploadPokerRakeDto.data.map((entry) => entry.userId),
        },
      },
      select: {
        id: true,
      },
    });

    const foundUserIds = new Set(foundUsers.map((user) => user.id));

    const filteredRakeData = uploadPokerRakeDto.data.filter((entry) =>
      foundUserIds.has(entry.userId),
    );

    const today = DateTime.now().toISO();

    try {
      await this.prismaService.pokerRake.createMany({
        data: filteredRakeData.map((entry) => {
          return {
            userId: entry.userId,
            pokerPlayerId: entry.pokerPlayerId,
            rake: entry.rake,
            uploadDate: today,
          };
        }),
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException();
    }
  }

  async filterPokerRake(filter: {
    casinoPlayerId?: string;
    nickname?: string;
    wallet?: string;
    pokerPlayerId?: string;
    dateInterval: [Date, Date];
    page: number;
    limit: number;
  }): Promise<{
    data: {
      user_id: string;
      nickname: string;
      wallet: string;
      poker_player_id: string;
      totalRake: Decimal;
    }[];
    total: number;
    limit: number;
    page: number;
  }> {
    const [filterResult, countResult] = await Promise.all([
      this.prismaService.$queryRaw<
        {
          user_id: string;
          nickname: string;
          wallet: string;
          poker_player_id: string;
          totalRake: Decimal;
        }[]
      >(Prisma.sql`
        SELECT 
          u.id AS user_id,
          u.nickname,
          u.wallet,
          pr.poker_player_id,
          SUM(pr.rake) AS total_rake
        FROM 
            users u
        JOIN 
            poker_rakes pr ON u.id = pr.user_id
        WHERE 
            pr."upload_date" >= ${filter.dateInterval[0]} AND pr."upload_date" <= ${filter.dateInterval[1]}
            ${filter.casinoPlayerId ? Prisma.sql`AND u."id" ILIKE ${'%' + filter.casinoPlayerId + '%'}` : Prisma.empty}
            ${filter.nickname ? Prisma.sql`AND u."nickname" ILIKE ${'%' + filter.nickname + '%'}` : Prisma.empty}
            ${filter.wallet ? Prisma.sql`AND u."wallet" ILIKE ${'%' + filter.wallet + '%'}` : Prisma.empty}
            ${filter.pokerPlayerId ? Prisma.sql`AND pr."poker_player_id" ILIKE ${'%' + filter.pokerPlayerId + '%'}` : Prisma.empty}
        GROUP BY 
            u.id, u.nickname, u.wallet, pr.poker_player_id
        LIMIT ${filter.limit}
        OFFSET ${(filter.page - 1) * filter.limit}
      `),
      this.prismaService.$queryRaw<{ count: BigInt }[] | undefined>(Prisma.sql`
        SELECT COUNT(DISTINCT u."id")
        FROM 
            users u
        JOIN 
            poker_rakes pr ON u.id = pr.user_id
        WHERE 
            pr."upload_date" >= ${filter.dateInterval[0]} AND pr."upload_date" <= ${filter.dateInterval[1]}
            ${filter.casinoPlayerId ? Prisma.sql`AND u."id" ILIKE ${'%' + filter.casinoPlayerId + '%'}` : Prisma.empty}
            ${filter.nickname ? Prisma.sql`AND u."nickname" ILIKE ${'%' + filter.nickname + '%'}` : Prisma.empty}
            ${filter.wallet ? Prisma.sql`AND u."wallet" ILIKE ${'%' + filter.wallet + '%'}` : Prisma.empty}
            ${filter.pokerPlayerId ? Prisma.sql`AND pr."poker_player_id" ILIKE ${'%' + filter.pokerPlayerId + '%'}` : Prisma.empty}
        GROUP BY 
            u.id
      `),
    ]);

    return {
      data: filterResult,
      total: Number(countResult?.[0]?.count || 0),
      limit: filter.limit,
      page: filter.page,
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async exportUsers(params: ExportUsersDto) {
    const csvStream = format({ headers: true });

    let cursor: { id: string } | undefined;
    const batchSize = 1000;

    try {
      do {
        const users = await this.prismaService.user.findMany({
          where: {
            userRoles: {
              some: {
                role: {
                  name: {
                    in: [Roles.USER],
                  },
                },
              },
            },
            OR: params.username
              ? [
                  {
                    email: {
                      contains: params.username,
                      mode: 'insensitive',
                    },
                  },
                  {
                    nickname: {
                      contains: params.username,
                      mode: 'insensitive',
                    },
                  },
                  {
                    wallet: {
                      contains: params.username,
                      mode: 'insensitive',
                    },
                  },
                  {
                    id: {
                      contains: params.username,
                      mode: 'insensitive',
                    },
                  },
                  {
                    playerTag: {
                      contains: params.username,
                      mode: 'insensitive',
                    },
                  },
                ]
              : undefined,
            createdAt: {
              gte: params.startRegisterDate,
              lte: params.endRegisterDate,
            },
          },
          select: {
            id: true,
            email: true,
            wallet: true,
            nickname: true,
            playerTag: true,
            blockchain: true,
            createdAt: true,
            Web3AuthAccount: {
              select: {
                email: true,
                type: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
          take: batchSize,
          ...(cursor && { cursor, skip: 1 }),
        });

        users.forEach((user) => {
          csvStream.write({
            Id: user.id,
            Email: user.email || user.Web3AuthAccount?.[0]?.email,
            Wallet: user.wallet,
            Nickname: user.nickname,
            'Player tag': user.playerTag,
            Blockchain: Object.keys(Blockchain).find(
              (key: keyof typeof Blockchain) =>
                Blockchain[key] === user.blockchain,
            ),
            'Account type': user.Web3AuthAccount?.[0]?.type,
            'Sign-up date': user.createdAt,
          });
        });

        cursor =
          users.length > 0 ? { id: users[users.length - 1].id } : undefined;
      } while (cursor);

      csvStream.end();
    } catch (error) {
      csvStream.destroy(error);
    }

    return csvStream;
  }
}
