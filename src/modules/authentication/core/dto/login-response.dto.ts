import { UserSchema } from '@modules/user/dto/user.dto';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';

export const LoginResponseSchema = extendApi(
  z.object({
    token: z.union([z.string(), z.null()]),
    refreshToken: z.union([z.string(), z.null()]),
    user: UserSchema,
  }),
);

@ZodDto()
export class LoginResponseDto extends createZodDto(LoginResponseSchema) {
  constructor(data: LoginResponseDto) {
    super();
    Object.assign(this, data);
  }
}
