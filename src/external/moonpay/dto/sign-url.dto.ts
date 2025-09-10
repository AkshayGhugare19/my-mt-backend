import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const MoonPaySignUrlSchema = z.object({
  url: z.string(),
});

@ZodDto()
export class MoonPaySignUrlDto extends createZodDto(MoonPaySignUrlSchema) {
  constructor(data?: MoonPaySignUrlDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export type MoonPaySignUrl = z.infer<typeof MoonPaySignUrlSchema>;
