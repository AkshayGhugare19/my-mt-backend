import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

const generateNonceSchema = z.object({
  walletAddress: z.string().superRefine((data) => data.length === 34),
});

@ZodDto()
export class GenerateNonceDto extends createZodDto(generateNonceSchema) {
  constructor(data: GenerateNonceDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
