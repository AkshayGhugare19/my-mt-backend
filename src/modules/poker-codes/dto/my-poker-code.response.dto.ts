import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const MyPokerCodeResponseSchema = z.object({
  id: z.number(),
  code: z.string(),
  reuseLimit: z.number(),
  expiresAt: z.date(),
  createdAt: z.date(),
  status: z.enum(['ACTIVE, DISABLED, EXPIRED']),
});

@ZodDto()
export class MyPokerCodeResponseDto extends createZodDto(
  MyPokerCodeResponseSchema,
) {
  constructor(data: MyPokerCodeResponseDto) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

export type MyPokerCodeResponse = z.infer<typeof MyPokerCodeResponseSchema>;
