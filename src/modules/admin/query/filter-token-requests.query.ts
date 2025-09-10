import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { PagePaginationQuerySchema } from '@common/query/page-pagination.query';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const FilterTokenRequestsQuerySchema = PagePaginationQuerySchema.extend({
  userId: z.string().cuid().optional(),
});

@ZodDto()
export class FilterTokenRequestsQuery extends createZodDto(
  FilterTokenRequestsQuerySchema,
) {
  constructor(data: FilterTokenRequestsQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
