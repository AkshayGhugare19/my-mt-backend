import { z } from 'zod';

export const AdminRewardSchema = z.object({
  id: z.number(),
  amount: z.number(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  type: z.literal('reward'),
  status: z.literal('COMPLETED'),
  sender: z.object({
    id: z.string(),
    playerTag: z.string().nullable(),
    nickname: z.string().nullable(),
    email: z.string().nullable(),
  }),
  receiver: z.object({
    id: z.string(),
    playerTag: z.string().nullable(),
    nickname: z.string().nullable(),
    email: z.string().nullable(),
  }),
});
