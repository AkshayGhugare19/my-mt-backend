import { Decimal } from '@prisma/client/runtime/library';

export class UserBalanceAdjustmentEvent {
  public readonly userId: string;
  public readonly masterId: string;
  public readonly amount: Decimal;
  public readonly transactionId: string;

  constructor(data: UserBalanceAdjustmentEvent) {
    Object.assign(this, data);
  }
}
