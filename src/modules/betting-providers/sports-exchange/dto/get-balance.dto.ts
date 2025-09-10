import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GetBalanceSchema = z.object({
  user_id: z.string(),
});

@ZodDto()
export class GetBalanceDto extends createZodDto(GetBalanceSchema) {
  constructor(data: Partial<GetBalanceDto>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
