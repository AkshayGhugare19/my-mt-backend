import { BetStatus, BetStatuses } from '@modules/bet/enum/bet-status.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UserTransactionsReportSchema = z.object({
  id: z.string(),
  date: z.date(),
  amount: z.number(),
  status: z.string(),
  transactionId: z.string(),
  currency: z.number(),
  targetWallet: z.string().optional(),
  blockchain: z.number().optional().nullable(),
  usdAmount: z.number().optional().nullable(),
  cryptoAmount: z.number().optional(),
});

export class UserTransactionsReportAdminDto extends createZodDto(
  UserTransactionsReportSchema,
) {
  constructor(data: UserTransactionsReportAdminDto) {
    super();
    Object.assign(this, data);
  }
}

function calculateAvailableBalance(
  status: BetStatus,
  previousBalance: number | null,
  settlement: number,
): number | null {
  if (status === BetStatuses.WIN || status === BetStatuses.LOSS) {
    return previousBalance ? previousBalance + settlement : null;
  }
  if (status === BetStatuses.CANCELLED || status === BetStatuses.ABORT) {
    return previousBalance;
  }
  return null;
}

export const GameBetReportSchema = z.object({
  id: z.string(),
  date: z.date(),
  amount: z.number(),
  settlement: z.number(),
  status: z.string(),
  previousBalance: z.number().nullable(),
  availableBalance: z.number().nullable(),
  game: z.string(),
  betId: z.string(),
});

export class GameBetReportAdminDto extends createZodDto(GameBetReportSchema) {
  constructor(data: Omit<GameBetReportAdminDto, 'availableBalance'>) {
    super();
    Object.assign(this, {
      ...data,
      previousBalance: data.previousBalance,
      availableBalance: calculateAvailableBalance(
        data.status as BetStatus,
        data.previousBalance,
        data.settlement,
      ),
    });
  }
}

export const SportsbookBetReportSchema = z.object({
  id: z.string(),
  date: z.date(),
  sport: z.string(),
  event: z.string(),
  outcome: z.string(),
  status: z.string(),
  isCashOut: z.boolean(),
  amount: z.number(),
  previousBalance: z.number().nullable(),
  availableBalance: z.number().nullable(),
  game: z.string(),
  betId: z.string(),
  settlement: z.number(),
  tournament: z.string(),
});

export class SportsbookBetReportAdminDto extends createZodDto(
  SportsbookBetReportSchema,
) {
  // eslint-disable-next-line sonarjs/no-identical-functions
  constructor(data: Omit<SportsbookBetReportAdminDto, 'availableBalance'>) {
    super();
    Object.assign(this, {
      ...data,
      previousBalance: data.previousBalance,
      availableBalance: calculateAvailableBalance(
        data.status as BetStatus,
        data.previousBalance,
        data.settlement,
      ),
    });
  }
}

export const SportsExchangeBetReportSchema = z.object({
  id: z.string(),
  date: z.date(),
  status: z.string(),
  amount: z.number(),
  settlement: z.number(),
  event: z.string(),
  team: z.string(),
  sport: z.string(),
  marketName: z.string(),
  previousBalance: z.number().nullable(),
  side: z.string(),
  rate: z.number(),
  betId: z.string(),
});

export class SportsExchangeBetReportAdminDto extends createZodDto(
  SportsExchangeBetReportSchema,
) {
  constructor(data: SportsExchangeBetReportAdminDto) {
    super();
    Object.assign(this, data);
  }
}
