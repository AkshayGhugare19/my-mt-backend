import { PagePaginationRequest, PagePaginationResponse } from '@common/types';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { CreateBonus } from '@modules/bonus/dtos/create-bonus.dto';
import { BonusTriggerConfigType, BonusTriggerType } from '@modules/bonus/enum';
import { FilterUserBonusesQuery } from '@modules/bonus/query/filter-user-bonuses.query';
import { BonusTriggerService } from '@modules/bonus/service/bonus-trigger.service';
import {
  BonusWithTriggers,
  bonusWithTriggersSelector,
} from '@modules/bonus/types';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class BonusService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly bonusTriggerService: BonusTriggerService,
    private readonly permissionService: PermissionService,
  ) {}

  async findByTriggerConfigType(
    params: {
      triggerConfigType: BonusTriggerConfigType;
      triggerType?: BonusTriggerType;
      withDeleted?: boolean;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<BonusWithTriggers[]> {
    const { triggerConfigType, triggerType } = params;
    return await this.getClient(transactionManager).bonus.findMany({
      where: {
        bonusTriggerProducerConfig: {
          some: {
            trigger: {
              configType: triggerConfigType,
              type: triggerType,
            },
          },
        },
        deletedAt: params.withDeleted ? undefined : null,
      },
      ...bonusWithTriggersSelector,
    });
  }

  async findPaginated(
    pagination: PagePaginationRequest = {},
    withDeleted: boolean = false,
  ): Promise<PagePaginationResponse<BonusWithTriggers>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const count = await this.prismaService.bonus.count({
      where: {
        deletedAt: withDeleted ? undefined : null,
      },
    });
    const data = await this.prismaService.bonus.findMany({
      where: {
        deletedAt: withDeleted ? undefined : null,
      },
      ...bonusWithTriggersSelector,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        {
          deletedAt: {
            sort: 'desc',
            nulls: 'first',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
    });
    return {
      data,
      limit,
      page,
      total: count,
    };
  }

  private async getAvailableBonusIdsForUser(
    userId: string,
  ): Promise<{ bonus_id: string }[]> {
    return this.prismaService.$queryRaw<
      {
        bonus_id: string;
      }[]
    >(Prisma.sql`
      select
        b.id as bonus_id
      from bonuses b
      left join (
        select 
          ubp.bonus_id as bonus_id, 
          COUNT(ubp.bonus_id) as cnt
        from user_bonus_progressions ubp
        where ubp.user_id = ${userId}
        group by ubp.bonus_id 
      ) as A on A.bonus_id = b.id
      where coalesce(A.cnt, 0) < b.limit_per_user`);
  }

  async findAvailableForUser(
    requesterId: string,
    userId: string,
    filters: FilterUserBonusesQuery,
  ): Promise<PagePaginationResponse<BonusWithTriggers>> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const permissions =
      await this.permissionService.getUserPermissions(requesterId);
    if (permissions.includes(Permissions.READ_OWN_USER_BONUS)) {
      const userInfo = await this.prismaService.user.findUnique({
        where: {
          id: userId,
          masterId: requesterId,
        },
        select: {
          id: true,
        },
      });
      if (!userInfo) throw new ForbiddenException();
    }
    const bonusIds = await this.getAvailableBonusIdsForUser(userId);
    const filter: Prisma.BonusWhereInput = {
      deletedAt: filters.status === 'available' ? null : undefined,
      bonusTriggerProducerConfig: filters.triggerProducerType
        ? {
            some: {
              trigger: {
                configType: filters.triggerProducerType,
              },
            },
          }
        : undefined,
      id:
        filters.status === 'claimed'
          ? {
              not: { in: bonusIds.map((bonus) => bonus.bonus_id) },
            }
          : {
              in: bonusIds.map((bonus) => bonus.bonus_id),
            },
    };
    const total = await this.prismaService.bonus.count({
      where: filter,
    });
    const data = await this.prismaService.bonus.findMany({
      where: filter,
      ...bonusWithTriggersSelector,
    });
    return {
      data,
      limit,
      page,
      total,
    };
  }

  async create(
    creatorId: string,
    createBonus: CreateBonus,
  ): Promise<BonusWithTriggers> {
    const producerTriggers = createBonus.producerTriggers;
    const progressTriggers = createBonus.progressTriggers;
    const consumerTriggers = createBonus.consumerTriggers;

    await this.bonusTriggerService.validateProducerTriggers(producerTriggers);
    await this.bonusTriggerService.validateProgressTriggers(progressTriggers);
    await this.bonusTriggerService.validateConsumerTriggers(consumerTriggers);

    return await this.prismaService.bonus.create({
      data: {
        name: createBonus.name,
        description: createBonus.description,
        rewardType: createBonus.rewardType,
        rewardAmount: createBonus.rewardAmount,
        type: createBonus.type,
        bonusExpiryTime: createBonus.bonusExpiryTime,
        maxReward: createBonus.maxReward,
        limitPerUser: createBonus.limitPerUser,
        rolloverExpiryTime: createBonus.rolloverExpiryTime,
        rolloverType: createBonus.rolloverType,
        rolloverAmount: createBonus.rolloverAmount,
        bonusExpiryHour: createBonus.bonusExpiryHour,
        creatorId,
        bonusTriggerProgressConfig: {
          createMany: {
            data: createBonus.progressTriggers.map((trigger) => ({
              target: trigger.target || null,
              triggerId: trigger.triggerId,
              type: trigger.type,
              config: trigger.config,
            })),
          },
        },
        bonusTriggerProducerConfig: {
          createMany: {
            data: producerTriggers.map((trigger) => ({
              triggerId: trigger.triggerId,
              target: trigger.target || null,
              type: trigger.type,
              config: trigger.config,
            })),
          },
        },
        bonusTriggerConsumerConfig: {
          createMany: {
            data: createBonus.consumerTriggers.map((trigger) => ({
              triggerId: trigger.triggerId,
              type: trigger.type,
              config: trigger.config,
              target: trigger.target || null,
            })),
          },
        },
      },
      ...bonusWithTriggersSelector,
    });
  }

  async disable(bonusId: string, disabled: boolean): Promise<void> {
    await this.prismaService.bonus.update({
      where: {
        id: bonusId,
      },
      data: {
        userBonusProgression: {
          updateMany: {
            where: {
              bonusId,
            },
            data: {
              deletedAt: disabled ? new Date() : null,
            },
          },
        },
        userBonusBalance: {
          updateMany: {
            where: {
              bonusId,
            },
            data: {
              deletedAt: disabled ? new Date() : null,
            },
          },
        },
        deletedAt: disabled ? new Date() : null,
      },
    });
  }

  async disableForUser(
    bonusId: string,
    userId: string,
    disabled: boolean,
  ): Promise<void> {
    await this.prismaService.$transaction([
      this.prismaService.userBonusBalance.updateMany({
        where: {
          bonusId,
          userId,
        },
        data: {
          deletedAt: disabled ? new Date() : null,
        },
      }),
      this.prismaService.userBonusProgression.updateMany({
        where: {
          bonusId,
          userId,
        },
        data: {
          deletedAt: disabled ? new Date() : null,
        },
      }),
    ]);
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
