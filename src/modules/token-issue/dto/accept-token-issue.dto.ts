import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { TokenIssueWithPrepaidOptionsSchema } from '@modules/token-issue/dto/token-issue-with-prepaid-options.dto';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const AcceptTokenIssueSchema = z
  .object({
    tokenIssueId: z.string(),
  })
  .merge(TokenIssueWithPrepaidOptionsSchema);

@ZodDto()
export class AcceptTokenIssueDto extends createZodDto(AcceptTokenIssueSchema) {
  constructor(data: AcceptTokenIssueDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
