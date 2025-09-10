import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ValidateWalletSchema = z.object({
  address: z.string(),
  validatorSignature: z.string(),
  targetSignature: z.string(),
});

@ZodDto()
export class ValidateWalletQuery extends createZodDto(ValidateWalletSchema) {
  constructor(data: Partial<ValidateWalletQuery>) {
    super();
    Object.assign(this, data);
  }
}
