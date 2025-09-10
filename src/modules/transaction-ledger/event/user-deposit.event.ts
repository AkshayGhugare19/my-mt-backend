import { Decimal } from '@prisma/client/runtime/library';
import { TransactionStatus } from '../enum/status.enum';

export class UserDepositEvent {
  public readonly userId: string;
  public readonly pmId?: number;
  public readonly pmBtag?: string;
  public readonly pointsAmount: Decimal;
  public readonly transactionId: string;
  public readonly status: TransactionStatus;
  public readonly balance: Decimal | null;

  constructor(data: UserDepositEvent) {
    Object.assign(this, data);
  }
}
