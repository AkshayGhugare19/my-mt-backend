import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const UploadPokerRakeSchema = z.object({
  data: z
    .array(
      z.object({
        userId: z.string(),
        pokerPlayerId: z.string(),
        rake: z.number(),
      }),
    )
    .min(1, 'Empty data'),
});

export class UploadPokerRakeDto extends createZodDto(UploadPokerRakeSchema) {}
