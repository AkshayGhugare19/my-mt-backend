import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const TokenSettlementSchema = z.object({
  id: z.string(),
  amount: z.number(),
  settleAmount: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  status: z.string(),
});

export class TokenSettlementDto extends createZodDto(TokenSettlementSchema) {
  constructor(data: TokenSettlementDto) {
    super();
    Object.assign(this, data);
  }
}
