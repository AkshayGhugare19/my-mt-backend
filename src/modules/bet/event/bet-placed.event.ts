import { Decimal } from '@prisma/client/runtime/library';
import { BetStatus } from '../enum/bet-status.enum';
import { BetProvider } from '../enum/bet-providers.enum';

export class BetPlacedEvent {
  public readonly userId: string;
  public readonly pmId?: number;
  public readonly pmBtag?: string;
  public readonly amount: Decimal;
  public readonly betId: string;
  public readonly status: BetStatus;
  public readonly provider: BetProvider;
  public readonly previousBalance: Decimal | null;
  public readonly transactionId: string;
  public readonly consumedAccountBalance: Decimal;
  public readonly consumedBonusBalance?: Decimal;
  public readonly metadata?: Record<string, any>;

  constructor(data: BetPlacedEvent) {
    Object.assign(this, data);
  }
}
