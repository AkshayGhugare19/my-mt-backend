import { extendApi } from '@anatine/zod-openapi';
import { BonusRewardTypes, BonusTypes } from '@modules/bonus/enum';
import { CouponCodeTypes } from '@modules/coupon-code/enum/coupon-code-type.enum';
import {
  CodeConfigSchema,
  minDepositAmountSchema,
  rolloverExpiryTimeSchema,
  rolloverPercentageSchema,
  rolloverTargetMultiplierSchema,
  withdrawAfterRolloverSchema,
} from '@modules/coupon-code/schema/validator/code-config.validator';
import { z } from 'zod';

export const NextDepositWithdrawableCodeConfigValidatorSchema = extendApi(
  CodeConfigSchema.pick({
    rewardAmount: true,
    rewardType: true,
  }).extend({
    type: z
      .literal(CouponCodeTypes.NEXT_DEPOSIT_WITHDRAWABLE, {
        message: 'Invalid type',
      })
      .describe('2: Next deposit withdrawable'),
    rewardType: z
      .literal(BonusRewardTypes.FLAT)
      .describe('The type of the reward')
      .optional()
      .default(BonusRewardTypes.FLAT),
    bonusType: z
      .literal(BonusTypes.PROGRESS)
      .describe('The type of the bonus')
      .optional()
      .default(BonusTypes.PROGRESS),
    withdrawAfterRollover: withdrawAfterRolloverSchema.optional().default(true),
    rolloverPercentage: rolloverPercentageSchema.optional().default(55),
    rolloverExpiryTime: rolloverExpiryTimeSchema.optional(),
    rolloverTargetMultiplier: rolloverTargetMultiplierSchema,
    minDepositAmount: minDepositAmountSchema,
  }),
  {
    hideDefinitions: ['withdrawAfterRollover', 'rewardType'],
  },
);

export type NextDepositWithdrawableCodeConfigValidator = z.infer<
  typeof NextDepositWithdrawableCodeConfigValidatorSchema
>;
