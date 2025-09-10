import { extendApi } from '@anatine/zod-openapi';
import { createZodDto } from '@common/helper/create-zod-dto';
import { AdminRewardSchema } from '@modules/reward/schema/admin-reward.schema';
import { RewardReceived } from '@modules/reward/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { z } from 'zod';

export const RewardReceivedSchema = extendApi(
  AdminRewardSchema.pick({
    id: true,
    type: true,
    amount: true,
    createdAt: true,
    status: true,
  }).extend({
    sender: z.object({
      playerTag: z.string(),
    }),
  }),
);

export class RewardReceivedDto extends createZodDto(RewardReceivedSchema) {
  constructor(data: Partial<RewardReceivedDto>) {
    super();
    Object.assign(this, data);
  }

  static from(data: RewardReceived): RewardReceivedDto {
    return new RewardReceivedDto(
      RewardReceivedDto.createSafe<RewardReceivedDto>({
        ...data,
        type: 'reward',
        amount: decimalToNumber(data.amount),
        status: 'COMPLETED',
        createdAt: data.createdAt.toISOString(),
        sender: {
          playerTag: data.description ?? '',
        },
      }),
    );
  }
}
