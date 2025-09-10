import { z } from 'zod';

export const RegisterNewPlayerBodyDto = z.object({
  date: z.date(),
  btag: z.string(),
  player: z.object({
    skin_id: z.number(),
    external_id: z.string(),
    username: z.string().optional(),
    nickname: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    reg_date: z.date().optional(),
  }),
});

export const CreateTransactionBodyDto = z.object({
  skin_id: z.number(),
  datetime: z.date(),
  product_id: z.number(),
  player_external_id: z.string().optional(),
  player_id: z.number().optional(),
  currency: z.string(),
  transactions: z.array(
    z.object({
      external_id: z.string(),
      type: z.number(),
      amount: z.number().optional(),
      count: z.number().optional(),
    }),
  ),
});
