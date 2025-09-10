import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class CouponCodeGroupAlreadyRedeemedError extends SerializableException {
  defaultResponseCode = HttpStatus.CONFLICT;

  constructor() {
    super({ message: ErrorMessages.COUPON_CODE_GROUP_ALREADY_REDEEMED });
  }
}
