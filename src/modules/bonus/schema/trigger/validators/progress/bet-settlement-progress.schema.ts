import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';
import { BonusTriggerConfigSchema } from '@modules/bonus/schema/trigger/validators/trigger-config';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const BetSettlementProgressTriggerConfigSchema =
  BonusTriggerConfigSchema.pick({
    providerId: true,
    category: true,
    gameId: true,
    sportId: true,
    rolloverPercentage: true,
    minOdds: true,
    maxOdds: true,
  });

export const BonusTriggerConfigBetSettlementProgressSchema = z.object({
  type: z.literal(
    BonusTriggerConfigTypes.BET_SETTLEMENT,
    zodErrorMessage(ValidationErrorMessages.NOT_AN_ENUM_MEMBER),
  ),
  triggerId: z
    .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
    .min(1, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL),
  target: BonusTriggerTargetSchema,
  config: BetSettlementProgressTriggerConfigSchema,
});
