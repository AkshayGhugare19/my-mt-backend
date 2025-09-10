import { extendApi } from '@anatine/zod-openapi';
import { createZodDto } from '@common/helper/create-zod-dto';
import { AdminRewardSchema } from '@modules/reward/schema/admin-reward.schema';
import { RewardReceived } from '@modules/reward/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { z } from 'zod';

export const TipReceivedSchema = extendApi(
  AdminRewardSchema.pick({
    id: true,
    amount: true,
    createdAt: true,
  }).extend({
    type: z.literal('tip'),
    status: z.string(),
    sender: z.object({
      id: z.string().cuid(),
      playerTag: z.string(),
    }),
    remainingAmount: z.number(),
    currentRollover: z.number(),
    rolloverTarget: z.number(),
  }),
);

export class TipReceivedDto extends createZodDto(TipReceivedSchema) {
  constructor(data: Partial<TipReceivedDto>) {
    super();
    Object.assign(this, data);
  }

  static from(data: RewardReceived): TipReceivedDto {
    return new TipReceivedDto(
      TipReceivedDto.createSafe<TipReceivedDto>({
        ...data,
        type: 'tip',
        remainingAmount: decimalToNumber(
          data.bonusProgress?.bonusBalance?.balance ?? 0,
        ),
        amount: decimalToNumber(data.amount),
        currentRollover: decimalToNumber(
          data.bonusProgress?.currentProgress ?? 0,
        ),
        rolloverTarget: decimalToNumber(
          data.bonusProgress?.targetProgress ?? 0,
        ),
        status: data.bonusProgress?.status ?? '',
        createdAt: data.createdAt.toISOString(),
      }),
    );
  }
}
