import { SerializableException } from '@common/error/serializable-exception.error';

import { ErrorMessages } from '@common/enums/error-messages.enum';
import { HttpStatus } from '@nestjs/common';

export class InvalidTipTargetError extends SerializableException {
  defaultResponseCode = HttpStatus.BAD_REQUEST;

  constructor() {
    super({ message: ErrorMessages.INVALID_TIP_TARGET });
  }
}
