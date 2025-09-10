import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const VerifyRecaptchaTokenSchema = z.object({
  token: z.string(),
});

@ZodDto()
export class VerifyRecaptchaTokenDto extends createZodDto(
  VerifyRecaptchaTokenSchema,
) {
  constructor(data?: VerifyRecaptchaTokenDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export type VerifyRecaptchaToken = z.infer<typeof VerifyRecaptchaTokenSchema>;
