import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GetUserWithdrawalRequestsFilteredSchema = z.object({
  status: z.enum(['pending', 'resolved', 'all']).default('resolved'),
  page: z.number({ coerce: true }).optional().default(1),
  limit: z.number({ coerce: true }).optional().default(10),
});

@ZodDto()
export class GetUserWithdrawalRequestsFilteredQuery extends createZodDto(
  GetUserWithdrawalRequestsFilteredSchema,
) {
  constructor(data: GetUserWithdrawalRequestsFilteredQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
