import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UpdateRolePermissionsSchema = z.object({
  permissions: z
    .array(z.string())
    .min(1, ErrorMessages.INVALID_PERMISSIONS_PROVIDED),
});

@ZodDto()
export class UpdateRolePermissionsDto extends createZodDto(
  UpdateRolePermissionsSchema,
) {
  constructor(data: UpdateRolePermissionsDto) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
