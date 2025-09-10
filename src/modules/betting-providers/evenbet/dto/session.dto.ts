import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const EvenBetSessionSchema = z.object({
  sessionId: z.string(),
  redirectUrl: z.string(),
});

@ZodDto()
export class EvenBetSessionDto extends createZodDto(EvenBetSessionSchema) {
  constructor(data?: EvenBetSessionDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export type EvenBetSession = z.infer<typeof EvenBetSessionSchema>;
