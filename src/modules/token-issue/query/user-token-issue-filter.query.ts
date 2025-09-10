import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { PagePaginationQuerySchema } from '@common/query/page-pagination.query';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UserTokenIssueFilterSchema = PagePaginationQuerySchema.extend({
  status: z.enum(['pending', 'resolved']).optional(),
});

@ZodDto()
export class UserTokenIssueFilterQuery extends createZodDto(
  UserTokenIssueFilterSchema,
) {
  constructor(data: UserTokenIssueFilterQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
