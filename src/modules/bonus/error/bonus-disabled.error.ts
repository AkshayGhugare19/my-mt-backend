import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class BonusDisabledError extends SerializableException {
  defaultResponseCode = HttpStatus.BAD_REQUEST;

  constructor() {
    super({ message: ErrorMessages.BONUS_DISABLED_FOR_USER });
  }
}
