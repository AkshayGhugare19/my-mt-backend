import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UserDepositSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  amount: z.string(),
  status: z.enum([
    TransactionStatuses.PENDING,
    TransactionStatuses.SUCCESS,
    TransactionStatuses.FAILED,
  ]),
  createdAt: z.date(),
  currency: z.number(),
  blockchain: z.number(),
  usdAmount: z.number(),
  cryptoAmount: z.number(),
});

export class UserDepositDto extends createZodDto(UserDepositSchema) {
  constructor(data: Partial<UserDepositDto>) {
    super();
    Object.assign(this, data);
  }
}
