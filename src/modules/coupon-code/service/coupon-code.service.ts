import { ErrorMessages } from '@common/enums/error-messages.enum';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { PagePaginationResponse } from '@common/types';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BonusTriggerConfigTypes } from '@modules/bonus/enum';
import { BonusService } from '@modules/bonus/service/bonus.service';
import { CreateCouponCodeDto } from '@modules/coupon-code/dto/create-coupon-code.dto';
import { FilterCouponCodeRedeemsDto } from '@modules/coupon-code/dto/filter-coupon-code-redeems.dto';
import { FilterCouponCodesDto } from '@modules/coupon-code/dto/filter-coupon-codes.dto';
import { UpdateCouponCodeDto } from '@modules/coupon-code/dto/update-coupon-code.dto';
import {
  CouponCodeType,
  CouponCodeTypes,
} from '@modules/coupon-code/enum/coupon-code-type.enum';
import { CouponCodeNotFoundError } from '@modules/coupon-code/error/code-not-found.error';
import { DuplicateCodeError } from '@modules/coupon-code/error/duplicate-code.error';
import { InvalidCodeConfigError } from '@modules/coupon-code/error/invalid-config.error';
import { CouponCodeValidators } from '@modules/coupon-code/schema/code-validators';
import { AddCodeConfig } from '@modules/coupon-code/schema/update-code-config.schema';
import {
  CouponCodeConfig,
  rolloverConfigSchema,
} from '@modules/coupon-code/schema/validator/code-config.validator';
import {
  CouponCodeRedeemReport,
  couponCodeRedeemReportSelect,
  CouponCodeReport,
  UserCouponCodeRedeems,
  userCouponCodeRedeemsSelect,
} from '@modules/coupon-code/types';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Bonus, CouponCode, Prisma } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { DateTime } from 'luxon';

