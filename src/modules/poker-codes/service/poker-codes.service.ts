import { ErrorMessages } from '@common/enums/error-messages.enum';
import { PagePaginationResponse } from '@common/types';
import { NotificationCodes } from '@infrastructure/database/prisma/constants';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { Roles, UserRoleSchema } from '@modules/role/enum/role.enum';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PokerCode, Prisma } from '@prisma/client';
import { CreatePokerCodes } from '../dto/create-poker-codes.dto';
import { PokerCodeDistributionsResponse } from '../dto/poker-code-distribution.response.dto';
import {
  PokerCodeResponse,
  PokerCodeResponseDto,
} from '../dto/poker-code.response.dto';
import { UpdatePokerCode } from '../dto/update-poker-code.dto';
import { GetPokerCodeDistributionsFiltersQuery } from '../query/get-poker-code-distributions-filters.query';
import { GetPokerCodesFiltersQuery } from '../query/get-poker-codes-filters.query';
import { decimalToNumber } from '@utils/decimal-do-number';
import { MyPokerCodeResponseDto } from '../dto/my-poker-code.response.dto';

@Injectable()
export class PokerCodesService {
  private readonly _logger = new Logger(PokerCodesService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getPokerCodes(
    filters: GetPokerCodesFiltersQuery,
  ): Promise<PagePaginationResponse<PokerCodeResponseDto>> {
    const now = new Date();

    const filterData: {
      where: Prisma.PokerCodeWhereInput;
      take: number;
      skip: number;
    } = {
      where: {
        code: filters.code,
        useLimit: filters.useLimit,
        reuseLimit: filters.reuseLimit,
        rangeFrom: {
          gte: filters.depositRangeFrom,
        },
        rangeTo: {
          lte: filters.depositRangeTo,
        },
        isDisabled: filters.isDisabled,
        isHighRoller: filters.isHighRoller,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      take: filters.limit,
      skip: (filters.page - 1) * filters.limit,
    };

    const count = await this.prismaService.pokerCode.count({
      where: filterData.where,
    });

    const pokerCodes = await this.prismaService.pokerCode.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...filterData,
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
          },
        },
        distributions: {
          select: {
            id: true,
          },
        },
      },
    });

    const data = pokerCodes.map((pk) => ({
      ...pk,
      rangeFrom: decimalToNumber(pk.rangeFrom) || 0,
      rangeTo: decimalToNumber(pk.rangeTo) || 0,
      usesLeft: pk.useLimit - pk.distributions.length,
      status: (pk.isDisabled
        ? 'DISABLED'
        : pk.expiresAt <= now
          ? 'EXPIRED'
          : 'ACTIVE') as PokerCodeResponseDto['status'],
      isInUse: pk.distributions.length > 0,
    }));

    return {
      data,
      total: count,
      limit: filters.limit,
      page: filters.page,
    };
  }

  async createPokerCodes(
    data: CreatePokerCodes,
    id: string,
  ): Promise<{ duplicateCodes: string[] }> {
    const codesToCreate = data.data.map((pk) => pk.code);

    const existingCodes = await this.prismaService.pokerCode.findMany({
      where: {
        code: { in: codesToCreate },
      },
      select: { code: true },
    });

    const duplicateCodes = existingCodes.map((codeObj) => codeObj.code);

    await this.prismaService.pokerCode.createMany({
      data: data.data.map((pk) => ({ ...pk, createdById: id })),
      skipDuplicates: true,
    });

    return { duplicateCodes };
  }

  async updatePokerCode(
    id: number,
    data: UpdatePokerCode,
  ): Promise<PokerCodeResponse> {
    const now = new Date();

    const extingPokerCode = await this.prismaService.pokerCode.findUnique({
      where: {
        id,
      },
    });

    if (!extingPokerCode) {
      throw new BadRequestException(ErrorMessages.INVALID_POKER_CODES_PROVIDED);
    }

    const updatedPokerCode = await this.prismaService.pokerCode.update({
      where: {
        id,
      },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            wallet: true,
          },
        },
        distributions: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      ...updatedPokerCode,
      rangeFrom: decimalToNumber(updatedPokerCode.rangeFrom) || 0,
      rangeTo: decimalToNumber(updatedPokerCode.rangeTo) || 0,
      usesLeft:
        updatedPokerCode.useLimit - updatedPokerCode.distributions.length,
      status: (updatedPokerCode.isDisabled
        ? 'DISABLED'
        : updatedPokerCode.expiresAt <= now
          ? 'EXPIRED'
          : 'ACTIVE') as PokerCodeResponseDto['status'],
      isInUse: updatedPokerCode.distributions.length > 0,
    };
  }

  async checkIfPokerCodeWasUsed(codeId: number): Promise<boolean> {
    const isCodeInUse =
      await this.prismaService.pokerCodeDistribution.findFirst({
        where: {
          codeId,
        },
      });

    return !!isCodeInUse;
  }

  async disablePokerCode(id: number): Promise<number> {
    const extingPokerCode = await this.prismaService.pokerCode.findUnique({
      where: {
        id,
      },
    });

    if (!extingPokerCode) {
      throw new BadRequestException(ErrorMessages.INVALID_POKER_CODES_PROVIDED);
    }

    const updatedPokerCode = await this.prismaService.pokerCode.update({
      where: {
        id,
      },
      data: {
        isDisabled: true,
      },
    });

    return updatedPokerCode.id;
  }

  async deletePokerCode(id: number): Promise<number> {
    const extingPokerCode = await this.prismaService.pokerCode.findUnique({
      where: {
        id,
      },
    });

    if (!extingPokerCode) {
      throw new BadRequestException(ErrorMessages.INVALID_POKER_CODES_PROVIDED);
    }

    const deletedPokerCode = await this.prismaService.pokerCode.delete({
      where: {
        id,
      },
    });

    return deletedPokerCode.id;
  }

  async getPokerCodeDistributions(
    filters: GetPokerCodeDistributionsFiltersQuery,
  ): Promise<PagePaginationResponse<PokerCodeDistributionsResponse>> {
    const filterData: {
      where: Prisma.PokerCodeDistributionWhereInput;
      take: number;
      skip: number;
    } = {
      where: {
        user: {
          nickname: filters.nickname,
          wallet: filters.wallet,
        },
        code: {
          code: filters.code,
        },
        distributionCount: filters.distributionCount,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      take: filters.limit,
      skip: (filters.page - 1) * filters.limit,
    };

    const count = await this.prismaService.pokerCodeDistribution.count({
      where: filterData.where,
    });

    const pokerCodeDistributions =
      await this.prismaService.pokerCodeDistribution.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...filterData,
        include: {
          code: {
            select: {
              code: true,
            },
          },
          user: {
            select: {
              id: true,
              nickname: true,
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
            },
          },
        },
      });

    const data = pokerCodeDistributions.map((pkd) => {
      const userRole = pkd.user.userRoles.at(0)?.role.name;
      const parsedUserType = UserRoleSchema.safeParse(userRole);

      if (parsedUserType.success === false) {
        this._logger.error(
          `Error parsing ${userRole} user role type. With id: ${pkd.userId}`,
          'getPokerCodeDistributions',
        );
      }

      return {
        ...pkd,
        code: pkd.code.code,
        user: {
          ...pkd.user,
          type: parsedUserType.success ? parsedUserType.data : Roles.USER,
        },
      };
    });

    return {
      data,
      total: count,
      limit: filters.limit,
      page: filters.page,
    };
  }

  async assignPokerCodesOnDeposit(
    userId: string,
    depositAmount: number,
  ): Promise<PokerCode[]> {
    const now = new Date();

    return await this.prismaService.$transaction(async (transactionManager) => {
      const availablePokerCodes = await transactionManager.pokerCode.findMany({
        where: {
          expiresAt: { gt: now },
          isHighRoller: false,
          isDisabled: false,
          rangeFrom: { lte: depositAmount },
          rangeTo: { gte: depositAmount },
        },
        include: {
          distributions: {
            where: { userId },
          },
        },
      });

      const eligiblePokerCodes = [];

      for (const pokerCode of availablePokerCodes) {
        const userDistribution = pokerCode.distributions[0];

        if (userDistribution) {
          if (userDistribution.distributionCount < pokerCode.reuseLimit) {
            eligiblePokerCodes.push(pokerCode);
          }
        } else {
          const totalDistributions =
            await transactionManager.pokerCodeDistribution.count({
              where: { codeId: pokerCode.id },
            });

          if (totalDistributions < pokerCode.useLimit) {
            eligiblePokerCodes.push(pokerCode);
          }
        }
      }

      const firstTimeUsedPokerCodes = eligiblePokerCodes.filter((pokerCode) => {
        return !pokerCode.distributions || pokerCode.distributions.length === 0;
      });

      for (const pokerCode of eligiblePokerCodes) {
        await transactionManager.pokerCodeDistribution.upsert({
          where: {
            userId_codeId: {
              userId,
              codeId: pokerCode.id,
            },
          },
          create: {
            userId,
            codeId: pokerCode.id,
            distributionCount: 1,
          },
          update: {
            distributionCount: { increment: 1 },
          },
        });
      }

      return firstTimeUsedPokerCodes;
    });
  }

  async pokerCodesDistributedNotification(
    userId: string,
    pks: PokerCode[],
  ): Promise<void> {
    const pokerCodes = pks.map((pk) => pk.code).join(', ');

    await this.notificationsService
      .createNotification(
        userId,
        NotificationCodes.POKER_CODE_DISTRIBUTED,
        undefined,
        {
          pokerCodes,
        },
      )
      .catch((e) => {
        this._logger.log(
          { userId, error: e },
          'PokerCodesDistributedNotification.error',
        );
      });
  }

  async getMyPokerCodes(
    userId: string,
    filters: GetPokerCodesFiltersQuery,
  ): Promise<PagePaginationResponse<MyPokerCodeResponseDto>> {
    const now = new Date();

    const filterData: {
      where: Prisma.PokerCodeWhereInput;
      take: number;
      skip: number;
    } = {
      where: {
        distributions: {
          some: {
            userId,
          },
        },
      },
      take: filters.limit,
      skip: (filters.page - 1) * filters.limit,
    };

    const count = await this.prismaService.pokerCode.count({
      where: filterData.where,
    });

    const pokerCodes = await this.prismaService.pokerCode.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...filterData,
    });

    const data = pokerCodes.map((pk) => ({
      ...pk,
      rangeFrom: decimalToNumber(pk.rangeFrom) || 0,
      rangeTo: decimalToNumber(pk.rangeTo) || 0,
      status: (pk.isDisabled
        ? 'DISABLED'
        : pk.expiresAt <= now
          ? 'EXPIRED'
          : 'ACTIVE') as MyPokerCodeResponseDto['status'],
    }));

    return {
      data,
      total: count,
      limit: filters.limit,
      page: filters.page,
    };
  }
}
