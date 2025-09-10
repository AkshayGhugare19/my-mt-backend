import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class DuplicateCodeError extends SerializableException {
  defaultResponseCode: number = HttpStatus.CONFLICT;
  constructor(message?: string) {
    super({ message: message || ErrorMessages.COUPON_CODE_ALREADY_EXISTS });
  }
}