@Injectable()
export class CouponCodeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly bonusService: BonusService,
  ) {}

  async createCouponCode(
    adminId: string,
    createCouponCodeDto: CreateCouponCodeDto,
  ): Promise<CouponCode> {
    const foundCoupon = await this.prismaService.couponCode.findUnique({
      where: {
        code: createCouponCodeDto.code,
      },
    });

    if (foundCoupon) {
      throw new DuplicateCodeError();
    }

    const validator = CouponCodeValidators.getValidator(
      createCouponCodeDto.config.type,
    );

    const validatedConfig = validator.safeParse(createCouponCodeDto.config);

    if (!validatedConfig.success) {
      throw new InvalidCodeConfigError(validatedConfig.error);
    }

    const config = this.verifyCodeConfig(createCouponCodeDto.config);

    const bonus = await this.findBonusForCodeType(config.type);

    if (!bonus) {
      Logger.error(
        `No bonus found for coupon code type ${createCouponCodeDto.config.type}`,
        'CouponCodeService.createCouponCode',
      );
      throw new Error(ErrorMessages.SOMETHING_WENT_WRONG);
    }

    return await this.prismaService.couponCode.create({
      data: {
        createdById: adminId,
        code: createCouponCodeDto.code,
        type: createCouponCodeDto.config.type,
        config,
        stock: createCouponCodeDto.stock,
        expiresAt: createCouponCodeDto.expiresAt,
        bonusId: bonus?.id,
        groups: {
          create: createCouponCodeDto.groups?.map((group) => ({
            group: {
              connect: {
                id: group.id,
              },
            },
          })),
        }
      },
    });
  }

  private verifyCodeConfig(config: AddCodeConfig): AddCodeConfig {
    if (config.type === CouponCodeTypes.FLAT_BALANCE) {
      const isRolloverConfigSet =
        !!config.rolloverPercentage ||
        !!config.rolloverExpiryTime ||
        !!config.rolloverTargetMultiplier;
      const isRolloverConfigError = rolloverConfigSchema.safeParse(config);

      if (isRolloverConfigSet && !isRolloverConfigError.success) {
        throw new InvalidCodeConfigError(isRolloverConfigError.error);
      }
    }
    return config;
  }

  private async findBonusForCodeType(
    type: CouponCodeType,
  ): Promise<Bonus | undefined> {
    const bonuses = await this.bonusService.findByTriggerConfigType({
      triggerConfigType: BonusTriggerConfigTypes.COUPON_CODE,
    });

    switch (type) {
      case CouponCodeTypes.FLAT_BALANCE:
        return bonuses.find((bonus) =>
          bonus.bonusTriggerProducerConfig.some(
            (config) =>
              config.type === BonusTriggerConfigTypes.COUPON_CODE_FLAT,
          ),
        );
      case CouponCodeTypes.NEXT_DEPOSIT_WITHDRAWABLE:
        return bonuses.find((bonus) =>
          bonus.bonusTriggerProducerConfig.some(
            (config) =>
              config.type ===
              BonusTriggerConfigTypes.COUPON_CODE_NEXT_DEPOSIT_WITHDRAWABLE,
          ),
        );
      case CouponCodeTypes.NEXT_DEPOSIT:
        return bonuses.find((bonus) =>
          bonus.bonusTriggerProducerConfig.some(
            (config) =>
              config.type === BonusTriggerConfigTypes.COUPON_CODE_NEXT_DEPOSIT,
          ),
        );
    }
  }

  async updateCouponCode(
    id: number,
    updateCouponCodeDto: UpdateCouponCodeDto,
  ): Promise<CouponCode> {
    const foundCodeCoupon = await this.prismaService.couponCode.findUnique({
      where: {
        id,
      },
    });

    if (!foundCodeCoupon) {
      throw new CouponCodeNotFoundError();
    }
    // Check if the code config type is the same as the one in the database
    this.verifyConfigUpdate(updateCouponCodeDto, foundCodeCoupon);

    await this.verifyCodeNameUpdate(updateCouponCodeDto, foundCodeCoupon);

    if (updateCouponCodeDto.config) {
      const validator = CouponCodeValidators.getValidator(
        updateCouponCodeDto.config.type,
      );

      const validatedConfig = validator.safeParse(updateCouponCodeDto.config);

      if (!validatedConfig.success) {
        throw new InvalidCodeConfigError(validatedConfig.error);
      }
    }

    return await this.prismaService.$transaction(async (transaction) => {
      return await transaction.couponCode.update({
        where: {
          id,
        },
        data: {
          code: updateCouponCodeDto.code,
          config: {
            ...(foundCodeCoupon.config as CouponCodeConfig),
            ...updateCouponCodeDto.config,
          },
          stock: updateCouponCodeDto.stock,
          expiresAt: updateCouponCodeDto.expiresAt,
          groups: {
            deleteMany: {},
            create: updateCouponCodeDto.groups?.map((group) => ({
              group: {
                connect: {
                  id: group.id,
                },
              },
            })),
          },
        },
      });
    });
  }

  private async verifyCodeNameUpdate(
    updateCouponCodeDto: UpdateCouponCodeDto,
    foundCodeCoupon: CouponCode,
  ): Promise<void> {
    if (
      updateCouponCodeDto.code &&
      updateCouponCodeDto.code !== foundCodeCoupon.code
    ) {
      const foundCodeCouponByCode =
        await this.prismaService.couponCode.findUnique({
          where: {
            code: updateCouponCodeDto.code,
          },
        });

      if (foundCodeCouponByCode) {
        throw new DuplicateCodeError();
      }
    }
  }

  private verifyConfigUpdate(
    updateCouponCodeDto: UpdateCouponCodeDto,
    foundCodeCoupon: CouponCode,
  ): void {
    if (
      updateCouponCodeDto.config &&
      updateCouponCodeDto.config.type !==
        (foundCodeCoupon.config as CouponCodeConfig).type
    ) {
      throw new InvalidCodeConfigError(
        ErrorMessages.COUPON_CODE_CONFIG_CHANGE_NOT_ALLOWED,
      );
    }
  }

  async disableCouponCode(id: number): Promise<CouponCode> {
    return await this.prismaService.couponCode.update({
      where: {
        id,
      },
      data: {
        disabledAt: DateTime.now().toISO(),
      },
    });
  }

  async enableCouponCode(id: number): Promise<CouponCode> {
    return await this.prismaService.couponCode.update({
      where: {
        id,
      },
      data: {
        disabledAt: null,
      },
    });
  }

  async deleteCouponCode(id: number): Promise<CouponCode> {
    const foundCodeCouponAndRedeems =
      await this.prismaService.couponCode.findUnique({
        include: {
          couponCodeRedeems: true,
        },
        where: {
          id,
        },
      });

    if (!foundCodeCouponAndRedeems) {
      throw new BadRequestException(ErrorMessages.COUPON_CODE_NOT_FOUND);
    }

    if (foundCodeCouponAndRedeems.couponCodeRedeems.length > 0) {
      throw new BadRequestException(
        ErrorMessages.COUPON_CODE_REDEEMED_BY_USERS,
      );
    }

    return await this.prismaService.couponCode.delete({
      where: {
        id,
      },
    });
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async filterCouponCodes(
    filterCouponCodesDto: FilterCouponCodesDto,
  ): Promise<PagePaginationResponse<CouponCodeReport>> {
    const whereConditions = [];
    const havingConditions = [];

    if (filterCouponCodesDto.creatorNickname) {
      whereConditions.push(
        `u.nickname ILIKE '%${filterCouponCodesDto.creatorNickname}'`,
      );
    }

    if (filterCouponCodesDto.code) {
      whereConditions.push(`cc.code ILIKE '%${filterCouponCodesDto.code}%'`);
    }

    if (filterCouponCodesDto.type) {
      whereConditions.push(`cc.type = ${filterCouponCodesDto.type}}`);
    }

    if (filterCouponCodesDto.minAmount) {
      whereConditions.push(
        `(cc.config->>'rewardAmount')::int >= ${filterCouponCodesDto.minAmount}`,
      );
    }

    if (filterCouponCodesDto.maxAmount) {
      whereConditions.push(
        `(cc.config->>'rewardAmount')::int <= ${filterCouponCodesDto.maxAmount}`,
      );
    }

    if (filterCouponCodesDto.minCurrentStock) {
      whereConditions.push(
        `cc.stock >= ${filterCouponCodesDto.minCurrentStock}`,
      );
    }

    if (filterCouponCodesDto.maxCurrentStock) {
      whereConditions.push(
        `cc.stock <= ${filterCouponCodesDto.maxCurrentStock}`,
      );
    }

    if (filterCouponCodesDto.minTotalStock) {
      havingConditions.push(
        `(cc.stock + COUNT(ccr.redeemer_id)) >= ${filterCouponCodesDto.minTotalStock}`,
      );
    }

    if (filterCouponCodesDto.maxTotalStock) {
      havingConditions.push(
        `(cc.stock + COUNT(ccr.redeemer_id)) <= ${filterCouponCodesDto.maxTotalStock}`,
      );
    }

    if (filterCouponCodesDto.minExpiryDate) {
      whereConditions.push(
        `cc.expires_at >= '${filterCouponCodesDto.minExpiryDate.toISOString()}'`,
      );
    }

    if (filterCouponCodesDto.maxExpiryDate) {
      whereConditions.push(
        `cc.expires_at <= '${filterCouponCodesDto.maxExpiryDate.toISOString()}'`,
      );
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
    const havingClause =
      havingConditions.length > 0
        ? `HAVING ${havingConditions.join(' AND ')}`
        : '';

    const [filterResult, countResult] = await Promise.all([
      this.prismaService.$queryRaw<
        {
          creator_nickname: string;
          id: number;
          code: string;
          type: number;
          amount: number;
          config: JsonValue;
          current_stock: number;
          total_stock: number;
          expires_at: Date;
          disabled_at: Date;
          created_at: Date;
          groups: {
              id: number;
              name: string;
          }[];
        }[]
      >(Prisma.sql`
        SELECT 
          u.nickname as creator_nickname,
          cc.id,
          cc.code,
          cc.type,
          cc.config,
          cc.stock as current_stock,
          cc.stock + COUNT(ccr.redeemer_id) as total_stock,
          cc.expires_at,
          cc.disabled_at,
          cc.created_at,
          ARRAY_REMOVE(
          ARRAY_AGG(
            DISTINCT jsonb_build_object('id', cg.id, 'name', cg.name)
          ), 
          NULL
        ) AS groups
        FROM 
          coupon_codes AS cc
        LEFT JOIN 
          coupon_code_redeems AS ccr ON cc.id = ccr.coupon_code_id
        JOIN 
          users AS u ON cc.created_by_id = u.id
        LEFT JOIN 
          coupon_code_on_group AS ccg ON ccg.coupon_code_id = cc.id AND ccg.deleted_at IS NULL
        LEFT JOIN 
          coupon_group AS cg ON cg.id = ccg.group_id AND cg.deleted_at IS NULL
        ${Prisma.raw(whereClause)}
        GROUP BY 
          cc.id, u.nickname
        ${Prisma.raw(havingClause)}
        ORDER BY 
          cc.created_at DESC
        LIMIT ${filterCouponCodesDto.limit}
        OFFSET ${(filterCouponCodesDto.page - 1) * filterCouponCodesDto.limit}
      `),
      this.prismaService.$queryRaw<{ count: number }[] | undefined>(Prisma.sql`
        SELECT 
          COUNT(*) AS count
        FROM (
          SELECT 
            DISTINCT cc.id
          FROM 
            coupon_codes AS cc
          LEFT JOIN 
            coupon_code_redeems AS ccr ON cc.id = ccr.coupon_code_id
          JOIN 
            users AS u ON cc.created_by_id = u.id
          ${Prisma.raw(whereClause)}
          GROUP BY 
            cc.id
          ${Prisma.raw(havingClause)}
        ) AS subquery;
      `),
    ]);

    return {
      data: filterResult.map((entry) => {
        const couponReport: CouponCodeReport = {
          id: entry.id,
          code: entry.code,
          type: entry.type,
          config: entry.config as CouponCodeConfig,
          stock: entry.current_stock,
          totalStock: Number(entry.total_stock),
          expiresAt: entry.expires_at,
          disabledAt: entry.disabled_at,
          createdAt: entry.created_at,
          createdBy: {
            nickname: entry.creator_nickname,
          },
          groups: entry.groups.filter(g => !!g.id && !!g.name) ?? []
        };
        return couponReport;
      }),
      total: Number(countResult?.[0]?.count || 0),
      limit: filterCouponCodesDto.limit as number,
      page: filterCouponCodesDto.page as number,
    };
  }

  async filterCouponCodeRedeems(
    filterCouponCodeRedeemsDto: FilterCouponCodeRedeemsDto,
  ): Promise<PagePaginationResponse<CouponCodeRedeemReport>> {
    const whereClause: Prisma.CouponCodeRedeemWhereInput = {
      redeemer: {
        id: {
          contains: filterCouponCodeRedeemsDto.casinoPlayerId,
          mode: 'insensitive',
        },
        wallet: {
          contains: filterCouponCodeRedeemsDto.redeemerWallet,
          mode: 'insensitive',
        },
      },
      couponCode: {
        code: {
          contains: filterCouponCodeRedeemsDto.code,
          mode: 'insensitive',
        },
      },
      createdAt: {
        gte: filterCouponCodeRedeemsDto.minRedeemDate,
        lte: filterCouponCodeRedeemsDto.maxRedeemDate,
      },
    };

    const [filterResult, countResult] = await Promise.all([
      await this.prismaService.couponCodeRedeem.findMany({
        where: whereClause,
        select: couponCodeRedeemReportSelect.select,
        take: filterCouponCodeRedeemsDto.limit,
        skip:
          (filterCouponCodeRedeemsDto.page - 1) *
          filterCouponCodeRedeemsDto.limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      await this.prismaService.couponCodeRedeem.count({
        where: whereClause,
      }),
    ]);

    return {
      data: filterResult.map((entry) => {
        return {
          ...entry,
          couponCode: {
            ...entry.couponCode,
            amount: (entry.couponCode.config as any)?.amount as number,
          },
        };
      }),
      total: countResult,
      limit: filterCouponCodeRedeemsDto.limit,
      page: filterCouponCodeRedeemsDto.page,
    };
  }

  async getCouponCodeRedeems(
    userId: string,
    _paginationQuery: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<UserCouponCodeRedeems>> {
    const getResult = await this.prismaService.couponCodeRedeem.findMany({
      where: { redeemerId: userId },
      select: userCouponCodeRedeemsSelect.select,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: getResult,
      total: getResult.length,
      limit: getResult.length,
      page: 1,
    };
  }

  async getCouponCodeRedeem(id: number): Promise<UserCouponCodeRedeems | null> {
    return await this.prismaService.couponCodeRedeem.findUnique({
      where: { id },
      select: userCouponCodeRedeemsSelect.select,
    });
  }
}
