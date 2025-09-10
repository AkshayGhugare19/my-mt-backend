import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const AvatarAdminSchema = z.object({
  id: z.number(),
  url: z.string(),
  order: z.number(),
});

export class AvatarAdminDto extends createZodDto(AvatarAdminSchema) {
  constructor(data: z.infer<typeof AvatarAdminSchema>) {
    super();
    Object.assign(this, data);
  }

  static from(data: Partial<AvatarAdminDto>): AvatarAdminDto {
    return new AvatarAdminDto(AvatarAdminDto.createSafe(data));
  }
}
