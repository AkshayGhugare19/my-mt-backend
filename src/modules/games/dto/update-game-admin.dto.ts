import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UpdateGameAdminSchema = z.object({
  disabled: z.boolean({ coerce: true }).optional(),
  available: z.boolean({ coerce: true }).optional(),
  title: z.string().min(3, ValidationErrorMessages.INPUT_TOO_SHORT).optional(),
  slug: z.string().min(3, ValidationErrorMessages.INPUT_TOO_SHORT).optional(),
})

export type UpdateGameAdmin = z.infer<typeof UpdateGameAdminSchema>

@ZodDto()
export class UpdateGameAdminDto extends createZodDto(UpdateGameAdminSchema) {
  constructor(partial: Partial<UpdateGameAdmin>) {
    super();
    Object.assign(this, partial);
  }
}
