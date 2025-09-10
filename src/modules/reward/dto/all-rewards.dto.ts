import { createZodDto } from '@common/helper/create-zod-dto';
import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import { AdminRewardDto } from '@modules/reward/dto/admin-reward.dto';
import { RewardReceivedDto, RewardReceivedSchema } from '@modules/reward/dto/reward-received.dto';
import { TipAdminDto, TipAdminSchema } from '@modules/reward/dto/tip-admin.dto';
import { TipReceivedDto, TipReceivedSchema } from '@modules/reward/dto/tip-received.dto';
import { AdminRewardSchema } from '@modules/reward/schema/admin-reward.schema';
import { RewardAdmin, RewardReceived } from '@modules/reward/types';

export const AllRewardsSchema = zDiscriminatedUnion('type', [
  AdminRewardSchema,
  TipAdminSchema,
]);

export class AllRewardsAdminDto extends createZodDto(AllRewardsSchema) {
  constructor(data: Partial<AllRewardsAdminDto>) {
    super();
    Object.assign(this, data);
  }

  static from(data: RewardAdmin): AllRewardsAdminDto {
    if (data.type === 'tip') {
      return TipAdminDto.from(data);
    } else {
      return AdminRewardDto.from(data);
    }
  }
}

export const AllRewardsReceivedSchema = zDiscriminatedUnion('type', [
  RewardReceivedSchema,
  TipReceivedSchema,
]);

export class AllRewardsReceivedDto extends createZodDto(
  AllRewardsReceivedSchema,
) {
  constructor(data: Partial<AllRewardsReceivedDto>) {
    super();
    Object.assign(this, data);
  }

  static from(data: RewardReceived): AllRewardsReceivedDto {
    if (data.type === 'tip') {
      return TipReceivedDto.from(data);
    } else {
      return RewardReceivedDto.from(data);
    }
  }
}
