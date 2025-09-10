import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { Decimal } from '@prisma/client/runtime/library';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateTokenSettlementRequestSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => new Decimal(val)),
});

@ZodDto()
export class CreateTokenSettlementRequestDto extends createZodDto(
  CreateTokenSettlementRequestSchema,
) {
  constructor(data: CreateTokenSettlementRequestDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
