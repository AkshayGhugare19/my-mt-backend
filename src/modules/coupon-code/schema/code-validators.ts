import {
  CouponCodeType,
  CouponCodeTypes,
} from '@modules/coupon-code/enum/coupon-code-type.enum';
import { FlatBalanceCodeConfigValidatorSchema } from '@modules/coupon-code/schema/validator/flat-balance.validator';
import { NextDepositWithdrawableCodeConfigValidatorSchema } from '@modules/coupon-code/schema/validator/next-deposit-withdrawable.validator';
import { NextDepositCodeConfigValidatorSchema } from '@modules/coupon-code/schema/validator/next-deposit.validator';

export abstract class CouponCodeValidators {
  static configs = {
    [CouponCodeTypes.FLAT_BALANCE]: FlatBalanceCodeConfigValidatorSchema,
    [CouponCodeTypes.NEXT_DEPOSIT]: NextDepositCodeConfigValidatorSchema,
    [CouponCodeTypes.NEXT_DEPOSIT_WITHDRAWABLE]:
      NextDepositWithdrawableCodeConfigValidatorSchema,
  };

  static getValidator<T extends keyof typeof CouponCodeValidators.configs>(
    type: CouponCodeType,
  ): (typeof CouponCodeValidators.configs)[T] {
    const schema = CouponCodeValidators.configs[type as T];

    if (!schema) {
      throw new Error(`No schema found for Coupon code type ${type}`);
    }

    return schema;
  }
}
