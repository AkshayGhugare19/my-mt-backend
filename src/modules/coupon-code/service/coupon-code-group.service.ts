import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PagePaginationResponse } from '@common/types';
import { FilterCouponGroupsDto } from '../dto/filter-coupon-groups.dto';
import { CouponGroupReport } from '../types';
import { CouponGroup } from '@prisma/client';
import { CreateCouponGroupDto } from '../dto/create-coupon-group.dto';

@Injectable()
export class CouponCodeGroupService {
  constructor(private readonly prismaService: PrismaService) {}

  async filterCouponGroups(
    filterDto: FilterCouponGroupsDto,
  ): Promise<PagePaginationResponse<CouponGroupReport>> {
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (filterDto.name) {
      where.name = {
        contains: filterDto.name,
        mode: 'insensitive',
      };
    }

    const [groups, total] = await Promise.all([
      this.prismaService.couponGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          coupons: {
            include: {
              couponCode: true,
            },
          },
        },
      }),
      this.prismaService.couponGroup.count({ where }),
    ]);

    return {
      data: groups,
      total,
      limit,
      page,
    };
  }

  async createGroup(dto: CreateCouponGroupDto): Promise<CouponGroup> {
    return this.prismaService.$transaction(async (tx) => {
      const newGroup = await tx.couponGroup.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      if (dto.couponCodeIds?.length) {
        const createManyInput = dto.couponCodeIds.map((couponCodeId) => ({
          groupId: newGroup.id,
          couponCodeId,
        }));

        await tx.couponCodeOnGroup.createMany({
          data: createManyInput,
          skipDuplicates: true,
        });
      }

      return tx.couponGroup.findUniqueOrThrow({
        where: { id: newGroup.id },
        include: {
          coupons: {
            include: {
              couponCode: true,
            },
          },
        },
      });
    });
  }

  async updateGroup(id: number, dto: CreateCouponGroupDto): Promise<CouponGroupReport> {
    return this.prismaService.$transaction(async (tx) => {
      await tx.couponGroup.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      await tx.couponCodeOnGroup.deleteMany({
        where: {
          groupId: id,
        },
      });

      if (dto.couponCodeIds?.length) {
        const createManyInput = dto.couponCodeIds.map((couponCodeId) => ({
          groupId: id,
          couponCodeId,
        }));

        await tx.couponCodeOnGroup.createMany({
          data: createManyInput,
          skipDuplicates: true,
        });
      }

      return tx.couponGroup.findUniqueOrThrow({
        where: { id },
        include: {
          coupons: {
            include: {
              couponCode: true,
            },
          },
        },
      });
    });
  }

  async softDeleteGroup(id: number): Promise<CouponGroupReport> {
    return this.prismaService.couponGroup.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      include: {
        coupons: {
          include: {
            couponCode: true,
          },
        },
      },
    });
  }
}
