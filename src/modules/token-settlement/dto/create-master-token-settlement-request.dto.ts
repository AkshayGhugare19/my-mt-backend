import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateMasterTokenSettlementRequestSchema = z.object({
  targetId: z.string().cuid().optional(),
  amount: z.number({ coerce: true }).min(1).optional(),
});

@ZodDto()
export class CreateMasterTokenSettlementRequestDto extends createZodDto(
  CreateMasterTokenSettlementRequestSchema,
) {
  constructor(data: CreateMasterTokenSettlementRequestDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
