import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';
import { BonusTriggerConfigSchema } from '@modules/bonus/schema/trigger/validators/trigger-config';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const AdminManualProducerTriggerConfigSchema =
  BonusTriggerConfigSchema.pick({});

export const BonusTriggerConfigAdminManualProducerSchema = z.object({
  type: z.literal(
    BonusTriggerConfigTypes.ADMIN_MANUAL,
    zodErrorMessage(ValidationErrorMessages.NOT_AN_ENUM_MEMBER),
  ),
  triggerId: z
    .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
    .min(1, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL),
  target: BonusTriggerTargetSchema,
  config: AdminManualProducerTriggerConfigSchema,
});
