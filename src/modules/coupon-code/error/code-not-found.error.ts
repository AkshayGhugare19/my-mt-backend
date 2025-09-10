import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class CouponCodeNotFoundError extends SerializableException {
  defaultResponseCode: number = HttpStatus.NOT_FOUND;
  constructor() {
    super({ message: ErrorMessages.COUPON_CODE_NOT_FOUND });
  }
}
