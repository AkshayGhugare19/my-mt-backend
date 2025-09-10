import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { PagePaginationQuerySchema } from '@common/query/page-pagination.query';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';

export const UserTokenSettlementFilterSchema = PagePaginationQuerySchema.extend(
  {
    targetId: z
      .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
      .cuid(ValidationErrorMessages.INVALID_ID_FORMAT)
      .optional(),
    status: z.enum(['pending', 'resolved']).default('resolved'),
  },
);

@ZodDto()
export class UserTokenSettlementFilterQuery extends createZodDto(
  UserTokenSettlementFilterSchema,
) {
  constructor(data: UserTokenSettlementFilterQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
