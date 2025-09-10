import { zBooleanMapObject } from '@common/validation/z-boolean-map-object';
import { BonusTriggerTargetSchema } from '@modules/bonus/enum';
import { BonusTriggerConfigSchema } from '@modules/bonus/schema/trigger/validators';
import { z } from 'zod';

export const BonusTriggerOptionsSchema = z.object({
  config: zBooleanMapObject(BonusTriggerConfigSchema),
  targetValue: BonusTriggerTargetSchema.array(),
});

export type BonusTriggerOptions = z.infer<typeof BonusTriggerOptionsSchema>;
