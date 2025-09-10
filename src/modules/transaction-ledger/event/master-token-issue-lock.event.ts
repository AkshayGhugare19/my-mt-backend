import { Decimal } from '@prisma/client/runtime/library';

export class MasterTokenIssueLockEvent {
  public readonly masterId: string;
  public readonly amount: Decimal;
  public readonly transactionId: string;

  constructor(data: MasterTokenIssueLockEvent) {
    Object.assign(this, data);
  }
}
