import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UpdateVipLimitsSchema = z.object({
  vipId: z.string(),
  maxBetSize: z.number().optional(),
});

@ZodDto()
export class UpdateVipLimitsDto extends createZodDto(UpdateVipLimitsSchema) {
  constructor(data: UpdateVipLimitsDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
