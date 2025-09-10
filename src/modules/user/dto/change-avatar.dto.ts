import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ChangeAvatarSchema = z.object({
  url: z.string().url().optional(),
  file: z.instanceof(File).optional(),
});

@ZodDto()
export class ChangeAvatarDto extends createZodDto(ChangeAvatarSchema) {
  constructor(data: ChangeAvatarDto) {
    super();
    Object.assign(this, data);
  }
}
