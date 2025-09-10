import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';
import { ZodError } from 'zod';

export class InvalidCodeConfigError extends SerializableException {
  defaultResponseCode: number = HttpStatus.BAD_REQUEST;
  error?: ZodError;
  constructor(message?: string);
  constructor(error: ZodError);
  constructor(error: ZodError | string | undefined) {
    super({ message: ErrorMessages.COUPON_CODE_INVALID_CONFIG });

    if (error instanceof ZodError) {
      this.error = error;
    } else if (error) {
      this.message = error;
    }
  }

  getErrors(): Record<string, unknown> | undefined {
    return this.error?.flatten().fieldErrors;
  }
}
