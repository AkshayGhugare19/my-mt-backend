import { createZodDto } from '@common/helper/create-zod-dto';
import { Media } from '@prisma/client';
import { z } from 'zod';

export const UploadedAvatarSchema = z.object({
  id: z.string(),
  url: z.string(),
});

export class UploadedAvatarDto extends createZodDto(UploadedAvatarSchema) {
  constructor(data: Partial<UploadedAvatarDto>) {
    super();
    Object.assign(this, data);
  }

  static from(media: Media): UploadedAvatarDto {
    return new UploadedAvatarDto({
      id: media.id,
      url: media.url,
    });
  }
}
