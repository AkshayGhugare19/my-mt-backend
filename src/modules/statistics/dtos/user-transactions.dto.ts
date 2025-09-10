import { createZodDto } from '@common/helper/create-zod-dto';
import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import { z } from 'zod';

export const UserDepositSchema = z.object({
  type: z.literal('deposit'),
  status: z.string(),
  createdAt: z.date(),
  amount: z.number(),
  operationType: z.string(),
  counterParty: z.string(),
  currency: z.string().nullable(),
  quantity: z.number().nullable(),
});

export const UserBetsSchema = z.object({
  type: z.literal('bet'),
  date: z.date(),
  bet: z.number(),
  settlement: z.number(),
  game: z.string(),
  status: z.string(),
});

export const UserPokerSchema = z.object({
  type: z.literal('poker'),
  createdAt: z.date(),
  amount: z.number(),
  status: z.string(),
});

export type UserDeposit = z.infer<typeof UserDepositSchema>;
export type UserBets = z.infer<typeof UserBetsSchema>;
export type UserPoker = z.infer<typeof UserPokerSchema>;

export const UserTransactionsSchema = zDiscriminatedUnion('type', [
  UserDepositSchema,
  UserBetsSchema,
  UserPokerSchema,
]);

export class UserTransactionsDto extends createZodDto(UserTransactionsSchema) {
  constructor(data: Partial<UserTransactionsDto>) {
    super();
    Object.assign(this, data);
  }

  static from(
    data: z.infer<typeof UserTransactionsSchema>,
  ): UserTransactionsDto {
    return new UserTransactionsDto(data);
  }
}
