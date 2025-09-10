import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';
import {
  BonusTriggerConfig,
  BonusTriggerConfigSchema,
} from '@modules/bonus/schema/trigger';
import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTarget,
  BonusTriggerTargets,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { BonusTriggerProducerConfig } from '@prisma/client';
import { createZodDto } from '@common/helper/create-zod-dto';

export const BonusTriggerConsumerSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export const BonusTriggerBetPlacingConsumerSchema =
  BonusTriggerConsumerSchema.extend({
    type: z.literal(BonusTriggerConfigTypes.BET_PLACING),
    triggerId: z.number(),
    target: BonusTriggerTargetSchema,
    config: BonusTriggerConfigSchema.pick({
      minAmount: true,
      maxAmount: true,
    }),
  });

export const BonusTriggerConsumerConfigSchema = extendApi(
  zDiscriminatedUnion('type', [BonusTriggerBetPlacingConsumerSchema]),
);
@ZodDto()
export class BonusTriggerConsumerConfigDto extends createZodDto(
  BonusTriggerConsumerConfigSchema,
) {
  constructor(data: BonusTriggerConsumerConfigDto) {
    super();
    if (data) Object.assign(this, data);
  }

  static from(
    input: BonusTriggerProducerConfig,
  ): BonusTriggerConsumerConfigDto {
    return new BonusTriggerConsumerConfigDto({
      id: input.id,
      triggerId: input.triggerId,
      target:
        (input.target as BonusTriggerTarget) || BonusTriggerTargets.GLOBAL,
      type: input.type as typeof BonusTriggerConfigTypes.BET_PLACING,
      config: input.config as BonusTriggerConfig,
    }) as BonusTriggerConsumerConfigDto;
  }
}
