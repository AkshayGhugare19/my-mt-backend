import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
  userAgent: z.string().optional(),
});

@ZodDto()
export class CreatePushSubscriptionDto extends createZodDto(PushSubscriptionSchema) {
  constructor(data: Partial<CreatePushSubscriptionDto>) {
    super();

    if (data) {
      Object.assign(this, data);
    }
  }
}
