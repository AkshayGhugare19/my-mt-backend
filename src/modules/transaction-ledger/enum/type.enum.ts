import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const TransactionOperationTypes = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
  RESTORE: 'RESTORE',
} as const;

export type TransactionOperationType = EnumValues<
  typeof TransactionOperationTypes
>;
export const TransactionOperationTypeSchema = z.enum(
  getValues(TransactionOperationTypes),
);
