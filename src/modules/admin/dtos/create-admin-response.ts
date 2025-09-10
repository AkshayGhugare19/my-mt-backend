import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateAdminResponseSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  role: z.string(),
  nickname: z.string().optional(),
  password: z.string(),
});

export class CreateAdminResponseDto extends createZodDto(
  CreateAdminResponseSchema,
) {
  constructor(data: CreateAdminResponseDto) {
    super();
    Object.assign(this, data);
  }
}
