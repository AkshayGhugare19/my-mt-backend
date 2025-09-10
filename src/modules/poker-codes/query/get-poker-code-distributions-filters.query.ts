import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GetPokerCodeDistributionsFiltersSchema = z.object({
  // TODO: Mirel - filters
  nickname: z
    .string()
    .optional()
    .transform((val) => val?.replace(/[^a-zA-Z0-9]/g, '') || undefined),
  wallet: z
    .string()
    .optional()
    .transform((val) => val?.replace(/[^a-zA-Z0-9]/g, '') || undefined),
  code: z
    .string()
    .optional()
    .transform((val) => val?.replace(/[^a-zA-Z0-9]/g, '') || undefined),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  distributionCount: z.number().optional(),
  page: z.number({ coerce: true }).optional().default(1),
  limit: z.number({ coerce: true }).optional().default(10),
});

@ZodDto()
export class GetPokerCodeDistributionsFiltersQuery extends createZodDto(
  GetPokerCodeDistributionsFiltersSchema,
) {
  constructor(data: GetPokerCodeDistributionsFiltersQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
