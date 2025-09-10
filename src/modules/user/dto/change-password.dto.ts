import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { PasswordSchema } from '@modules/authentication/core/validation-schemas/password.schema';

export const ChangePasswordSchema = PasswordSchema.extend({
  oldPassword: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .min(5, ValidationErrorMessages.INPUT_TOO_SHORT),
}).refine((schema) => schema.password === schema.confirmPassword, {
  message: ValidationErrorMessages.PASSWORDS_MUST_MATCH,
  path: ['confirmPassword'],
});

@ZodDto()
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {
  constructor(data: Partial<ChangePasswordDto>) {
    super();
    Object.assign(this, data);
  }
}
