import { createZodDto } from '@anatine/zod-nestjs';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { z } from 'zod';

export const CreateCouponGroupSchema = z.object({
  couponCodeIds: z.array(z.number()),
  name: z.string().min(1, 'Group name is required'),
  description: z.string().nullable().optional(),
});

@ZodDto()
export class CreateCouponGroupDto extends createZodDto(CreateCouponGroupSchema) {
  constructor(data: CreateCouponGroupDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
