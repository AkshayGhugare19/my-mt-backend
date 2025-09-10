import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { UserRoleSchema } from '@modules/role/enum/role.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { DateTime } from 'luxon';

export const GetAllUsersFilteredSchema = z.object({
  username: z
    .string()
    .optional()
    .transform((val) => val?.replace(/[^a-zA-Z0-9]/g, '') || undefined),
  roles: z
    .union([
      UserRoleSchema.array().min(1),
      z
        .string()
        .transform((value) => {
          try {
            return JSON.parse(value);
          } catch (error) {}
          return z.NEVER;
        })
        .superRefine((data, cx) => {
          if (!Array.isArray(data)) {
            cx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['roles'],
              message: 'Roles must be an array',
            });
            return z.NEVER;
          }
          const parsed = UserRoleSchema.array().min(1).safeParse(data);
          if (parsed.success) return parsed.data;

          cx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['roles'],
            message: 'Invalid roles',
          });
          return z.NEVER;
        })
        .optional(),
    ])
    .optional(),
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
  page: z.number({ coerce: true }).optional().default(1),
  limit: z.number({ coerce: true }).optional().default(10),
});

@ZodDto()
export class GetAllUsersFilteredQuery extends createZodDto(
  GetAllUsersFilteredSchema,
) {
  constructor(data: GetAllUsersFilteredQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
