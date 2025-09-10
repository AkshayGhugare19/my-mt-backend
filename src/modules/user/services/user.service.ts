import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Role, Roles } from '@modules/role/enum/role.enum';
import { encryptPassword } from '@common/helper/encoding/password';
import { PagePaginationResponse, Wrapper } from '@common/types';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { CreateMasterDto } from '@modules/admin/dtos/create-master.dto';
import { GetAllUsersFilteredQuery } from '@modules/admin/query/get-users-filter.query';
import {
  AdminUser,
  MasterUserWithStatistics,
  UserWithStatistics,
} from '@modules/admin/types';
import { BalanceService } from '@modules/balance/service/balance.service';
import {
  CreateCredentialsUser,
  CreateUser,
  CreateVipUser,
  CreateWalletUser,
  MasterUserDetails,
  UserInfo,
  UserWithBalance,
  userWithStatisticsSchema,
} from '@modules/user/types';
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, Role as PrismaRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { generateRandomId } from '@utils/generate-random-tag';
import { RoleService } from '@modules/role/service/role.service';
import {
  GamesService,
} from '@modules/games/service/games.service';
import { UserCodeService } from './user-code.service';
import { CodeTypes } from '../enum/code-type.enum';
import { MailingProducer } from '@infrastructure/mail/mailing.producer';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { hmacSha512Inb64Url } from '@utils/hmac-sha512-in-b64-url';
import { BonusBalanceService } from '@modules/bonus/service/bonus-balance.service';
import { DateTime } from 'luxon';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNamespace } from '@infrastructure/event/namespace';
import { UserActivationEvent } from '@infrastructure/event/classes';
import { REDIS_KEY__REDEEMABLE_PROMO_CODES } from '@infrastructure/redis/keys';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { GamanzaEngageService } from '@external/gamanza-engage/service/gamanza-engage.service';
import { gameTypeToString } from '@modules/games/utils';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => BalanceService))
    private readonly balanceService: Wrapper<BalanceService>,
    private readonly roleService: RoleService,
    private readonly gamesService: GamesService,
    private readonly userCodeService: UserCodeService,
    private readonly mailProducer: MailingProducer,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => GamanzaEngageService))
    private readonly gamanzaEngageService: Wrapper<GamanzaEngageService>,
    @Inject(forwardRef(() => BonusBalanceService))
    private readonly bonusBalanceService: Wrapper<BonusBalanceService>,
    private readonly eventEmitter: EventEmitter2,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createCredentialsSocialUser(profile: {
    email?: string;
    provider: string;
    providerUserId: string;
    picture: string;
    name: string
  }) {
    return this.prismaService.$transaction(async (tx) => {
      // 1. Generate player tag
      const playerTag = await this.generatePlayerTag(tx);

      // 2. Get default USER role
      const userRole = await this.roleService.getRoleByNameOrThrow(
        Roles.USER,
        tx,
      );

      let user = await tx.user.create({
        data: {
          email: profile.email ?? null,
          password: null,
          playerTag,
          provider: profile.provider,
          socialProviderId: profile.providerUserId,
          nickname: profile.name,
          avatar: profile.picture ?? null,
          userRoles: {
            create: {
              role: {
                connect: { id: userRole.id },
              },
            },
          },
        },
        include: {
          userRoles: { include: { role: true } },
        },
      });
      await this.balanceService.create(
        user.id,
        tx,
      );
      return user;
    });
  }
  async getAdminDetails(userId: string): Promise<
    | (Pick<
        User,
        'id' | 'email' | 'createdAt' | 'nickname' | 'enable2FA' | 'wallet'
      > & {
        balance: Decimal;
        roles: PrismaRole[];
        _count: { users: number };
      })
    | null
  > {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        createdAt: true,
        enable2FA: true,
        wallet: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const balance = await this.balanceService.getBalance(user.id);

    return {
      ...user,
      roles: user.userRoles.map((role) => role.role),
      balance: balance || new Decimal(0),
    };
  }

  async getUserBookieStakeOrThrow(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<
    Pick<
      User,
      'userBookieStake' | 'flexibleBookieStake' | 'predefinedBookieStake'
    >
  > {
    const client = this.getClient(transactionManager);
    const user = await client.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        userBookieStake: true,
        flexibleBookieStake: true,
        predefinedBookieStake: true,
      },
    });

    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  async getMasterUserDetails(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<MasterUserDetails | null> {
    const client = this.getClient(transactionManager);
    const user = await client.user.findUnique({
      where: {
        id: userId,
        userRoles: {
          some: {
            role: {
              name: Roles.MASTER,
            },
          },
        },
      },
      select: {
        createdAt: true,
        id: true,
        email: true,
        wallet: true,
        nickname: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        masterId: true,
        _count: {
          select: {
            users: true,
          },
        },
        enable2FA: true,
        resetPasswordRequired: true,
        maxExposurePerVip: true,
        maxNumberOfUsers: true,
        flexibleBookieStake: true,
        predefinedBookieStake: true,
        blockedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const balance = await this.balanceService.getBalanceAnd(user.id, {
      totalIssuedTo: true,
      totalSettled: true,
      debt: true,
    });

    return {
      ...user,
      debt: balance?.debt || new Decimal(0),
      roles: user.userRoles.map((userRole) => userRole.role),
      balance: balance?.balance || new Decimal(0),
      totalIssuedTo: balance?.totalIssuedTo || new Decimal(0),
      totalSettled: balance?.totalSettled || new Decimal(0),
    };
  }

  async findForMasterLogin(
    emailOrNickname: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    id: string;
    email: string | null;
    nickname: string | null;
    password: string;
    enable2FA: boolean;
  } | null> {
    const adminRoleIds = await this.roleService.getAdminRoleIds();
    const user = await this.getClient(transactionManager).user.findFirst({
      where: {
        OR: [{ email: emailOrNickname }, { nickname: emailOrNickname }],
        blockedAt: null,
        deletedAt: null,
        userRoles: {
          every: {
            roleId: {
              in: adminRoleIds,
            },
          },
        },
        password: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        password: true,
        enable2FA: true,
      },
    });

    if (!user || !user.password) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      password: user.password,
      enable2FA: user.enable2FA,
    };
  }

  /**
   * !!Used only in User email login
   * @param email
   * @param transactionManager
   */
  async findForEmailLogin(
    emailOrNickname: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    id: string;
    email?: string;
    nickname?: string;
    password: string;
    active: boolean;
    enable2FA: boolean;
  } | null> {
    const user = await this.getClient(transactionManager).user.findFirst({
      where: {
        OR: [
          {
            email: emailOrNickname,
          },
          {
            nickname: emailOrNickname,
          },
        ],
        blockedAt: null,
        deletedAt: null,
        userRoles: {
          some: {
            role: {
              name: {
                in: [Roles.USER, Roles.VIP_USER],
              },
            },
          },
        },
        password: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        password: true,
        active: true,
        enable2FA: true,
      },
    });

    if (!user || !user.password || (!user.email && !user.nickname)) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || undefined,
      nickname: user.nickname || undefined,
      password: user.password,
      active: user.active,
      enable2FA: user.enable2FA,
    };
  }

  async findByEmailOrNickname(identifier: string): Promise<User | null> {
    return this.prismaService.user.findFirst({
      where: {
        OR: [
          {
            email: identifier,
          },
          {
            nickname: identifier,
          },
        ],
      },
    });
  }

  /**
   * Find a user by their username (either playerTag or nickname)
   * @param username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prismaService.user.findFirst({
      where: {
        OR: [
          {
            playerTag: username,
          },
          {
            nickname: username,
          },
        ],
      },
    });
  }

  async findById(
    id: string,
    withDeleted = false,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserInfo | null> {
    const user = await this.getClient(transactionManager).user.findUnique({
      where: {
        id,
        blockedAt: withDeleted ? undefined : null,
        deletedAt: withDeleted ? undefined : null,
      },
      select: {
        id: true,
        email: true,
        wallet: true,
        masterId: true,
        enable2FA: true,
        nickname: true,
        resetPasswordRequired: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        playerTag: true,
        createdAt: true,
        partnerMatrixId: true,
        partnerMatrixBtag: true,
        level: true,
        rank: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      roles: user.userRoles.map((userRole) => userRole.role),
    };
  }

  async getUserBookieStake(userId: string): Promise<Decimal | null> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        userBookieStake: true,
      },
    });

    if (!user) {
      return null;
    }

    return user.userBookieStake;
  }

  async findByIdOrThrow(
    id: string,
    withDeleted = false,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserInfo | null> {
    const user = await this.findById(id, withDeleted, transactionManager);

    if (!user) {
      this.logger.error({
        message: ErrorMessages.USER_NOT_FOUND,
      });
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return user;
  }

  async findByWallet(
    wallet: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Pick<User, 'id' | 'wallet' | 'blockchain' | 'countryCode'> | null> {
    const user = await this.getClient(transactionManager).user.findUnique({
      where: {
        wallet,
        deletedAt: null,
        blockedAt: null,
      },
      select: {
        id: true,
        wallet: true,
        blockchain: true,
        countryCode: true,
      },
    });

    if (!user || !user.wallet) {
      return null;
    }

    return {
      id: user.id,
      wallet: user.wallet,
      blockchain: user.blockchain,
      countryCode: user.countryCode,
    };
  }

  async findByWallets(
    wallets: { address: string; blockchain: number }[],
    transactionManager?: PrismaTransactionManager,
  ): Promise<Pick<User, 'id' | 'wallet' | 'blockchain'> | null> {
    const user = await this.getClient(transactionManager).user.findFirst({
      where: {
        OR: wallets.map((wallet) => ({
          wallet: wallet.address,
          blockchain: wallet.blockchain,
          deletedAt: null,
          blockedAt: null,
        })),
      },
      select: {
        id: true,
        wallet: true,
        blockchain: true,
      },
    });

    if (!user || !user.wallet) {
      return null;
    }

    return {
      id: user.id,
      wallet: user.wallet,
      blockchain: user.blockchain,
    };
  }

  async findWithStatisticsOrThrow(userId: string): Promise<UserWithStatistics> {
    return this.findWithStatistics(userId).then((user) => {
      if (!user) {
        throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
      }
      return user;
    });
  }

  async findWithStatistics(
    userId: string,
    masterId?: string,
  ): Promise<UserWithStatistics | null> {
    const user = await this.prismaService.user.findUnique({
      where: {
        masterId,
        id: userId,
        userRoles: {
          some: {
            role: {
              name: {
                notIn: [Roles.SUPER_MASTER],
              },
            },
          },
        },
      },
      ...userWithStatisticsSchema,
    });

    if (!user) {
      return null;
    }

    const [favoriteGameIds, favoriteCategoryType] = await Promise.all([
      this.gamesService.getFavoriteGamesIds(userId),
      this.gamesService.getFavoriteGameCategory(userId),
    ]);

    const favoriteCategory = gameTypeToString(favoriteCategoryType);
    const favoriteGameData = await this.prismaService.slotegratorGame.findMany({
      where: {
        uuid: {
          in: favoriteGameIds,
        },
      },
      select: {
        uuid: true,
        name: true,
      },
    });

    const favoriteGames: typeof favoriteGameData = [];
    for (const gameId of favoriteGameIds) {
      const game = favoriteGameData.find((game) => game.uuid === gameId);
      if (game) {
        favoriteGames.push(game);
      }
    }

    const bonusBalance =
      await this.bonusBalanceService.getUserBonusBalanceById(userId);

    return {
      ...user,
      roles: user.userRoles.map((userRole) => userRole.role),
      favoriteCategory,
      favoriteGames: favoriteGames.map((game) => ({
        id: game.uuid,
        name: game.name,
      })),
      bonusBalance,
      web3AuthEmail: user.Web3AuthAccount?.[0]?.email,
    };
  }

  async findByEmail(
    email: string,
  ): Promise<(User & { roles: PrismaRole[] }) | null> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    if (!user) {
      return null;
    }
    return {
      ...user,
      roles: user.userRoles.map((userRole) => userRole.role),
    };
  }

  async findPartialById(
    id: string,
    select: Prisma.UserSelect,
  ): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: {
        id,
      },
      select,
    });
  }

  async findByIdFull(id: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
  }

  async getUserInfoByPlayerTag(
    playerTag: string,
  ): Promise<UserWithBalance | null> {
    return this.getUserWhere({ playerTag });
  }

  async getUserDataByPlayerTag(playerTag: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: {
        playerTag,
      },
    });
  }

  async getAllUsersFiltered(
    filters: Prisma.UserWhereInput,
    page: number,
    limit: number,
  ): Promise<PagePaginationResponse<UserWithStatistics>> {
    const count = await this.prismaService.user.count({
      where: filters,
    });
    const users = await this.prismaService.user.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: filters,
      orderBy: {
        createdAt: 'desc',
      },
      ...userWithStatisticsSchema,
    });
    return {
      data: users.map((user) => ({
        ...user,
        roles: user.userRoles.map((userRole) => userRole.role),
        favoriteCategory: '',
        favoriteGames: [],
        web3AuthEmail: user.Web3AuthAccount?.[0]?.email,
      })),
      limit,
      page,
      total: count,
    };
  }

  async filterMasterUsers(
    getAllMastersFilteredQuery: GetAllUsersFilteredQuery,
  ): Promise<PagePaginationResponse<MasterUserWithStatistics>> {
    return this.getAllMastersFiltered(
      {
        userRoles: {
          some: {
            role: {
              name: Roles.MASTER,
            },
          },
        },
        OR: getAllMastersFilteredQuery.username
          ? [
              {
                email: {
                  contains: getAllMastersFilteredQuery.username,
                  mode: 'insensitive',
                },
              },
              {
                nickname: {
                  contains: getAllMastersFilteredQuery.username,
                  mode: 'insensitive',
                },
              },
              {
                wallet: {
                  contains: getAllMastersFilteredQuery.username,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      getAllMastersFilteredQuery.page,
      getAllMastersFilteredQuery.limit,
    );
  }

  async getAllMastersFiltered(
    filters: Prisma.UserWhereInput,
    page: number,
    limit: number,
  ): Promise<PagePaginationResponse<MasterUserWithStatistics>> {
    const count = await this.prismaService.user.count({
      where: filters,
    });

    const users = await this.prismaService.user.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: filters,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
        id: true,
        email: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        wallet: true,
        nickname: true,
        masterId: true,
        maxNumberOfUsers: true,
        maxExposurePerVip: true,
        flexibleBookieStake: true,
        predefinedBookieStake: true,
        blockedAt: true,
        _count: {
          select: {
            users: true,
          },
        },
        balance: {
          select: {
            balance: true,
            debt: true,
            totalIssuedTo: true,
            totalSettled: true,
            userId: true,
          },
        },
      },
    });

    return {
      data: users.map((user) => ({
        ...user,
        roles: user.userRoles.map((userRole) => userRole.role),
      })),
      limit,
      page,
      total: count,
    };
  }

  /**
   * THIS includes the bonus balance
   * @param playerTag
   * @returns
   */
  async getBalanceByPlayerTag(playerTag: string): Promise<Decimal | undefined> {
    const user = await this.prismaService.user.findUnique({
      where: {
        playerTag,
      },
      select: {
        id: true,
      },
    });
    if (!user) {
      return undefined;
    }
    const balance = this.configService.get(ENV.DISABLE_BONUS_SYSTEM)
      ? await this.balanceService.getBalance(user.id)
      : await this.balanceService.getBalanceAndBonusBalance(user.id);
    if (!balance) {
      return undefined;
    }
    return balance;
  }

  async getUserInfo(id: string): Promise<UserWithBalance | null> {
    const user = await this.getUserWhere({ id }, true);
    if (!user) {
      return null;
    }

    const lockedBalance = await this.balanceService.getLockedBalance(id);
    return {
      ...user,
      nonPlayableBalance: lockedBalance,
    };
  }

  async isBonusDisabled(userId: string): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        isBonusEnabled: true,
      },
    });
    if (!user) {
      return false;
    }

    // if the user isBonusEnabled is false, then the bonus is disabled
    return user.isBonusEnabled === false;
  }

  private async getUserWhere(
    whereStatement: Prisma.UserWhereUniqueInput,
    includePassword: boolean = false,
  ): Promise<UserWithBalance | null> {
    const user = await this.prismaService.user.findUnique({
      where: whereStatement,
      select: {
        createdAt: true,
        id: true,
        email: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
        wallet: true,
        blockchain: true,
        password: includePassword,
        avatar: true,
        masterId: true,
        nickname: true,
        canWithdraw: true,
        resetPasswordRequired: true,
        maxBetSize: true,
        playerTag: true,
        blockedAt: true,
        countryCode: true,
        active: true,
        enable2FA: true,
        isBonusEnabled: true,
        balance: {
          select: {
            balance: true,
            debt: true,
            biggestLoss: true,
            biggestWin: true,
            totalDeposit: true,
            totalSettled: true,
            totalIssuedTo: true,
            totalLoss: true,
            totalWithdraw: true,
            totalWin: true,
            volumePlayed: true,
          },
        },
        partnerMatrixId: true,
        partnerMatrixBtag: true,
        level: true,
        rank: true,
        signUpEventSent: true,
        userPreference: true,
      },
    });

    if (!user) {
      return null;
    }

    const [favoriteGameIds, favoriteCategoryType] = await Promise.all([
      this.gamesService.getFavoriteGamesIds(user.id),
      this.gamesService.getFavoriteGameCategory(user.id),
    ]);

    const favoriteCategory = gameTypeToString(favoriteCategoryType);
    const favoriteGameData = await this.prismaService.slotegratorGame.findMany({
      where: {
        uuid: {
          in: favoriteGameIds,
        },
      },
      select: {
        uuid: true,
        name: true,
      },
    });

    const favoriteGames: typeof favoriteGameData = [];
    for (const gameId of favoriteGameIds) {
      const game = favoriteGameData.find((game) => game.uuid === gameId);
      if (game) {
        favoriteGames.push(game);
      }
    }

    const masterNickname = user.masterId
      ? await this.getMasterNickname(user.masterId)
      : null;

    const totalRake = await this.prismaService.pokerRake.aggregate({
      _sum: {
        rake: true,
      },
      where: {
        userId: user.id,
        uploadDate: {
          gte: DateTime.now()
            .startOf('week')
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toISO(),
          lte: DateTime.now().toISO(),
        },
      },
    });

    return {
      createdAt: user.createdAt,
      id: user.id,
      active: user.active,
      email: user.email,
      roles: user.userRoles.map((userRole) => userRole.role),
      wallet: user.wallet,
      hasPassword: !!user.password,
      blockchain: user.blockchain,
      maxBetSize: user.maxBetSize,
      canWithdraw: user.canWithdraw,
      resetPasswordRequired: user.resetPasswordRequired,
      masterId: user.masterId,
      master: masterNickname ? { nickname: masterNickname } : null,
      playerTag: user.playerTag,
      avatar: user.avatar,
      balance: user.balance!,
      nickname: user.nickname,
      countryCode: user.countryCode,
      favoriteCategory,
      enable2FA: user.enable2FA,
      favoriteGames: favoriteGames.map((game) => ({
        id: game.uuid,
        name: game.name,
      })),
      partnerMatrixId: user.partnerMatrixId,
      partnerMatrixBtag: user.partnerMatrixBtag,
      level: user.level,
      rank: user.rank,
      totalRake: totalRake._sum.rake?.toNumber() || 0,
      isBonusEnabled: user.isBonusEnabled,
      signUpEventSent: user.signUpEventSent,
      preference: user.userPreference || undefined,
    };
  }

  private async getMasterNickname(masterId: string): Promise<string | null> {
    const master = await this.prismaService.user.findUnique({
      where: {
        id: masterId,
      },
      select: {
        nickname: true,
      },
    });
    return master?.nickname || null;
  }

  /**
   *
   * @param id userId
   * @returns - {@linkcode UserWithBalance}
   * @throws - {@link NotFoundException} if user not found
   */
  async getUserInfoOrThrow(id: string): Promise<UserWithBalance> {
    const userInfo = await this.getUserInfo(id);
    if (!userInfo) {
      this.logger.error(
        new Error(`User with id ${id} not found`),
        'registerWallet',
      );
      throw new NotFoundException();
    }
    return userInfo;
  }

  async linkWalletToUser(
    wallet: string,
    blockchain: number,
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<User> {
    const client = this.getClient(transactionManager);

    return client.user.update({
      where: {
        id: userId,
      },
      data: {
        wallet,
        blockchain,
      },
    });
  }

  private async create<T>(
    userData: CreateUser,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserWithBalance | T> {
    const client = this.getClient(transactionManager);

    const savedUser = await client.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        userRoles: {
          create: userData.roleIds.map((roleId) => ({
            roleId,
          })),
        },
        resetPasswordRequired: userData.resetPasswordRequired,
        masterId: userData?.masterId,
        nickname: userData.nickname,
        wallet: userData.wallet,
        blockchain: userData.blockchain,
        playerTag: userData.playerTag,
        maxBetSize: userData.maxBetSize,
        maxNumberOfUsers: userData.maxNumberOfUsers,
        maxExposurePerVip: userData.maxExposurePerVip,
        flexibleBookieStake: userData.flexibleBookieStake,
        predefinedBookieStake: userData.predefinedBookieStake,
        userBookieStake: userData.userBookieStake,
        countryCode: userData.countryCode,
        active: !userData.needsActivation,
        partnerMatrixBtag: userData.partnerMatrixBtag,
        signUpEventSent: false,
        isBonusEnabled: userData.isBonusEnabled,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        master: {
          select: {
            nickname: true,
          },
        },
      },
    });

    const savedBalance = await this.balanceService.create(
      savedUser.id,
      transactionManager,
    );

    if (
      savedUser.userRoles.some(
        (userRole) =>
          userRole.role.name === Roles.USER ||
          userRole.role.name === Roles.VIP_USER,
      )
    ) {
      this.gamanzaEngageService
        .gamanzaRegistration(savedUser.id)
        .catch((error) => {
          this.logger.error(error);
        })
        .then(() => {
          this.gamanzaEngageService
            .gamanzaUpdatePlayer(savedUser.id, savedUser.playerTag)
            .catch((error) => {
              this.logger.error(error);
            });
        });
    }

    return {
      ...savedUser,
      roles: savedUser.userRoles.map((userRole) => userRole.role),
      balance: savedBalance,
      favoriteCategory: '',
      favoriteGames: [],
      totalRake: 0,
    };
  }

  async verifyEmailAndActivateUser(data: VerifyEmailDto): Promise<void> {
    const code = await this.userCodeService.findByCodeAndCodeType(
      data.code,
      CodeTypes.ACCOUNT_VERIFICATION,
    );
    if (!code) {
      throw new NotFoundException(ErrorMessages.INVALID_VERIFICATION_CODE);
    }

    const hashKey = this.configService.getOrThrow<string>(ENV.MAILING_HASH_KEY);
    if (
      new Date() > code.expiresAt ||
      data.code !== code.code ||
      hmacSha512Inb64Url(hashKey, code.user.email!) !== data.email
    ) {
      throw new BadRequestException(ErrorMessages.INVALID_VERIFICATION_CODE);
    }

    const user = await this.findById(code.userId);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    this.updateById(user.id, {
      active: true,
    });

    try {
      const promoCode = await this.redis.get(
        `${REDIS_KEY__REDEEMABLE_PROMO_CODES}:${user.id}`,
      );
      this.eventEmitter.emit(
        EventNamespace.USER_ACTIVATION_ACCOUNT,
        new UserActivationEvent({
          userId: user.id,
          promoCode: promoCode || undefined,
        }),
      );
      await this.redis.del(`${REDIS_KEY__REDEEMABLE_PROMO_CODES}:${user.id}`);
    } catch (e) {
      this.logger.error(e);
    }

    await this.userCodeService.deleteById(code.id);
  }

  async createWalletUser(
    walletUserData: CreateWalletUser,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserWithBalance> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (transactionManager) => {
        return await this.createWalletUser(walletUserData, transactionManager);
      });
    }
    const playerTag = await this.generatePlayerTag(transactionManager);
    const userRole = await this.roleService.getRoleByNameOrThrow(
      Roles.USER,
      transactionManager,
    );

    const userData: CreateUser = {
      roleIds: [userRole.id],
      wallet: walletUserData.wallet,
      playerTag,
      blockchain: walletUserData.blockchain,
      partnerMatrixBtag: walletUserData.partnerMatrixBtag,
      countryCode: walletUserData.countryCode,
    };

    return await this.create(userData, transactionManager);
  }

  async createVipUser(
    masterId: string,
    credentialsUserData: CreateVipUser,
    transactionManager?: PrismaTransactionManager,
  ): Promise<
    UserWithBalance & { maxBetSize: Decimal; userBookieStake: Decimal | null }
  > {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (transactionManager) => {
        return await this.createVipUser(
          masterId,
          credentialsUserData,
          transactionManager,
        );
      });
    }
    const playerTag = await this.generatePlayerTag(transactionManager);

    const role = await this.roleService.getRoleByNameOrThrow(Roles.VIP_USER);

    const userData: CreateUser & { masterId: string; nickname?: string } = {
      masterId,
      email: credentialsUserData.email,
      password: encryptPassword(credentialsUserData.password),
      resetPasswordRequired: true,
      canWithdraw: false,
      nickname: credentialsUserData.nickname,
      roleIds: [role.id],
      playerTag,
      userBookieStake: credentialsUserData.userBookieStake
        ? new Decimal(credentialsUserData.userBookieStake)
        : undefined,
      isBonusEnabled: credentialsUserData.isBonusEnabled,
    };

    return (await this.create<UserWithBalance & { maxBetSize: Decimal }>(
      userData,
      transactionManager,
    )) as UserWithBalance & {
      maxBetSize: Decimal;
      userBookieStake: Decimal | null;
    };
  }

  async createMasterUser(
    masterId: string,
    credentialsUserData: CreateMasterDto &
      Pick<CreateCredentialsUser, 'password'>,
    transactionManager?: PrismaTransactionManager,
  ): Promise<MasterUserDetails> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (transactionManager) => {
        return await this.createMasterUser(
          masterId,
          credentialsUserData,
          transactionManager,
        );
      });
    }
    const playerTag = await this.generatePlayerTag(transactionManager);

    const role = await this.roleService.getRoleByNameOrThrow(Roles.MASTER);

    const userData: CreateUser = {
      masterId,
      email: credentialsUserData.email,
      password: encryptPassword(credentialsUserData.password),
      nickname: credentialsUserData.nickname,
      roleIds: [role.id],
      canWithdraw: false,
      resetPasswordRequired: true,
      maxExposurePerVip: new Decimal(
        credentialsUserData.maxExposurePerVip || 0,
      ),
      maxNumberOfUsers: credentialsUserData.maxNumberOfUsers || null,
      playerTag,
      flexibleBookieStake: new Decimal(credentialsUserData.flexibleBookieStake),
      predefinedBookieStake: new Decimal(
        credentialsUserData.predefinedBookieStake,
      ),
    };

    return (await this.create<MasterUserDetails>(
      userData,
      transactionManager,
    )) as MasterUserDetails;
  }

  async createCredentialsUser(
    credentialsUserData: CreateCredentialsUser,
  ): Promise<UserWithBalance> {
    return this.prismaService.$transaction(async (transactionManager) => {
      const playerTag = await this.generatePlayerTag(transactionManager);

      const role = await this.roleService.getRoleByNameOrThrow(
        Roles.USER,
        transactionManager,
      );

      const userData: CreateUser = {
        email: credentialsUserData.email,
        password: encryptPassword(credentialsUserData.password),
        roleIds: [role.id],
        playerTag,
        needsActivation: true,
        partnerMatrixBtag: credentialsUserData.partnerMatrixBtag,
        countryCode: credentialsUserData.countryCode,
      };

      const user = await this.create<UserWithBalance>(
        userData,
        transactionManager,
      );

      const code = this.userCodeService.getAccountVerificationCode();
      await this.userCodeService.upsert(
        {
          userId: user.id,
          code: code.code,
          expiresAt: code.expiryDate,
          codeType: CodeTypes.ACCOUNT_VERIFICATION,
        },
        transactionManager,
      );

      await this.mailProducer.enqueueSendVerifyEmailMailJob({
        userEmail: credentialsUserData.email,
        code: code.code,
      });

      return user;
    });
  }

  async resendActivationEmail(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const code = this.userCodeService.getAccountVerificationCode();
    await this.userCodeService.upsert({
      userId: user.id,
      code: code.code,
      expiresAt: code.expiryDate,
      codeType: CodeTypes.ACCOUNT_VERIFICATION,
    });

    await this.mailProducer.enqueueSendVerifyEmailMailJob({
      userEmail: user.email!,
      code: code.code,
    });
  }

  async createBaseAdminUser(
    masterId: string,
    credentialsUserData: CreateCredentialsUser & {
      nickname: string;
      role: Role;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<AdminUser> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (transactionManager) => {
        return await this.createBaseAdminUser(
          masterId,
          credentialsUserData,
          transactionManager,
        );
      });
    }
    const playerTag = await this.generatePlayerTag(transactionManager);

    const role = await this.roleService.getRoleByNameOrThrow(
      credentialsUserData.role,
    );

    const userData: CreateUser = {
      masterId,
      email: credentialsUserData.email,
      password: encryptPassword(credentialsUserData.password),
      nickname: credentialsUserData.nickname,
      roleIds: [role.id],
      canWithdraw: false,
      resetPasswordRequired: true,
      playerTag,
    };

    return (await this.create<AdminUser>(
      userData,
      transactionManager,
    )) as AdminUser;
  }

  private async generatePlayerTag(
    transactionManager: PrismaTransactionManager,
  ): Promise<string> {
    const maxRetry = 10;

    const getClient = this.getClient(transactionManager);

    for (let i = 0; i < maxRetry; i++) {
      const playerTag = `Player_${generateRandomId(8)}`;

      const user = await getClient.user.findUnique({
        where: {
          playerTag,
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        return playerTag;
      }
    }

    this.logger.error(
      'Failed to generate unique player tag',
      'UserService.generatePlayerTag',
    );

    throw new Error(ErrorMessages.FAILED_TO_GENERATE_PLAYER_TAG);
  }

  async updateById(
    userId: string,
    data: Prisma.UserUpdateInput,
    transactionManager?: PrismaTransactionManager,
  ): Promise<User> {
    const client = this.getClient(transactionManager);
    return client.user.update({
      where: {
        id: userId,
      },
      data,
    });
  }

  async updateSettlementWallet(userId: string, wallet: string): Promise<User> {
    const findDuplicateWallet = await this.findByWallet(wallet);
    if (findDuplicateWallet) {
      throw new ConflictException(ErrorMessages.WALLET_ALREADY_IN_USE);
    }
    return await this.updateById(userId, {
      wallet,
    });
  }

  async update2FA(
    userId: string,
    enable2FA: boolean,
    code: string,
    email?: string,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const verificationResult = await this.verifyTwoFactorAuthentication(
      userId,
      code,
    );
    if (!verificationResult) {
      throw new BadRequestException(
        ErrorMessages.INVALID_TWO_FACTOR_AUTHENTICATION_CODE,
      );
    }

    if (!user.email && !email) {
      throw new BadRequestException(
        ErrorMessages.TWO_FACTOR_AUTHENTICATION_NEEDS_EMAIL,
      );
    }

    if (!user.email && email) {
      await this.updateById(userId, {
        email,
      });
    }

    await this.updateById(userId, {
      enable2FA,
    });
  }

  async sendTwoFactorAuthenticationCode(
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const code = this.userCodeService.getTwoFactorAuthenticationCode();
    await this.userCodeService.upsert({
      userId: user.id,
      code: code.code,
      expiresAt: code.expiryDate,
      codeType: CodeTypes.TWO_FACTOR_AUTHENTICATION,
    });

    const email = user.email ?? userEmail;
    if (!email) {
      throw new BadRequestException(
        ErrorMessages.TWO_FACTOR_AUTHENTICATION_NEEDS_EMAIL,
      );
    }

    await this.mailProducer.enqueueSendTwoFactorAuthenticationCodeMailJob({
      userEmail: email,
      code: code.code,
    });
  }

  async verifyTwoFactorAuthenticationIfEnabled(
    userId: string,
    code?: string,
    resendExpired: boolean = true,
  ): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    if (!user.enable2FA) {
      return true;
    }

    if (!code) {
      return false;
    }

    return this.verifyUserTwoFactorCode(userId, code!, resendExpired);
  }

  async verifyTwoFactorAuthentication(
    userId: string,
    code: string,
    resendExpired: boolean = true,
  ): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return this.verifyUserTwoFactorCode(userId, code, resendExpired);
  }

  private async verifyUserTwoFactorCode(
    userId: string,
    code: string,
    resendExpired: boolean = true,
  ): Promise<boolean> {
    const userCode = await this.userCodeService.findByUserIdAndType(
      userId,
      CodeTypes.TWO_FACTOR_AUTHENTICATION,
    );

    if (!userCode || userCode.code !== code) {
      return false;
    }

    if (new Date() > userCode.expiresAt) {
      if (resendExpired) {
        await this.sendTwoFactorAuthenticationCode(userId);
      }

      throw new BadRequestException(
        ErrorMessages.TWO_FACTOR_AUTHENTICATION_CODE_EXPIRED,
      );
    }

    await this.userCodeService.deleteById(userCode.id);

    return true;
  }

  // !CHECK - https://trello.com/c/VDj7Ctq6
  async getVipUsersByMasterId(
    masterId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<User[]> {
    return this.getClient(transactionManager).user.findMany({
      where: {
        masterId,
        userRoles: {
          some: {
            role: {
              name: Roles.VIP_USER,
            },
          },
        },
      },
    });
  }

  async getBlockchain(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<number | null> {
    const user = await this.getClient(transactionManager).user.findUnique({
      where: {
        id: userId,
      },
      select: {
        blockchain: true,
      },
    });

    if (!user) return null;

    return user.blockchain;
  }

  async findByEthereumWallet(
    wallet: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    id: string;
  } | null> {
    return await this.getClient(transactionManager).user.findFirst({
      where: {
        wallet: {
          equals: wallet,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });
  }

  async changeUsername(
    userId: string,
    username: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<void> {
    const usernameExists = await this.prismaService.user.findUnique({
      where: {
        nickname: username,
      },
      select: {
        nickname: true,
      },
    });

    if (usernameExists) {
      throw new BadRequestException('Username already exists');
    }

    try {
      await this.getClient(transactionManager).user.update({
        where: {
          id: userId,
        },
        data: {
          nickname: username,
        },
        select: {
          id: true,
          nickname: true,
        },
      });
    } catch (error) {
      throw new BadRequestException('Username update failed');
    }

    this.gamanzaEngageService
      .gamanzaUpdatePlayer(userId, username)
      .catch(() => {
        this.gamanzaEngageService
          .gamanzaRegistration(userId)
          .catch((error) => {
            this.logger.error(error);
          })
          .then(() => {
            this.gamanzaEngageService
              .gamanzaUpdatePlayer(userId, username)
              .catch((error) => {
                this.logger.error(error);
              });
          });
      });
  }

  // For Facebook statistics
  async handleSignUpEvent(userId: string): Promise<void> {
    await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        signUpEventSent: true,
      },
    });
  }

  async setLanguagePreference(userId: string, language: string): Promise<void> {
    await this.prismaService.userPreference.upsert({
      where: {
        userId,
      },
      update: {
        language,
      },
      create: {
        userId,
        language,
      },
    });
  }

  async setExchangeWidgetPairPreference(
    userId: string,
    pair: string,
  ): Promise<void> {
    await this.prismaService.userPreference.upsert({
      where: {
        userId,
      },
      update: {
        exchangeWidgetPair: pair,
      },
      create: {
        userId,
        exchangeWidgetPair: pair,
      },
    });
  }

  getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
