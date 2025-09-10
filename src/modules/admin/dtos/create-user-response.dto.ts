import { extendApi } from '@anatine/zod-openapi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateUserResponseSchema = extendApi(
  z.object({
    userId: z.string(),
    email: z.string().optional(),
    nickname: z.string().optional(),
    role: z.string(),
    balance: z.number().optional(),
    password: z.string(),
    maxBetSize: z.number(),
    userBookieStake: z.number(),
    isBonusEnabled: z.boolean(),
  }),
);

@ZodDto()
export class CreateUserResponseDto extends createZodDto(
  CreateUserResponseSchema,
) {
  constructor(data: CreateUserResponseDto) {
    super();
    Object.assign(this, data);
  }
}
