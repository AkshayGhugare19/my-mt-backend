import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
  email: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .email({
      message: ValidationErrorMessages.INPUT_MUST_BE_A_STRING,
    }),
});

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
