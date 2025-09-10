import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ChangeUsernameSchema = z.object({
  username: z.string().min(1),
});

export class ChangeUsernameDto extends createZodDto(ChangeUsernameSchema) {}
