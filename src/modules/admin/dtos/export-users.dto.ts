import { createZodDto } from '@common/helper/create-zod-dto';
import { DateTime } from 'luxon';
import { z } from 'zod';

export const ExportUsersSchema = z.object({
  username: z
    .string()
    .optional()
    .transform((val) => val?.replace(/[^a-zA-Z0-9]/g, '') || undefined),
  startRegisterDate: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (!DateTime.fromISO(data).isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid start register date',
        });
        return z.NEVER;
      }

      return data;
    })
    .transform((data) =>
      data ? DateTime.fromISO(data).toJSDate() : undefined,
    ),
  endRegisterDate: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (!DateTime.fromISO(data).isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid end register date',
        });
        return z.NEVER;
      }

      return data;
    })
    .transform((data) =>
      data ? DateTime.fromISO(data).toJSDate() : undefined,
    ),
});

export class ExportUsersDto extends createZodDto(ExportUsersSchema) {}
