import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { PasswordSchema } from '@modules/authentication/core/validation-schemas/password.schema';
import { CreateCredentialsUser } from '@modules/user/types';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const RegisterSchema = PasswordSchema.extend({
  promoCode: z.string().optional(),
  email: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .email(ValidationErrorMessages.INPUT_MUST_BE_AN_EMAIL),
  partnerMatrixBtag: z.string().optional(),
}).refine((schema) => schema.password === schema.confirmPassword, {
  message: ValidationErrorMessages.PASSWORDS_MUST_MATCH,
  path: ['confirmPassword'],
});

@ZodDto()
export class RegisterDto extends createZodDto(RegisterSchema) {
  constructor(data: Partial<RegisterDto>) {
    super();
    Object.assign(this, data);
  }

  toUser(): CreateCredentialsUser {
    return {
      email: this.email,
      password: this.password,
      promoCode: this.promoCode,
    };
  }
}
