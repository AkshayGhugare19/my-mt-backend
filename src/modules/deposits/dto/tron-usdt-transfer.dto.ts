import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const TronUsdtTransferSchema = z.object({
  address: z.string(),
  tx: z.string(),
  amount: z.number(),
});

export class TronUsdtTransferDto extends createZodDto(TronUsdtTransferSchema) {
  constructor(data: Partial<TronUsdtTransferDto>) {
    super();
    Object.assign(this, data);
  }
}
