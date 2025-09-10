import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import {
  CouponCodeType,
  CouponCodeTypes,
} from '@modules/coupon-code/enum/coupon-code-type.enum';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { UserCouponCodeRedeems } from '@modules/coupon-code/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { z } from 'zod';

export const CouponCodeRedeemSchema = z.object({
  type: z.nativeEnum(CouponCodeTypes),
  code: z.string(),
  rewardAmount: z.number(),
  consumed: z.boolean(),
  createdAt: z.date(),
  minDepositAmount: z
    .number()
    .nullable(),
  wageringRequirement: z
    .number()
    .nullable()
    .transform((value) => (value ? value / 100 : null)),
});

@ZodDto()
export class CouponCodeRedeemDto extends createZodDto(CouponCodeRedeemSchema) {
  constructor(data: CouponCodeRedeemDto) {
    super();
    Object.assign(this, data);
  }

  static from(data: UserCouponCodeRedeems): CouponCodeRedeemDto {
    return new CouponCodeRedeemDto(
      CouponCodeRedeemDto.createSafe({
        type: data.couponCode.type as CouponCodeType,
        code: data.couponCode.code,
        consumed: data.consumed,
        createdAt: data.createdAt,
        rewardAmount: decimalToNumber(
          data.bonusProgress?.rewardAmount ??
            (data.couponCode.config as CouponCodeConfig).rewardAmount,
        ),
        minDepositAmount:
          (data.bonusProgress?.configOverride as CouponCodeConfig)
            ?.minDepositAmount ??
          (data?.couponCode?.config as CouponCodeConfig).minDepositAmount ??
          null,
        wageringRequirement:
          (data.bonusProgress?.configOverride as CouponCodeConfig)
            ?.rolloverTargetMultiplier ??
          (data?.couponCode?.config as CouponCodeConfig)
            .rolloverTargetMultiplier ??
          null,
      }),
    );
  }
}
