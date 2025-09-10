import { extendApi } from '@anatine/zod-openapi';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';
import { BonusTriggerConfigSchema } from '@modules/bonus/schema/trigger/validators/trigger-config';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const DepositProducerTriggerConfigSchema = BonusTriggerConfigSchema.pick(
  {
    minAmount: true,
    maxAmount: true,
    depositCount: true,
    minDepositCount: true,
    maxDepositCount: true,
  },
);

export type DepositProducerTriggerConfig = z.infer<
  typeof DepositProducerTriggerConfigSchema
>;

export const BonusTriggerConfigDepositProducerSchema = extendApi(
  z.object({
    type: z.literal(BonusTriggerConfigTypes.DEPOSIT),
    triggerId: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(1, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL),
    target: BonusTriggerTargetSchema,
    config: DepositProducerTriggerConfigSchema,
  }),
);
