import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UpdateMasterLimitsSchema = z.object({
  masterId: z.string(),
  maxExposurePerVip: z.number().optional(),
  maxNumberOfUsers: z.number().optional(),
});

@ZodDto()
export class UpdateMasterLimitsDto extends createZodDto(
  UpdateMasterLimitsSchema,
) {
  constructor(data: UpdateMasterLimitsDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
