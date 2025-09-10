import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateOnePokerCodeSchema = z.object({
  code: z.string(),
  useLimit: z.number(),
  reuseLimit: z.number(),
  expiresAt: z.date({ coerce: true }),
  rangeFrom: z.number({ coerce: true }),
  rangeTo: z.number({ coerce: true }),
  isHighRoller: z.boolean().optional(),
});

export const CreatePokerCodesSchema = z.object({
  data: z
    .array(CreateOnePokerCodeSchema)
    .min(1, ErrorMessages.INVALID_PERMISSIONS_PROVIDED),
});

@ZodDto()
export class CreatePokerCodesDto extends createZodDto(CreatePokerCodesSchema) {
  constructor(data: CreatePokerCodesDto) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

export type CreatePokerCodes = z.infer<typeof CreatePokerCodesSchema>;
