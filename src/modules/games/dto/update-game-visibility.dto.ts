import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';

export const UpdateGameVisibilitySchema = z.object({
  game_id: z.string().min(1, ValidationErrorMessages.INPUT_TOO_SHORT),
  available: z.boolean({ coerce: true }),
});

export type UpdateGameVisibility = z.infer<typeof UpdateGameVisibilitySchema>;

@ZodDto()
export class UpdateGameVisibilityDto extends createZodDto(UpdateGameVisibilitySchema) {
  constructor(partial: Partial<UpdateGameVisibility>) {
    super();
    Object.assign(this, partial);
  }
}
