import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const TokenRequestPrepaidStatuses = {
  FULL: 'FULL',
  PARTIAL: 'PARTIAL',
  POST_PAID: 'POSTPAID',
};

export type TokenRequestPrepaidStatus = EnumValues<
  typeof TokenRequestPrepaidStatuses
>;
export const TokenRequestPrepaidStatusSchema = z.enum(
  getValues(TokenRequestPrepaidStatuses),
);
