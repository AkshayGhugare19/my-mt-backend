import { createZodDto } from '@anatine/zod-nestjs';
import { isPublicKey } from '@metaplex-foundation/umi';
import { isAddress } from 'ethers';
import { DateTime } from 'luxon';
import { TronWeb } from 'tronweb';
import { z } from 'zod';

export const FilterPokerRakeSchema = z.object({
  casinoPlayerId: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (!/^[a-zA-Z0-9]+$/.test(data)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid casino player id',
        });
        return z.NEVER;
      }

      return data;
    }),
  nickname: z.string().optional(),
  wallet: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (!TronWeb.isAddress(data) && !isPublicKey(data) && !isAddress(data)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid wallet address',
        });
        return z.NEVER;
      }

      return data;
    }),
  pokerPlayerId: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (!/^[0-9]+$/.test(data)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid poker player id',
        });
        return z.NEVER;
      }

      return data;
    }),
  startDate: z
    .string()
    .optional()
    .default(DateTime.now().startOf('week').toISO())
    .refine((val) => DateTime.fromISO(val).isValid, {
      message: 'Invalid start date',
    })
    .transform((val) => DateTime.fromISO(val).toJSDate()),
  endDate: z
    .string()
    .optional()
    .default(DateTime.now().endOf('week').toISO())
    .refine((val) => DateTime.fromISO(val).isValid, {
      message: 'Invalid end date',
    })
    .transform((val) => DateTime.fromISO(val).toJSDate()),
  page: z.number({ coerce: true }).optional().default(1),
  limit: z.number({ coerce: true }).optional().default(10),
});

export class FilterPokerRakeDto extends createZodDto(FilterPokerRakeSchema) {}
