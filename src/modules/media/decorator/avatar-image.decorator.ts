import { applyDecorators, SetMetadata } from '@nestjs/common';

export const AVATAR_IMAGE = 'createAvatarPresignedUrl';

export function AvatarImage(): any {
  return applyDecorators(SetMetadata(AVATAR_IMAGE, true));
}
