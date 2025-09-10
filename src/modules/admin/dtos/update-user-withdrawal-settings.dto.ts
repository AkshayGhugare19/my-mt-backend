import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UpdateUserWithdrawalSettingsSchema = z.object({
  canWithdraw: z.boolean(),
});

@ZodDto()
export class UpdateUserWithdrawalSettingsDto extends createZodDto(
  UpdateUserWithdrawalSettingsSchema,
) {
  constructor(data: UpdateUserWithdrawalSettingsDto) {
    super();
    Object.assign(this, data);
  }
}
