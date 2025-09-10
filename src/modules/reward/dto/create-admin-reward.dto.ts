import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateAdminRewardSchema = z.object({
  amount: z.number(),
  description: z.string().min(3).max(80),
});

@ZodDto()
export class CreateAdminRewardDto extends createZodDto(
  CreateAdminRewardSchema,
) {
  constructor(data: Partial<CreateAdminRewardDto>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
