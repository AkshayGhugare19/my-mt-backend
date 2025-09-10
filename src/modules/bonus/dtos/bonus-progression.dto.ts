import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { BonusDto, BonusSchema } from '@modules/bonus/dtos/bonus-dto';
import {
  BonusProgressStatus,
  BonusProgressStatusSchema,
} from '@modules/bonus/enum';
import { UserBonusProgressionWithBonusAndCodes } from '@modules/bonus/types';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { z } from 'zod';

export const BonusProgressionSchema = z.object({
  bonus: BonusSchema,
  userId: z.string(),
  target: z.number(),
  current: z.number(),
  status: BonusProgressStatusSchema,
  rewardAmount: z.number(),
  remainingBalance: z.number().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  claimedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
});

@ZodDto()
export class BonusProgressionDto extends createZodDto(BonusProgressionSchema) {
  constructor(data: BonusProgressionDto) {
    super();
    Object.assign(this, data);
  }

  static from(
    data: UserBonusProgressionWithBonusAndCodes,
  ): BonusProgressionDto {
    const configOverride = (data.configOverride as CouponCodeConfig) ?? {};

    return new BonusProgressionDto({
      createdAt: data.createdAt,
      claimedAt: data.claimedAt,
      expiresAt: data.expiresAt,
      userId: data.userId,
      target: data.targetProgress,
      rewardAmount: decimalToNumber(data.rewardAmount),
      remainingBalance: data.bonusBalance?.balance
        ? decimalToNumber(data.bonusBalance?.balance)
        : 0,
      current: data.currentProgress,
      status: data.status as BonusProgressStatus,
      bonus: BonusDto.from({
        ...data?.bonus,
        name: data?.couponCodeRedeem?.couponCode?.code ?? data?.bonus?.name,
        bonusExpiryTime:
          configOverride.bonusExpiryTime ?? data.bonus?.bonusExpiryTime,
        maxReward: new Decimal(
          configOverride.maxRewardAmount ?? data.bonus?.maxReward ?? 0,
        ),
        rewardAmount: new Decimal(
          configOverride.rewardAmount ?? data.bonus?.rewardAmount ?? 0,
        ),
        rolloverAmount: new Decimal(
          configOverride.rolloverTargetMultiplier ??
            data.bonus?.rolloverAmount ??
            0,
        ),
        rolloverExpiryTime:
          configOverride.rolloverExpiryTime ??
          data.bonus?.rolloverExpiryTime ??
          0,
        withdrawAfterRollover:
          configOverride.withdrawAfterRollover ??
          data.bonus?.withdrawAfterRollover,
        rolloverType: data.bonus?.rolloverType,
        rewardType: configOverride.rewardType ?? data.bonus?.rewardType,
        type: configOverride.bonusType ?? data.bonus?.type,
      }),
      deletedAt: data.deletedAt,
    });
  }
}
