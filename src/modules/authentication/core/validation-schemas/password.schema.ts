import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const PasswordSchema = z.object({
  password: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .min(5, ValidationErrorMessages.INPUT_TOO_SHORT),
  confirmPassword: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .min(5, ValidationErrorMessages.INPUT_TOO_SHORT),
});
