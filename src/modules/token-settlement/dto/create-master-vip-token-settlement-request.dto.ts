import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateMasterVipTokenSettlementRequestSchema = z.object({
  targetId: z.string().cuid().optional(),
  amount: z.number({ coerce: true }).min(1).optional(),
});

@ZodDto()
export class CreateMasterVipTokenSettlementRequest extends createZodDto(
  CreateMasterVipTokenSettlementRequestSchema,
) {
  constructor(data: CreateMasterVipTokenSettlementRequest) {
    super();
    if (data) Object.assign(this, data);
  }
}
