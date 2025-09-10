import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import { CouponCodeTypes } from '@modules/coupon-code/enum/coupon-code-type.enum';
import { CouponCodeValidators } from '@modules/coupon-code/schema/code-validators';
import { z } from 'zod';

export const AddCodeConfigSchema = zDiscriminatedUnion('type', [
  CouponCodeValidators.configs[CouponCodeTypes.FLAT_BALANCE],
  CouponCodeValidators.configs[CouponCodeTypes.NEXT_DEPOSIT],
  CouponCodeValidators.configs[CouponCodeTypes.NEXT_DEPOSIT_WITHDRAWABLE],
]);

export type AddCodeConfig = z.infer<typeof AddCodeConfigSchema>;
