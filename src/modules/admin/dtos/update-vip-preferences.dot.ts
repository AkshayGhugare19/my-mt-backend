import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const UpdateVipPreferencesSchema = z.object({
  isBonusEnabled: z.boolean().optional(),
});

export class UpdateVipPreferencesDto extends createZodDto(
  UpdateVipPreferencesSchema,
) {}
