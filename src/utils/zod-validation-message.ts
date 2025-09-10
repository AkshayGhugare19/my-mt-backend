import {
  ValidationErrorMessage,
  ValidationErrorMessages,
} from '@common/enums/validation-error-messages.enum';

export const zodErrorMessage = (
  message: ValidationErrorMessage,
  coerce: boolean | undefined = true,
): {
  invalid_type_error?: string;
  required_error?: string;
  coerce?: true | undefined;
} => ({
  invalid_type_error: message,
  required_error: ValidationErrorMessages.INPUT_IS_REQUIRED,
  coerce: coerce || undefined,
});
