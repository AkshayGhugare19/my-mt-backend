import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GetPokerCodesFiltersSchema = z.object({
  // TODO: Mirel - filters
  code: z
    .string()
    .optional()
    .transform((val) => val?.replace(/[^a-zA-Z0-9]/g, '') || undefined),
  useLimit: z.number().optional(),
  reuseLimit: z.number().optional(),
  depositRangeFrom: z.number().optional(),
  depositRangeTo: z.number().optional(),
  isDisabled: z.boolean().optional(),
  isHighRoller: z.boolean().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number({ coerce: true }).optional().default(1),
  limit: z.number({ coerce: true }).optional().default(10),
});

@ZodDto()
export class GetPokerCodesFiltersQuery extends createZodDto(
  GetPokerCodesFiltersSchema,
) {
  constructor(data: GetPokerCodesFiltersQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
