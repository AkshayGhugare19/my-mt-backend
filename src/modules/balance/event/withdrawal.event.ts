import { TransactionStatus } from '@modules/transaction-ledger/enum/status.enum';
import { Decimal } from '@prisma/client/runtime/library';

export class WithdrawalEvent {
  public readonly userId: string;
  public readonly pmId?: number;
  public readonly pmBtag?: string;
  public readonly amount: Decimal;
  public readonly status: TransactionStatus;
  public readonly balance: Decimal | null;

  constructor(data: WithdrawalEvent) {
    Object.assign(this, data);
  }
}
