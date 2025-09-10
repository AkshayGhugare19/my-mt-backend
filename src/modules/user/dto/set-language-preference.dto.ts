import { createZodDto } from '@anatine/zod-nestjs';
import { UserPreferencesLanguages } from '@infrastructure/database/prisma/constants';
import { z } from 'zod';

export const SetLanguagePreferenceSchema = z.object({
  language: z
    .string()
    .refine((value) => Object.values(UserPreferencesLanguages).includes(value)),
});

export class SetLanguagePreferenceDto extends createZodDto(
  SetLanguagePreferenceSchema,
) {}
