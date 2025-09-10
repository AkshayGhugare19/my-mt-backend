import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

@ZodDto()
export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {
  constructor(data: RefreshTokenDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
