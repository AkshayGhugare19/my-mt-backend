import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const EnableCouponCodeSchema = z.object({
  id: z
    .string()
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

export class EnableCouponCodeDto extends createZodDto(EnableCouponCodeSchema) {}
