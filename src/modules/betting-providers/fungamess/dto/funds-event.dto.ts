import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { Decimal } from '@prisma/client/runtime/library';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const FungamessFundsEventSchema = z.object({
  token: z.string(),
  userId: z.string(),
  gameId: z.string(),
  extraData: z
    .any()
    .optional()
    .transform((value) => {
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
      return value;
    }),
  eventId: z.string(),
  bonusCode: z.string().optional(),
  direction: z.enum(['debit', 'credit']),
  transactionId: z.string(),
  eventType: z.string(),
  amount: z.string().transform((value) => new Decimal(value)),
  time: z.number({ coerce: true }).or(z.string()).optional(),
});

@ZodDto()
export class FungamessFundsEventDto extends createZodDto(
  FungamessFundsEventSchema,
) {
  constructor(data?: FungamessFundsEventDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export type FungamessFundsEvent = z.infer<typeof FungamessFundsEventSchema>;
