import { extendApi } from '@anatine/zod-openapi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { AddBonusTriggerConsumerConfigSchema } from '@modules/bonus/dtos/add-bonus-trigger-consumer-config';
import { AddBonusTriggerProducerConfigSchema } from '@modules/bonus/dtos/add-bonus-trigger-producer-config';
import { AddBonusTriggerProgressConfigSchema } from '@modules/bonus/dtos/add-bonus-trigger-progress.dto';
import {
  BonusRewardTypeSchema,
  BonusTypeSchema,
  RolloverTypeSchema,
} from '@modules/bonus/enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const CreateBonusSchema = extendApi(
  z.object({
    name: z.string(
      zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING),
    ),
    description: z.string(
      zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING),
    ),
    rewardType: BonusRewardTypeSchema,
    type: BonusTypeSchema,
    limitPerUser: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(1, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    maxReward: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    rewardAmount: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL),
    bonusExpiryTime: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional()
      .describe('in milliseconds'),
    bonusExpiryHour: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .max(23, ValidationErrorMessages.INPUT_VALUE_TOO_BIG)
      .optional()
      .describe('0-23'),
    rolloverType: RolloverTypeSchema.optional(),
    rolloverAmount: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    rolloverExpiryTime: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional()
      .describe('in milliseconds'),
    producerTriggers: extendApi(
      z.array(extendApi(AddBonusTriggerProducerConfigSchema), {
        message: ValidationErrorMessages.NOT_ENOUGH_ARRAY_ITEMS,
      }),
    ),
    progressTriggers: extendApi(
      z.array(extendApi(AddBonusTriggerProgressConfigSchema), {
        message: ValidationErrorMessages.NOT_ENOUGH_ARRAY_ITEMS,
      }),
    ),
    consumerTriggers: extendApi(
      z.array(extendApi(AddBonusTriggerConsumerConfigSchema), {
        message: ValidationErrorMessages.NOT_ENOUGH_ARRAY_ITEMS,
      }),
    ),
  }),
).superRefine((data, cx) => {
  if (data.type === 'progress') {
    if (data.progressTriggers.length === 0) {
      cx.addIssue({
        path: ['progressTriggers'],
        code: z.ZodIssueCode.custom,
        message: ErrorMessages.INVALID_PRODUCER_TRIGGER,
      });
      return z.NEVER;
    }
    if (data.rolloverAmount === undefined) {
      cx.addIssue({
        path: ['rolloverAmount'],
        code: z.ZodIssueCode.custom,
        message: ErrorMessages.INVALID_ROLLOVER_AMOUNT,
      });
      return z.NEVER;
    }
    if (data.rolloverExpiryTime === undefined) {
      cx.addIssue({
        path: ['rolloverExpiryTime'],
        code: z.ZodIssueCode.custom,
        message: ErrorMessages.INVALID_ROLLOVER_EXPIRY_TIME,
      });
      return z.NEVER;
    }
  }
  return data;
});

@ZodDto()
export class CreateBonusDto extends createZodDto(CreateBonusSchema) {
  constructor(data: CreateBonusDto) {
    super();
    Object.assign(this, data);
  }
}

export type CreateBonus = z.infer<typeof CreateBonusSchema>;
