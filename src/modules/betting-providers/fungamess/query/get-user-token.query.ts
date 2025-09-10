import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GetUserTokenSchema = z.object({
  userId: z.string(),
});

@ZodDto()
export class GetUserTokenQuery extends createZodDto(GetUserTokenSchema) {
  constructor(data?: GetUserTokenQuery) {
    super();
    if (data) Object.assign(this, data);
  }
}
