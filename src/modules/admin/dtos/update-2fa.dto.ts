import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const Update2FASchema = z.object({
  enable: z.boolean(),
  code: z.string().optional(),
  email: z.string().optional(),
});

export class Update2FADto extends createZodDto(Update2FASchema) {}
