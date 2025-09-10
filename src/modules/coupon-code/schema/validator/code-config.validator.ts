import { extendApi } from '@anatine/zod-openapi';
import { BonusRewardTypes, BonusTypes } from '@modules/bonus/enum';
import { CouponCodeSchema } from '@modules/coupon-code/enum/coupon-code-type.enum';
import { z } from 'zod';

export const rolloverPercentageSchema = z
  .number({ coerce: true })
  .min(0)
  .describe(
    'The Win/Loss percentage must be greater than this value to trigger the bonus',
  );

export const rolloverExpiryTimeSchema = z
  .number({ coerce: true })
  .min(0)
  .describe('The time in milliseconds before the rollover progress expires');

export const rolloverTargetMultiplierSchema = z
  .number({ coerce: true })
  .min(1)
  .describe(
    'The multiplier of the rollover target, relative to the reward amount, e.g. 200 means 200%',
  );

export const minDepositAmountSchema = z
  .number({ coerce: true })
  .min(0)
  .describe('The minimum deposit amount to trigger the bonus');

export const rolloverConfigSchema = z.object({
  rolloverPercentage: rolloverPercentageSchema,
  rolloverExpiryTime: rolloverExpiryTimeSchema.optional(),
  rolloverTargetMultiplier: rolloverTargetMultiplierSchema,
});
export const withdrawAfterRolloverSchema = z
  .boolean({ coerce: true })
  .describe(
    'The remaining balance will be moved in the account balance after the rollover',
  )
  .default(true);

export const CodeConfigSchema = extendApi(
  z.object({
    type: CouponCodeSchema,
    rewardAmount: z.number({ coerce: true }).min(0),
    rewardType: z
      .nativeEnum(BonusRewardTypes)
      .describe('The type of the reward'),
    rolloverPercentage: rolloverPercentageSchema.optional(),
    rolloverExpiryTime: rolloverExpiryTimeSchema.optional(),
    rolloverTargetMultiplier: rolloverTargetMultiplierSchema
      .optional()
      .default(1),
    bonusExpiryTime: z
      .number({ coerce: true })
      .min(0)
      .optional()
      .describe('The time in milliseconds before the bonus expires'),
    minDepositAmount: minDepositAmountSchema,
    maxRewardAmount: z.number({ coerce: true }).min(0),
    withdrawAfterRollover: withdrawAfterRolloverSchema,
    bonusType: z.nativeEnum(BonusTypes),
    refillable: z.boolean().optional().default(false),
    maxWithdrawableAmount: z.number({ coerce: true }).min(0).optional().describe('The maximum amount that can be withdrawn from the bonus'),
  }),
  {
    hideDefinitions: ['withdrawAfterRollover', 'refillable'],
  },
);

export type CouponCodeConfig = z.infer<typeof CodeConfigSchema>;
