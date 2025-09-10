import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { RequestTokenIssueSchema } from '@modules/token-issue/dto/request-token-issue.dto';
import { TokenIssueWithPrepaidOptionsSchema } from '@modules/token-issue/dto/token-issue-with-prepaid-options.dto';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateVipTokenIssueSchema = RequestTokenIssueSchema.extend({
  targetId: z.string().cuid(),
}).merge(TokenIssueWithPrepaidOptionsSchema);

@ZodDto()
export class CreateVipTokenIssueDto extends createZodDto(
  CreateVipTokenIssueSchema,
) {
  constructor(data: CreateVipTokenIssueDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
