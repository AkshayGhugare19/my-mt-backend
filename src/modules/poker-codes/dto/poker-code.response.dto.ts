import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const PokerCodeResponseSchema = z.object({
  id: z.number(),
  code: z.string(),
  useLimit: z.number(),
  reuseLimit: z.number(),
  expiresAt: z.date(),
  rangeFrom: z.number({ coerce: true }),
  rangeTo: z.number({ coerce: true }),
  createdAt: z.date(),
  status: z.enum(['ACTIVE, DISABLED, EXPIRED']),
  createdBy: z.object({
    id: z.string(),
    nickname: z.string().nullable(),
    wallet: z.string().nullable(),
  }),
  isInUse: z.boolean(),
  usesLeft: z.number(),
  isHighRoller: z.boolean(),
});

@ZodDto()
export class PokerCodeResponseDto extends createZodDto(
  PokerCodeResponseSchema,
) {
  constructor(data: PokerCodeResponseDto) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

export type PokerCodeResponse = z.infer<typeof PokerCodeResponseSchema>;
