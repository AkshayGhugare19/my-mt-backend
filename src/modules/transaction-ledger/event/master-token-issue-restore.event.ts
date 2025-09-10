import { Decimal } from '@prisma/client/runtime/library';

export class MasterTokenIssueRestoreEvent {
  public readonly masterId: string;
  public readonly amount: Decimal;
  public readonly transactionId: string;

  constructor(data: MasterTokenIssueRestoreEvent) {
    Object.assign(this, data);
  }
}
