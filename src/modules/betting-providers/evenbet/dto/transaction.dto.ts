import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number(),
  operationType: z.string(),
  counterParty: z.string(),
  referenceId: z.string(),
  targetBalance: z.string(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export class TransactionsDto extends createZodDto(TransactionSchema) {
  constructor(data: TransactionsDto) {
    super();
    Object.assign(this, data);
  }

  static from(data: TransactionsDto): TransactionsDto {
    return new TransactionsDto(data);
  }
}
