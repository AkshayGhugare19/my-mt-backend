import { ErrorMessages } from '@common/enums/error-messages.enum';
import { NotFoundError } from '@common/error/not-found.error';
import { PagePaginationRequest, PagePaginationResponse } from '@common/types';
import { NotificationCodes } from '@infrastructure/database/prisma/constants';
import { userSearchSelector } from '@infrastructure/database/prisma/filters/user';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BalanceService } from '@modules/balance/service/balance.service';
import { BonusProgressStatus } from '@modules/bonus/enum';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import {
  RewardAdmin,
  rewardAdminSelector,
  RewardReceived,
  rewardReceivedSelector,
} from '@modules/reward/types';
import { Roles } from '@modules/role/enum/role.enum';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionTargetBalances } from '@modules/transaction-ledger/enum/target-balance.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';

@Injectable()
export class RewardService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly balanceService: BalanceService,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly permissionService: PermissionService,
    private readonly notificationService: NotificationsService,
  ) {}

  // region Selects
  async getAllRewardsReceived(
    userId: string,
    query: {
      filters?: Prisma.RewardWhereInput;
      pagination: PagePaginationRequest;
    },
  ): Promise<PagePaginationResponse<RewardReceived>> {
    const { filters, pagination } = query;
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const count = await this.prismaService.reward.count({
      where: { ...(filters || {}), userId, deletedAt: null },
    });

    const data = await this.prismaService.reward.findMany({
      where: { ...(filters || {}), userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      select: rewardReceivedSelector.select,
      take: limit,
    });

    return { data, total: count, page, limit };
  }

  async getAllRewardsFiltered(
    requesterId: string,
    query: {
      filters?: {
        amount?: [number, number];
        status?: BonusProgressStatus;
        date?: [Date, Date];
        description?: string;
        sender?: string;
        receiver?: string;
      };
      pagination: PagePaginationRequest;
    },
  ): Promise<PagePaginationResponse<RewardAdmin>> {
    const { amount, status, sender, receiver, date, description } =
      query.filters ?? {};

    const isSearchAll = sender !== undefined && receiver !== undefined;

    return this.getAllRewardsAdmin(requesterId, {
      filters: {
        amount: amount?.length
          ? {
              gte: amount?.[0],
              lte: amount?.[1],
            }
          : undefined,
        bonusProgress: {
          status,
        },
        description: description
          ? { contains: description, mode: 'insensitive' }
          : undefined,
        createdAt: date ? { gte: date[0], lte: date[1] } : undefined,
        sender: !isSearchAll && sender ? userSearchSelector(sender) : undefined,
        user:
          !isSearchAll && receiver ? userSearchSelector(receiver) : undefined,
        OR: isSearchAll
          ? [
              {
                sender: userSearchSelector(sender),
              },
              {
                user: userSearchSelector(receiver),
              },
            ]
          : undefined,
      },
      pagination: query.pagination,
    });
  }

  async getAllRewardsAdmin(
    requesterId: string,
    query: {
      filters?: Prisma.RewardWhereInput;
      pagination: PagePaginationRequest;
    },
  ): Promise<PagePaginationResponse<RewardAdmin>> {
    const { filters, pagination } = query;
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;

    const permissions =
      await this.permissionService.getUserPermissions(requesterId);

    const hasReadOwnVipRewardsPermissions = permissions.some(
      (permission) => permission === Permissions.READ_OWN_VIP_REWARDS,
    );

    const count = await this.prismaService.reward.count({
      where: {
        ...(filters || {}),
        user: {
          ...((filters?.user as Prisma.UserWhereInput) || {}),
          masterId: hasReadOwnVipRewardsPermissions ? requesterId : undefined,
        },
        deletedAt: null,
      },
    });
    const data = await this.prismaService.reward.findMany({
      where: {
        ...(filters || {}),
        user: {
          ...((filters?.user as Prisma.UserWhereInput) || {}),
          masterId: hasReadOwnVipRewardsPermissions ? requesterId : undefined,
        },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      select: rewardAdminSelector.select,
      take: limit,
    });

    return { data, total: count, page, limit };
  }

  async findRewardById(id: number): Promise<RewardAdmin> {
    const reward = await this.prismaService.reward.findUnique({
      where: { id },
      select: rewardAdminSelector.select,
    });

    if (!reward) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'Reward', id.toString());
    }

    return reward;
  }
  // endregion Selects

  // region Creates
  async createReward(
    senderId: string,
    userId: string,
    amount: number,
    description: string,
  ): Promise<RewardAdmin> {
    const user = await this.userService.findById(userId);

    if (
      !user ||
      !user.roles.some(
        (role) => role.name === Roles.USER || role.name === Roles.VIP_USER,
      )
    ) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND, 'User', userId);
    }

    const savedContract = await this.prismaService.$transaction(
      async (transactionManager) => {
        await this.balanceService.incrementUserBalance(
          userId,
          new Decimal(amount),
          transactionManager,
        );

        const reward = await transactionManager.reward.create({
          data: {
            userId,
            amount: new Decimal(amount),
            senderId,
            description,
            type: 'reward',
          },
        });
        await this.transactionLedgerService.create(
          {
            amount: new Decimal(amount),
            counterParty: TransactionCounterParties.REWARD,
            operationType: TransactionOperationTypes.CREDIT,
            referenceId: reward.id.toString(),
            targetBalance: TransactionTargetBalances.ACCOUNT_BALANCE,
            userId,
            status: TransactionStatuses.SUCCESS,
          },
          transactionManager,
        );

        return reward;
      },
    );

    const reward = await this.findRewardById(savedContract.id);

    this.notificationService
      .createNotification(
        reward.user.id,
        NotificationCodes.REWARD_RECEIVED,
        undefined,
        {
          amount: decimalToDollarsValue(reward.amount),
          description: reward.description,
        },
      )
      .catch((error) => {
        Logger.error({ message: error.message, stack: error.stack });
        return null;
      });

    return reward;
  }
  // endregion Creates
}
