import { TokenSettlementSchema } from '@modules/token-settlement/dto/token-settlement.dto';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const MasterVipTokenSettlementSchema = TokenSettlementSchema.extend({
  masterEmail: z.string(),
  masterNickname: z.string(),
  targetEmail: z.string(),
  targetNickname: z.string(),
  userBookieStake: z.number(),
});

export class MasterVipTokenSettlementDto extends createZodDto(
  MasterVipTokenSettlementSchema,
) {
  constructor(data: MasterVipTokenSettlementDto) {
    super();
    Object.assign(this, data);
  }
}
