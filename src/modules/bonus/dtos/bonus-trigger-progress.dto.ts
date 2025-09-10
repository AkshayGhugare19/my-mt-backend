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

export const BonusTriggerProgressSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export const BonusTriggerBetSettlementProgressSchema =
  BonusTriggerProgressSchema.extend({
    type: z.literal(BonusTriggerConfigTypes.BET_SETTLEMENT),
    triggerId: z.number(),
    target: BonusTriggerTargetSchema,
    config: BonusTriggerConfigSchema.pick({
      minAmount: true,
      maxAmount: true,
    }),
  });

export const BonusTriggerProgressConfigSchema = extendApi(
  zDiscriminatedUnion('type', [BonusTriggerBetSettlementProgressSchema]),
);

@ZodDto()
export class BonusTriggerProgressConfigDto extends createZodDto(
  BonusTriggerProgressConfigSchema,
) {
  constructor(data: BonusTriggerProgressConfigDto) {
    super();
    if (data) Object.assign(this, data);
  }

  static from(
    input: BonusTriggerProducerConfig,
  ): BonusTriggerProgressConfigDto {
    return new BonusTriggerProgressConfigDto({
      id: input.id,
      triggerId: input.triggerId,
      target:
        (input.target as BonusTriggerTarget) || BonusTriggerTargets.GLOBAL,
      type: input.type as typeof BonusTriggerConfigTypes.BET_SETTLEMENT,
      config: input.config as BonusTriggerConfig,
    });
  }
}
