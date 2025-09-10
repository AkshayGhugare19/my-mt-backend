import { extendApi } from '@anatine/zod-openapi';
import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const BonusProgressStatuses = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type BonusProgressStatus = EnumValues<typeof BonusProgressStatuses>;
export const BonusProgressStatusSchema = extendApi(
  z.enum(getValues(BonusProgressStatuses)),
);
