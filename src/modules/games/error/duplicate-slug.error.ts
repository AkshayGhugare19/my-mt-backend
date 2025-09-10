import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class DuplicateSlugError extends SerializableException {
  defaultResponseCode = HttpStatus.CONFLICT;

  constructor(message?: string) {
    super({ message: message || ErrorMessages.DUPLICATE_SLUG });
    this.name = ErrorMessages.DUPLICATE_SLUG;
  }
}
