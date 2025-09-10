import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { WithdrawalStatusSchema } from '@modules/withdrawal/enum/withdrawal-status.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GetAllTokenRequestsFilteredSchema = z.object({
  email: z.string().optional(),
  status: WithdrawalStatusSchema.array().optional(),
  page: z.number({ coerce: true }).optional().default(1),
  limit: z.number({ coerce: true }).optional().default(10),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  search: z.string().optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
});

@ZodDto()
export class GetAllTokenRequestsFilteredQuery extends createZodDto(
  GetAllTokenRequestsFilteredSchema,
) {
  constructor(data: GetAllTokenRequestsFilteredQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
