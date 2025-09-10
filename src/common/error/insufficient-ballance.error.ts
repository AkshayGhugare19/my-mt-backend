import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ISerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';

export class InsufficientBalanceError
  extends Error
  implements ISerializableException {
  defaultResponseCode = HttpStatus.BAD_REQUEST;

  private currentAmount: number | Decimal;
  private desiredAmount: number | Decimal;
  private userId: string;

  constructor({
    currentAmount,
    desiredAmount,
    message,
    userId,
  }: {
    userId: string;
    message?: string;
    currentAmount: number | Decimal;
    desiredAmount: number | Decimal;
  }) {
    super(message || ErrorMessages.INSUFFICIENT_BALANCE);
    this.currentAmount = currentAmount;
    this.desiredAmount = desiredAmount;
    this.userId = userId;
  }

  getMessage(): string {
    return this.message || ErrorMessages.INSUFFICIENT_BALANCE;
  }

  getErrors(): Record<string, unknown> | undefined {
    return {
      currentAmount:
        typeof this.currentAmount === 'number'
          ? this.currentAmount
          : decimalToNumber(this.currentAmount, 10),
      desiredAmount:
        typeof this.desiredAmount === 'number'
          ? this.desiredAmount
          : decimalToNumber(this.desiredAmount, 10),
      userId: this.userId,
    };
  }
}
