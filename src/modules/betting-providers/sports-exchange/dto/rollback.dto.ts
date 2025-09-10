import { z } from 'zod';

export const SportsExchangeBetRollbackSchema = z.object({
  user_id: z.string(),
  exposure: z.number(),
  round_name: z.string(),
  round_id: z.string(),
  amount: z.number(),
});
