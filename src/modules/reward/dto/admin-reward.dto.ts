import { createZodDto } from '@common/helper/create-zod-dto';
import { AdminRewardSchema } from '@modules/reward/schema/admin-reward.schema';
import { RewardAdmin } from '@modules/reward/types';
import { decimalToNumber } from '@utils/decimal-do-number';

export class AdminRewardDto extends createZodDto(AdminRewardSchema) {
  constructor(data: Partial<AdminRewardDto>) {
    super();
    Object.assign(this, data);
  }

  static from(data: RewardAdmin): AdminRewardDto {
    return new AdminRewardDto(
      AdminRewardDto.createSafe<AdminRewardDto>({
        id: data.id,
        amount: decimalToNumber(data.amount),
        description: data.description ?? '',
        createdAt: data.createdAt.toISOString(),
        type: 'reward',
        updatedAt: data.updatedAt.toISOString(),
        status: 'COMPLETED',
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
