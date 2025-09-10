import { z } from 'zod';
import { BonusTriggerValidators } from '@modules/bonus/schema/trigger';
import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import {
  BonusTriggerTargets,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';

export const AddBonusTriggerProgressConfigSchema = zDiscriminatedUnion('type', [
  BonusTriggerValidators.progress.betSettlement.extend({
    target: BonusTriggerTargetSchema.nullable().default(
      BonusTriggerTargets.GLOBAL,
    ),
  }),
]);

export type AddBonusTriggerProgressConfig = z.infer<
  typeof AddBonusTriggerProgressConfigSchema
>;
