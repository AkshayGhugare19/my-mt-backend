import { extendApi } from '@anatine/zod-openapi';
import { BonusRewardTypes, BonusTypes } from '@modules/bonus/enum';
import { CouponCodeTypes } from '@modules/coupon-code/enum/coupon-code-type.enum';
import {
  CodeConfigSchema,
  rolloverExpiryTimeSchema,
  rolloverPercentageSchema,
  rolloverTargetMultiplierSchema,
  withdrawAfterRolloverSchema,
} from '@modules/coupon-code/schema/validator/code-config.validator';
import { z } from 'zod';

export const FlatBalanceCodeConfigValidatorSchema = extendApi(
  CodeConfigSchema.pick({
    rewardAmount: true,
    bonusType: true,
  }).extend({
    type: z
      .literal(CouponCodeTypes.FLAT_BALANCE, {
        message: 'Invalid type',
      })
      .describe('0: Flat balance'),
    rewardType: z
      .literal(BonusRewardTypes.FLAT)
      .describe('The type of the reward')
      .optional()
      .default(BonusRewardTypes.FLAT),
    bonusType: z
      .literal(BonusTypes.INSTANT)
      .describe('The type of the bonus')
      .optional()
      .default(BonusTypes.INSTANT),
    rolloverPercentage: rolloverPercentageSchema.optional().default(55),
    rolloverExpiryTime: rolloverExpiryTimeSchema.optional(),
    rolloverTargetMultiplier: rolloverTargetMultiplierSchema.optional(),
    withdrawAfterRollover: withdrawAfterRolloverSchema.optional().default(true),
    maxWithdrawableAmount: z.number({ coerce: true }).min(0).optional().describe('The maximum amount that can be withdrawn from the bonus'),
  }),
  {
    hideDefinitions: ['rewardType', 'withdrawAfterRollover', 'bonusType'],
  },
);

export type FlatBalanceCodeConfigValidator = z.infer<
  typeof FlatBalanceCodeConfigValidatorSchema
>;
