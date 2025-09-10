import { BetMetadata } from '@modules/bet/types';
import { Bet } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export function getConsumedBalancesFromBet(bet: Bet): { accountBalance: Decimal, bonusBalance: Decimal } {
  const metadata = bet.metadata as unknown as BetMetadata;
  const bonusBalanceChange = metadata.bonusUsed;
  if (!bonusBalanceChange?.length) {
    return { accountBalance: bet.betAmount, bonusBalance: new Decimal(0) };
  }
  const bonusBalance = bonusBalanceChange.reduce((acc, curr) => acc.add(curr.consumeAmount), new Decimal(0));
  const accountBalance = bet.betAmount.sub(bonusBalance);
  return { accountBalance, bonusBalance };
}
