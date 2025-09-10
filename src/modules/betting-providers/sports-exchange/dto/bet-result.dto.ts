import { z } from 'zod';

export const SportsExchangeBetResultSchema = z.object({
  user_id: z.string(),
  sport_name: z.string().optional(),
  sport_id: z.string().optional(),
  amount: z.number(),
  exposure: z.number(),
  match_name: z.string(),
  match_id: z.string(),
  round_name: z.string(),
  round_id: z.string(),
  result: z.string(),
  bets: z
    .array(
      z
        .object({
          transation_id: z.number(),
          win_loss: z.number(),
        })
        .transform((bet) => ({
          transactionId: bet.transation_id,
          winLose: bet.win_loss,
        })),
    )
    .nullable(),
});
