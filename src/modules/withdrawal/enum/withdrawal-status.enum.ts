import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const WITHDRAWAL_STATUSES = {
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  ACCEPTED: 'ACCEPTED',
  FULFILLED: 'FULFILLED',
  AUTO_ACCEPTED: 'AUTO_ACCEPTED',
  FAILED: 'FAILED',
} as const;

export type WithdrawalStatusType = EnumValues<typeof WITHDRAWAL_STATUSES>;
// export type WithdrawalStatus = WithdrawalStatusType
export const WithdrawalStatusSchema = z.enum(getValues(WITHDRAWAL_STATUSES));
