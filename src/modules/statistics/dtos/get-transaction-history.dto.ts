import { createZodDto } from '@anatine/zod-nestjs';
import {
  TransactionStatus,
  TransactionStatuses,
} from '@modules/transaction-ledger/enum/status.enum';
import { DateTime } from 'luxon';
import { z } from 'zod';
import {
  TransactionsHistoryCounterParties,
  TransactionsHistoryCounterParty,
} from '../enum/statistics-transaction.enum';

export const GetTransactionHistorySchema = z.object({
  type: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (
        !Object.values(TransactionsHistoryCounterParties).includes(
          data as TransactionsHistoryCounterParty,
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid type',
        });
        return z.NEVER;
      }

      return data;
    }),
  status: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (
        !Object.values(TransactionStatuses).includes(data as TransactionStatus)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid status',
        });
        return z.NEVER;
      }

      return data;
    }),
  startDate: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (!DateTime.fromISO(data).isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid start date',
        });
        return z.NEVER;
      }

      return data;
    })
    .transform((data) =>
      data ? DateTime.fromISO(data).toJSDate() : undefined,
    ),
  endDate: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (!DateTime.fromISO(data).isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid end date',
        });
        return z.NEVER;
      }

      return data;
    })
    .transform((data) =>
      data ? DateTime.fromISO(data).toJSDate() : undefined,
    ),
  page: z
    .string()
    .default('1')
    .superRefine((data, ctx) => {
      if (isNaN(Number(data))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid id',
        });
        return z.NEVER;
      }

      return data;
    })
    .transform((data) => Number(data)),
  limit: z
    .string()
    .default('10')
    .superRefine((data, ctx) => {
      if (isNaN(Number(data))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid id',
        });
        return z.NEVER;
      }

      return data;
    })
    .transform((data) => Number(data)),
});

export class GetTransactionHistoryDto extends createZodDto(
  GetTransactionHistorySchema,
) {}
