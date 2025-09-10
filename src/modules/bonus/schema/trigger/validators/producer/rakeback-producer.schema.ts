import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const RakebackProducerTriggerConfigSchema = z.object({
  startDate: z.date(
    zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_VALID_DATE),
  ),
  runHour: z
    .number(
      zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
    )
    .max(23, ValidationErrorMessages.INPUT_VALUE_TOO_BIG)
    .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL),
  timeBetweenRuns: z
    .number(
      zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
    )
    .min(1, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL),
  dayRange: z.number(
    zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
  ),
  startOffset: z
    .number(
      zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
    )
    .optional(),
  endOffset: z
    .number(
      zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
    )
    .optional(),
});

export type RakebackTriggerConfig = z.infer<
  typeof RakebackProducerTriggerConfigSchema
>;

export const BonusTriggerConfigRakebackProducerSchema = z.object({
  type: z.literal(
    BonusTriggerConfigTypes.RAKEBACK,
    zodErrorMessage(ValidationErrorMessages.NOT_AN_ENUM_MEMBER),
  ),
  triggerId: z
    .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
    .min(1, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL),
  target: BonusTriggerTargetSchema,
  config: RakebackProducerTriggerConfigSchema,
});
