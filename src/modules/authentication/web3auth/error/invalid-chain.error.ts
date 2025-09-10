import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class InvalidChainError extends SerializableException {
  defaultResponseCode = HttpStatus.BAD_REQUEST;

  constructor(params: {
    errors?: { blockchain?: number; userBlockchain?: number };
    message?: string;
  }) {
    const errorMessage = params.errors
      ? `Invalid chain: ${params.errors.blockchain} expecting ${params.errors.userBlockchain}`
      : ErrorMessages.INVALID_CHAIN;
    super({
      message: params.message ?? errorMessage,
      errors: params.errors,
    });
    this.name = ErrorMessages.INVALID_CHAIN;
  }
}
