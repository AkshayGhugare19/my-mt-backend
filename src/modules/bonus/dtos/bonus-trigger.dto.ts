import { createZodDto } from '@common/helper/create-zod-dto';

import { ZodDto } from '@common/decorators/transform-dto.decorator';
import {
  BonusTriggerConfigTypeSchema,
  BonusTriggerTypeSchema,
} from '@modules/bonus/enum';
import { BonusTrigger } from '@prisma/client';
import { z } from 'zod';
import { BonusTriggerOptionsSchema } from '@modules/bonus/schema/trigger';

export const BonusTriggerSchema = z.object({
  id: z.number(),
  name: z.string(),
  configType: BonusTriggerConfigTypeSchema,
  configOptions: BonusTriggerOptionsSchema.array(),
  type: BonusTriggerTypeSchema,
});

@ZodDto()
export class BonusTriggerDto extends createZodDto(BonusTriggerSchema) {
  constructor(data: BonusTriggerDto) {
    super();
    Object.assign(this, data);
  }

  static create(data: BonusTrigger): BonusTriggerDto {
    return new BonusTriggerDto(super.create(data));
  }
}
