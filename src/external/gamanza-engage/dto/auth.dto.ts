import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GamanzaEngageAuthEventSchema = z.object({
  identityToken: z.string(),
});

@ZodDto()
export class GamanzaEngageAuthEventDto extends createZodDto(
  GamanzaEngageAuthEventSchema,
) {
  constructor(data?: GamanzaEngageAuthEventDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export type GamanzaEngageAuthEvent = z.infer<
  typeof GamanzaEngageAuthEventSchema
>;
