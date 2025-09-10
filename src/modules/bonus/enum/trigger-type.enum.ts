import { extendApi } from '@anatine/zod-openapi';
import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const BonusTriggerTypes = {
  CONSUMER: 'consumer',
  PRODUCER: 'producer',
  PROGRESS: 'progress',
} as const;

export type BonusTriggerType = EnumValues<typeof BonusTriggerTypes>;
export const BonusTriggerTypeSchema = extendApi(
  z.enum(getValues(BonusTriggerTypes)),
);
