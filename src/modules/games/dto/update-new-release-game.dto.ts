import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';

export const UpdateNewReleaseGameSchema = z.object({
  game_id: z.string().min(1, ValidationErrorMessages.INPUT_TOO_SHORT),
  newRelease: z.boolean({ coerce: true }),  // ✅ camelCase
});

export type UpdateNewReleaseGame = z.infer<typeof UpdateNewReleaseGameSchema>;

@ZodDto()
export class UpdateNewReleaseGameDto extends createZodDto(UpdateNewReleaseGameSchema) {
  constructor(partial: Partial<UpdateNewReleaseGame>) {
    super();
    Object.assign(this, partial);
  }
}