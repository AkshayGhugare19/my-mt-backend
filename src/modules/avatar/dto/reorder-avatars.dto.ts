import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ReorderAvatarSchema = z.object({
  order: z.number(),
});

@ZodDto()
export class ReorderAvatarDto extends createZodDto(ReorderAvatarSchema) {
  constructor(data: Partial<ReorderAvatarDto>) {
    super();

    if (data) {
      Object.assign(this, data);
    }
  }
}
