import { extendApi } from '@anatine/zod-openapi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const AdminManualTriggerSchema = extendApi(
  z.object({
    userIds: z.array(
      z
        .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
        .cuid(ValidationErrorMessages.INPUT_MUST_BE_A_VALID_ID),
    ),
    bonusId: z
      .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
      .cuid(ValidationErrorMessages.INPUT_MUST_BE_A_VALID_ID),
    amount: z
      .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
      .min(0, ValidationErrorMessages.INPUT_VALUE_TOO_SMALL),
  }),
);

@ZodDto()
export class AdminManualTriggerDto extends createZodDto(
  AdminManualTriggerSchema,
) {
  constructor(data: AdminManualTriggerDto) {
    super();
    Object.assign(this, data);
  }
}
