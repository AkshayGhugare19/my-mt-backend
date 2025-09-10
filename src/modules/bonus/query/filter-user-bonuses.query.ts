import { extendApi } from '@anatine/zod-openapi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { PagePaginationQuerySchema } from '@common/query/page-pagination.query';
import { z } from 'zod';

export const FilterUserBonusesSchema = extendApi(
  PagePaginationQuerySchema.extend({
    triggerProducerType: z.string().optional(),
    status: z.enum(['available', 'claimed']).optional(),
  }),
);

@ZodDto()
export class FilterUserBonusesQuery extends createZodDto(
  FilterUserBonusesSchema,
) {
  constructor(data: FilterUserBonusesQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
