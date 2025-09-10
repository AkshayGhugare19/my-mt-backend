import { z } from 'zod';
import { BonusTriggerValidators } from '@modules/bonus/schema/trigger';
import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import {
  BonusTriggerTargets,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';

export const AddBonusTriggerProducerConfigSchema = zDiscriminatedUnion('type', [
  BonusTriggerValidators.producers.adminManual.extend({
    target: BonusTriggerTargetSchema.nullable().default(
      BonusTriggerTargets.GLOBAL,
    ),
  }),
  BonusTriggerValidators.producers.deposit.extend({
    target: BonusTriggerTargetSchema.nullable().default(
      BonusTriggerTargets.GLOBAL,
    ),
  }),
  BonusTriggerValidators.producers.cashback.extend({
    target: BonusTriggerTargetSchema.nullable().default(
      BonusTriggerTargets.GLOBAL,
    ),
  }),
  BonusTriggerValidators.producers.rakeback.extend({
    target: BonusTriggerTargetSchema.nullable().default(
      BonusTriggerTargets.GLOBAL,
    ),
  }),
]);

export type AddBonusTriggerProducerConfig = z.infer<
  typeof AddBonusTriggerProducerConfigSchema
>;
