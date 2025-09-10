import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const AvailableWithdrawSchema = z.object({
  amount: z.number(),
  availableAmount: z.number(),
});

export class AvailableWithdrawDto extends createZodDto(
  AvailableWithdrawSchema,
) {
  constructor(data: AvailableWithdrawDto) {
    super();
    Object.assign(this, data);
  }
}
