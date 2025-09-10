import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const LoginSchema = extendApi(
  z.object({
    username: z.string(
      zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING),
    ),
    password: z
      .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
      .min(5, ValidationErrorMessages.INPUT_TOO_SHORT),

    twoFactorAuthenticationCode: z.string().optional(),
    countryCode: z.string().min(2, ValidationErrorMessages.INPUT_TOO_SHORT).max(2, ValidationErrorMessages.INPUT_TOO_LONG).optional(),
  }),
  {
    required: ['username', 'password'],
  },
);

@ZodDto()
export class LoginDto extends createZodDto(LoginSchema) {
  constructor(data: LoginDto) {
    super();
    Object.assign(this, data);
  }
}
