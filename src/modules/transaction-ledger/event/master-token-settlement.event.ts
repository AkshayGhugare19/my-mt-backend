import { Decimal } from '@prisma/client/runtime/library';

export class MasterTokenSettlementEvent {
  public readonly masterId: string;
  public readonly amount: Decimal;
  public readonly transactionId: string;

  constructor(data: MasterTokenSettlementEvent) {
    Object.assign(this, data);
  }
}
