import { BonusTriggerProducerConfig } from '@prisma/client';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTarget,
  BonusTriggerTargets,
  BonusTriggerTargetSchema,
} from '@modules/bonus/enum';
import {
  AdminManualProducerTriggerConfigSchema,
  BonusTriggerConfig,
  CashbackProducerTriggerConfigSchema,
  DepositProducerTriggerConfigSchema,
} from '@modules/bonus/schema/trigger';
import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { extendApi } from '@anatine/zod-openapi';

export const BonusTriggerProducerSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export const BonusTriggerAdminManualProducerSchema = extendApi(
  BonusTriggerProducerSchema.extend({
    type: z.literal(BonusTriggerConfigTypes.ADMIN_MANUAL),
    target: z
      .literal(BonusTriggerTargets.GLOBAL)
      .default(BonusTriggerTargets.GLOBAL),
    triggerId: z.number(),
    config: AdminManualProducerTriggerConfigSchema,
  }),
);

export const BonusTriggerDepositProducerSchema = extendApi(
  BonusTriggerProducerSchema.extend({
    type: z.literal(BonusTriggerConfigTypes.DEPOSIT),
    triggerId: z.number(),
    target: BonusTriggerTargetSchema,
    config: DepositProducerTriggerConfigSchema,
  }),
);

export const BonusTriggerCashbackProducerSchema = extendApi(
  BonusTriggerProducerSchema.extend({
    type: z.literal(BonusTriggerConfigTypes.CASHBACK),
    triggerId: z.number(),
    target: z
      .literal(BonusTriggerTargets.GLOBAL)
      .default(BonusTriggerTargets.GLOBAL),
    config: CashbackProducerTriggerConfigSchema.describe(
      'Cashback trigger config. lossRewardDayRange is in days. timeBetweenRuns in hours.',
    ),
  }),
);

export const BonusTriggerProducerConfigSchema = extendApi(
  zDiscriminatedUnion('type', [
    BonusTriggerAdminManualProducerSchema,
    BonusTriggerDepositProducerSchema,
    BonusTriggerCashbackProducerSchema,
  ]),
);

@ZodDto()
export class BonusTriggerAdminManualProducerDto extends createZodDto(
  BonusTriggerAdminManualProducerSchema,
) {
  constructor(data: BonusTriggerAdminManualProducerDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

@ZodDto()
export class BonusTriggerDepositProducerDto extends createZodDto(
  BonusTriggerDepositProducerSchema,
) {
  constructor(data: BonusTriggerDepositProducerDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export class BonusTriggerCashbackProducerDto extends createZodDto(
  BonusTriggerCashbackProducerSchema,
) {
  constructor(data: BonusTriggerCashbackProducerDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

type BonusTriggerProducerDto =
  | BonusTriggerDepositProducerDto
  | BonusTriggerAdminManualProducerDto
  | BonusTriggerCashbackProducerDto;

@ZodDto()
export class BonusTriggerProducerConfigDto extends createZodDto(
  BonusTriggerProducerConfigSchema,
) {
  constructor(data: BonusTriggerProducerConfigDto) {
    super();
    if (data) Object.assign(this, data);
  }

  static from(input: BonusTriggerProducerConfig): BonusTriggerProducerDto {
    return new BonusTriggerProducerConfigDto({
      id: input.id,
      triggerId: input.triggerId,
      target:
        (input.target as BonusTriggerTarget) || BonusTriggerTargets.GLOBAL,
      type: input.type as
        | typeof BonusTriggerConfigTypes.DEPOSIT
        | typeof BonusTriggerConfigTypes.ADMIN_MANUAL
        | typeof BonusTriggerConfigTypes.CASHBACK,
      config: input.config as BonusTriggerConfig,
    }) as BonusTriggerProducerDto;
  }
}
