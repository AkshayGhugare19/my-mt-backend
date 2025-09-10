import { createZodDto } from '@anatine/zod-nestjs';
import { UserPreferencesExchangeWidgetPairs } from '@infrastructure/database/prisma/constants';
import { z } from 'zod';

export const SetExchangeWidgetPairPreferenceSchema = z.object({
  pair: z
    .string()
    .refine((value) =>
      Object.values(UserPreferencesExchangeWidgetPairs).includes(value),
    ),
});

export class SetExchangeWidgetPairPreferenceDto extends createZodDto(
  SetExchangeWidgetPairPreferenceSchema,
) {}
