import { createZodDto } from '@common/helper/create-zod-dto';
import { TipSent } from '@modules/tip/types';
import { decimalToFixed } from '@utils/decimal-to-fixed';
import { z } from 'zod';

export const TipSentSchema = z.object({
  id: z.number(),
  amount: z.number(),
  createdAt: z.date(),
  recipient: z.object({
    id: z.string().uuid(),
    playerTag: z.string(),
  }),
});

export class TipSentDto extends createZodDto(TipSentSchema) {
  constructor(data: Partial<TipSentDto>) {
    super();
    Object.assign(this, data);
  }

  static from(data: TipSent): TipSentDto {
    return new TipSentDto({
      id: data.id,
      amount: Number(decimalToFixed(data.amount)),
      createdAt: data.createdAt,
      recipient: {
        id: data.user.id,
        playerTag: data.user.playerTag,
      },
    });
  }
}
