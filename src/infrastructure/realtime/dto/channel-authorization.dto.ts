import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ChannelAuthorizationSchema = z.object({
  channelName: z.string(),
  socketId: z.string(),
});

@ZodDto()
export class ChannelAuthorizationDto extends createZodDto(
  ChannelAuthorizationSchema,
) {
  constructor(data: ChannelAuthorizationDto) {
    super();
    Object.assign(this, data);
  }
}
