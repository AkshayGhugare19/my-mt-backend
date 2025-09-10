import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { zodErrorMessage } from '@utils/zod-validation-message';

export const VerifyEmailSchema = z.object({
  email: z.string(
    zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING),
  ),
  code: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .min(6, ValidationErrorMessages.INPUT_TOO_SHORT),
});

@ZodDto()
export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {
  constructor(data: Partial<VerifyEmailDto>) {
    super();
    Object.assign(this, data);
  }
}
