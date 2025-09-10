import { z } from 'zod';

export const BetStatisticsSchema = z.object({
  betsPlacedToday: z.number(),
  biggestBetToday: z.number(),
  biggestWinToday: z.number(),
  biggestLossToday: z.number(),
  biggestWin: z.number(),
  biggestLoss: z.number(),
  totalBets: z.number(),
});

export type BetStatistics = z.infer<typeof BetStatisticsSchema>;
