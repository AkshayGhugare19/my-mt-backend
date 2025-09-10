import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UpdatePokerCodeSchema = z.object({
  useLimit: z.number().optional(),
  reuseLimit: z.number().optional(),
  expiresAt: z.date({ coerce: true }).optional(),
  rangeFrom: z.number({ coerce: true }).optional(),
  rangeTo: z.number({ coerce: true }).optional(),
  isDisabled: z.boolean().optional(),
  isHighRoller: z.boolean().optional(),
});

@ZodDto()
export class UpdatePokerCodeDto extends createZodDto(UpdatePokerCodeSchema) {
  constructor(data: UpdatePokerCodeDto) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

export type UpdatePokerCode = z.infer<typeof UpdatePokerCodeSchema>;
