import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const RejectWithdrawalSchema = z.object({
  withdrawalId: z.string(),
});

@ZodDto()
export class RejectWithdrawalQuery extends createZodDto(
  RejectWithdrawalSchema,
) {
  constructor(data: RejectWithdrawalQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
