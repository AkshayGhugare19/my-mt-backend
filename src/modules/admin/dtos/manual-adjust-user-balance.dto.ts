import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { Decimal } from '@prisma/client/runtime/library';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ManualUpdateMasterBalanceSchema = z.object({
  amount: z
    .number({ coerce: true })
    .positive()
    .or(z.number({ coerce: true }).negative())
    .transform((val) => new Decimal(val)),
});

@ZodDto()
export class ManualUpdateMasterBalanceDto extends createZodDto(
  ManualUpdateMasterBalanceSchema,
) {
  constructor(data: ManualUpdateMasterBalanceDto) {
    super();
    Object.assign(this, data);
  }
}
