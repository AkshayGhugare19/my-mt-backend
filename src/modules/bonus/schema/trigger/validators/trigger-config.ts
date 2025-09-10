import { extendApi } from '@anatine/zod-openapi';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const BonusTriggerConfigSchema = extendApi(
  z.object({
    minAmount: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    maxAmount: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    depositCount: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    minDepositCount: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    maxDepositCount: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    sportId: z
      .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
      .optional(),
    providerId: z
      .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
      .optional(),
    category: z
      .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
      .optional(),
    gameId: z
      .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
      .optional(),
    rolloverPercentage: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .optional(),
    minOdds: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .optional(),
    maxOdds: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .optional(),
    // time between runs in hours
    timeBetweenRuns: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .min(1, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    runHour: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .max(23, ValidationErrorMessages.INPUT_VALUE_TOO_BIG)
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL)
      .optional(),
    // time between runs in days
    lossRewardDayRange: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .optional(),
    startDate: z
      .date(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_VALID_DATE))
      .optional(),
    dayRange: z
      .number(
        zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER, true),
      )
      .optional(),
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
  }),
);

export type BonusTriggerConfig = z.infer<typeof BonusTriggerConfigSchema>;
