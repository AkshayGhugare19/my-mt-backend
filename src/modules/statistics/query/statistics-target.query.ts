import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const StatisticsTargetSchema = z.object({
  target: z.enum(['user', 'vip', 'all']).default('all'),
});

@ZodDto()
export class StatisticsTargetQuery extends createZodDto(
  StatisticsTargetSchema,
) {
  constructor(data: StatisticsTargetQuery) {
    super();
    Object.assign(this, data);
  }
}

export const StatisticsRangeSchema = StatisticsTargetSchema.extend({
  startDate: z.date({ coerce: true }),
  endDate: z.date({ coerce: true }),
});

@ZodDto()
export class StatisticsRangeQuery extends createZodDto(StatisticsRangeSchema) {
  constructor(data: StatisticsRangeQuery) {
    super();
    Object.assign(this, data);
  }
}
