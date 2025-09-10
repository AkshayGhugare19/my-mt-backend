import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ResolveTokenIssueSchema = z.object({
  tokenIssueId: z.string(),
});

@ZodDto()
export class ResolveTokenIssueQuery extends createZodDto(
  ResolveTokenIssueSchema,
) {
  constructor(data: ResolveTokenIssueQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
