import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const GetCouponCodeRedeemsSchema = z.object({
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

export class GetCouponCodeRedeemsDto extends createZodDto(
  GetCouponCodeRedeemsSchema,
) {}
