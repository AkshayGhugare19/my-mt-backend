import { z } from 'zod';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@anatine/zod-nestjs';
import { I18nLanguageCodes } from '@infrastructure/i18n/constants';

export const GetUserNotificationsSchema = z.object({
  page: z.number({ coerce: true }).optional().default(1),
  limit: z.number({ coerce: true }).optional().default(10),
  language: z
    .string()
    .refine((value) => Object.values(I18nLanguageCodes).includes(value), {
      message: 'Invalid language',
    })
    .optional()
    .default(I18nLanguageCodes.EN),
});

@ZodDto()
export class GetUserNotificationsDto extends createZodDto(
  GetUserNotificationsSchema,
) {
  constructor(data: GetUserNotificationsDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
