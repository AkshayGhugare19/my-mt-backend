import { extendApi } from '@anatine/zod-openapi';
import { BonusRewardTypes, BonusTypes } from '@modules/bonus/enum';
import { CouponCodeTypes } from '@modules/coupon-code/enum/coupon-code-type.enum';
import {
  CodeConfigSchema,
  minDepositAmountSchema,
  rolloverExpiryTimeSchema,
  rolloverPercentageSchema,
  rolloverTargetMultiplierSchema,
} from '@modules/coupon-code/schema/validator/code-config.validator';
import { z } from 'zod';

export const NextDepositCodeConfigValidatorSchema = extendApi(
  CodeConfigSchema.pick({
    rewardAmount: true,
    maxRewardAmount: true,
    bonusExpiryTime: true,
    rewardType: true,
  }).extend({
    type: z
      .literal(CouponCodeTypes.NEXT_DEPOSIT, {
        message: 'Invalid type',
      })
      .describe('1: Next deposit'),
    rewardType: z
      .literal(BonusRewardTypes.PERCENTAGE)
      .describe('The type of the reward')
      .optional()
      .default(BonusRewardTypes.PERCENTAGE),
    bonusType: z
      .literal(BonusTypes.PROGRESS)
      .describe('The type of the bonus')
      .optional()
      .default(BonusTypes.PROGRESS),
    rolloverPercentage: rolloverPercentageSchema.optional().default(55),
    rolloverExpiryTime: rolloverExpiryTimeSchema.optional(),
    rolloverTargetMultiplier: rolloverTargetMultiplierSchema,
    minDepositAmount: minDepositAmountSchema.optional(),
  }),
  {
    hideDefinitions: ['bonusType', 'rewardType'],
  },
);

export type NextDepositCodeConfigValidator = z.infer<
  typeof NextDepositCodeConfigValidatorSchema
>;
