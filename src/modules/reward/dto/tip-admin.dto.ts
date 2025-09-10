import { createZodDto } from '@common/helper/create-zod-dto';
import { AdminRewardSchema } from '@modules/reward/schema/admin-reward.schema';
import { TipAdmin } from '@modules/tip/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { z } from 'zod';

export const TipAdminSchema = AdminRewardSchema.extend({
  remainingAmount: z.number(),
  status: z.string().transform((val) => val.toUpperCase()),
  type: z.literal('tip'),
  currentRollover: z.number(),
  rolloverTarget: z.number(),
}).omit({ description: true });

export class TipAdminDto extends createZodDto(TipAdminSchema) {
  constructor(data: Partial<TipAdminDto>) {
    super();
    Object.assign(this, data);
  }

  static from(data: TipAdmin): TipAdminDto {
    return new TipAdminDto(
      TipAdminDto.createSafe<TipAdminDto>({
        id: data.id,
        amount: decimalToNumber(data.amount),
        remainingAmount: decimalToNumber(
          data.bonusProgress?.bonusBalance?.balance ?? 0,
        ),
        type: 'tip',
        status: data.bonusProgress?.status ?? '',
        currentRollover: decimalToNumber(
          data.bonusProgress?.currentProgress ?? 0,
        ),
        rolloverTarget: decimalToNumber(
          data.bonusProgress?.targetProgress ?? 0,
        ),
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
        sender: {
          id: data.sender.id,
          playerTag: data.sender.playerTag,
          nickname: data.sender.nickname,
          email:
            data.sender.email ??
            data.sender.Web3AuthAccount?.[0]?.email ??
            null,
        },
        receiver: {
          id: data.user.id,
          playerTag: data.user.playerTag,
          nickname: data.user.nickname,
          email:
            data.user.email ?? data.user.Web3AuthAccount?.[0]?.email ?? null,
        },
      }),
    );
  }
}
