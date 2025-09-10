import { z } from 'zod';
import { BonusTriggerValidators } from '@modules/bonus/schema/trigger';
import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import {
  BonusTriggerTargets,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';

export const AddBonusTriggerConsumerConfigSchema = zDiscriminatedUnion('type', [
  BonusTriggerValidators.consumer.betPlacing.extend({
    target: BonusTriggerTargetSchema.nullable().default(
      BonusTriggerTargets.GLOBAL,
    ),
  }),
]);

export type AddBonusTriggerConsumerConfig = z.infer<
  typeof AddBonusTriggerConsumerConfigSchema
>;
