import { createZodDto } from '@common/helper/create-zod-dto';
import { AvatarAdminSchema } from '@modules/avatar/dto/avatar-admin.dto';
import { Avatar } from '@prisma/client';
import { z } from 'zod';

export const CreateAvatarResponseSchema = AvatarAdminSchema.extend({
  originalName: z.string().optional(),
});

export class CreateAvatarResponseDto extends createZodDto(
  CreateAvatarResponseSchema,
) {
  constructor(data: Partial<Avatar>) {
    super();
    Object.assign(this, data);
  }

  static from(data: Partial<Avatar>): CreateAvatarResponseDto {
    return new CreateAvatarResponseDto(
      CreateAvatarResponseDto.createSafe(data),
    );
  }
}
