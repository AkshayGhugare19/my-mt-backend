import { BetStatus } from '@modules/bet/enum/bet-status.enum';
import { Prisma } from '@prisma/client';
import { BetProvider } from '../enum/bet-providers.enum';

export class BetSettledEvent {
  public readonly amount: Prisma.Decimal | null;
  public readonly grossAmount: Prisma.Decimal | null;
  public readonly netAmount: Prisma.Decimal;
  public readonly betId: string;
  public readonly userId: string;
  public readonly pmId?: number;
  public readonly pmBtag?: string;
  public readonly bonusBalanceIncrement: Prisma.Decimal;
  public readonly accountBalanceIncrement: Prisma.Decimal;
  public readonly consumedAccountBalance: Prisma.Decimal;
  public readonly consumedBonusBalance: Prisma.Decimal | null;
  public readonly status: BetStatus;
  public readonly provider: BetProvider;
  public readonly previousBalance: Prisma.Decimal | null;
  public readonly transactionId: string;
  public readonly metadata?: Record<string, any>;
  public readonly roundFinished?: boolean;

  constructor(data: BetSettledEvent) {
    Object.assign(this, data);
  }
}
