import { createZodDto } from '@common/helper/create-zod-dto';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { CouponCodeRedeemReport } from '@modules/coupon-code/types';
import { z } from 'zod';

export const CouponCodeRedeemAdminSchema = z.object({
  createdAt: z.date(),
  consumed: z.boolean(),
  couponCode: z.object({
    id: z.number(),
    code: z.string(),
    amount: z.number().nullable(),
  }),
  redeemer: z.object({
    id: z.string(),
    nickname: z.string().nullable(),
    wallet: z.string().nullable(),
  }),
  bonusProgress: z.object({
    currentProgress: z.number().nullable(),
    targetProgress: z.number().nullable(),
  }).optional(),
});

export class CouponCodeRedeemAdminDto extends createZodDto(
  CouponCodeRedeemAdminSchema,
) {
  constructor(data: CouponCodeRedeemAdminDto) {
    super();
    Object.assign(this, data);
  }

  static from(data: CouponCodeRedeemReport): CouponCodeRedeemAdminDto {
    return new CouponCodeRedeemAdminDto({
      createdAt: data.createdAt,
      consumed: data.consumed,
      couponCode: {
        id: data.couponCode.id,
        code: data.couponCode.code,
        amount: (data.couponCode.config as CouponCodeConfig).rewardAmount,
      },
      redeemer: {
        id: data.redeemer.id,
        nickname: data.redeemer.nickname,
        wallet: data.redeemer.wallet,
      },
      bonusProgress: data.bonusProgress
        ? {
            currentProgress: data.bonusProgress.currentProgress,
            targetProgress: data.bonusProgress.targetProgress,
          }
        : undefined,
    });
  }
}
