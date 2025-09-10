import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class CouponCodeOutOfStockError extends SerializableException {
  defaultResponseCode = HttpStatus.BAD_REQUEST;

  constructor() {
    super({ message: ErrorMessages.COUPON_CODE_OUT_OF_STOCK });
  }
}
