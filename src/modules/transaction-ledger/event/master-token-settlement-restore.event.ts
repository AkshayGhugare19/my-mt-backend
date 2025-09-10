import { Decimal } from '@prisma/client/runtime/library';

export class MasterTokenSettlementRestoreEvent {
  public readonly userId: string;
  public readonly amount: Decimal;
  public readonly transactionId: string;

  constructor(data: MasterTokenSettlementRestoreEvent) {
    Object.assign(this, data);
  }
}
