import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { PasswordSchema } from '@modules/authentication/core/validation-schemas/password.schema';

export const ResetPasswordSchema = PasswordSchema.extend({
  email: z.string(
    zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING),
  ),
  code: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .min(8, ValidationErrorMessages.INPUT_TOO_SHORT),
}).refine((schema) => schema.password === schema.confirmPassword, {
  message: ValidationErrorMessages.PASSWORDS_MUST_MATCH,
  path: ['confirmPassword'],
});

@ZodDto()
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {
  constructor(data: Partial<ResetPasswordDto>) {
    super();
    Object.assign(this, data);
  }
}
