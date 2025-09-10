import { extendApi } from '@anatine/zod-openapi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import {
  BonusTriggerConsumerConfigDto,
  BonusTriggerConsumerConfigSchema,
} from '@modules/bonus/dtos/bonus-trigger-consumer-config.dto';
import {
  BonusTriggerProducerConfigDto,
  BonusTriggerProducerConfigSchema,
} from '@modules/bonus/dtos/bonus-trigger-producer-config.dto';
import {
  BonusTriggerProgressConfigDto,
  BonusTriggerProgressConfigSchema,
} from '@modules/bonus/dtos/bonus-trigger-progress.dto';
import {
  BonusRewardType,
  BonusRewardTypeSchema,
  BonusType,
  BonusTypeSchema,
  RolloverType,
  RolloverTypeSchema,
} from '@modules/bonus/enum';
import { BonusWithTriggers } from '@modules/bonus/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { z } from 'zod';

export const BonusSchema = extendApi(
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    rewardType: BonusRewardTypeSchema,
    type: BonusTypeSchema,
    limitPerUser: z.number().optional(),
    maxReward: z.number().optional(),
    rewardAmount: z.number(),
    bonusExpiryTime: z.number().optional().describe('in milliseconds'),
    bonusExpiryHour: z.number().optional().describe('0-23'),
    rolloverType: RolloverTypeSchema.optional(),
    rolloverAmount: z.number().optional(),
    rolloverExpiryTime: z.number().optional().describe('in milliseconds'),
    producerTriggers: extendApi(BonusTriggerProducerConfigSchema).array(),
    progressTriggers: extendApi(BonusTriggerProgressConfigSchema).array(),
    consumerTriggers: extendApi(BonusTriggerConsumerConfigSchema).array(),
    withdrawAfterRollover: z.boolean().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    deletedAt: z.date().optional(),
  }),
);

@ZodDto()
export class BonusDto extends createZodDto(BonusSchema) {
  constructor(data: BonusDto) {
    super();
    Object.assign(this, data);
  }

  static from(input: BonusWithTriggers): BonusDto {
    return new BonusDto({
      id: input.id,
      name: input.name,
      rewardType: input.rewardType as BonusRewardType,
      description: input.description,
      producerTriggers: input.bonusTriggerProducerConfig.map((trigger) =>
        BonusTriggerProducerConfigDto.from(trigger),
      ),
      progressTriggers: input.bonusTriggerProgressConfig.map((trigger) =>
        BonusTriggerProgressConfigDto.from(trigger),
      ),
      consumerTriggers: input.bonusTriggerConsumerConfig.map((trigger) =>
        BonusTriggerConsumerConfigDto.from(trigger),
      ),
      rewardAmount: decimalToNumber(input.rewardAmount),
      type: input.type as BonusType,
      bonusExpiryTime: input.bonusExpiryTime || undefined,
      bonusExpiryHour: input.bonusExpiryHour || undefined,
      maxReward: decimalToNumber(input.maxReward) || undefined,
      limitPerUser: input.limitPerUser || undefined,
      rolloverType: (input.rolloverType as RolloverType) || undefined,
      rolloverAmount: decimalToNumber(input.rolloverAmount) || undefined,
      rolloverExpiryTime: input.rolloverExpiryTime || undefined,
      withdrawAfterRollover: input.withdrawAfterRollover ?? undefined,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: input.deletedAt || undefined,
    });
  }
}
