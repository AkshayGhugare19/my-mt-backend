import { Decimal } from '@prisma/client/runtime/library';

export class MasterTokenUpdateEvent {
  public readonly userId: string;
  public readonly masterId: string;
  public readonly amount: Decimal;
  public readonly transactionId: string;

  constructor(data: MasterTokenUpdateEvent) {
    Object.assign(this, data);
  }
}
