import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const AcceptWithdrawalSchema = z.object({
  withdrawalId: z.string(),
});

@ZodDto()
export class AcceptWithdrawalQuery extends createZodDto(
  AcceptWithdrawalSchema,
) {
  constructor(data: AcceptWithdrawalQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
