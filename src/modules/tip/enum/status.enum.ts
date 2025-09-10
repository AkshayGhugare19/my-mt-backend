import { getValues } from '@common/enums/common';
import { z } from 'zod';

export const TipStatuses = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
} as const;

export const TipStatusSchema = z.enum(getValues(TipStatuses));

export type TipStatus = z.infer<typeof TipStatusSchema>;
