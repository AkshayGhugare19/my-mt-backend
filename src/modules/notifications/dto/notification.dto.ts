import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.date(),
});

@ZodDto()
export class NotificationDto extends createZodDto(NotificationSchema) {
  constructor(data: NotificationDto) {
    super();
    Object.assign(this, data);
  }
}
