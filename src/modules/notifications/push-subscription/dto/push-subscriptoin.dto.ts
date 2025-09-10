import { createZodDto } from '@common/helper/create-zod-dto';
import { PushSubscription } from '@prisma/client';
import { z } from 'zod';

const PushSubscriptionSchema = z.object({
  id: z.string(),
  endpoint: z.string(),
});

export class PushSubscriptionDto extends createZodDto(PushSubscriptionSchema) {
  constructor(data: Partial<PushSubscriptionDto>) {
    super();

    if (data) {
      Object.assign(this, data);
    }
  }

  static from(prisma: PushSubscription): PushSubscriptionDto {
    return new PushSubscriptionDto(PushSubscriptionDto.createSafe({
      id: prisma.id,
      endpoint: prisma.endpoint,
    }));
  }
}
