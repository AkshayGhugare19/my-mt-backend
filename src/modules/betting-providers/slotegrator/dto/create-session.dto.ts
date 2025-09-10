import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateSessionSchema = z.object({
  slug: z.string(),
  demo: z.boolean(),
  returnUrl: z.string().optional(),
});

@ZodDto()
export class CreateSessionDto extends createZodDto(CreateSessionSchema) {
  constructor(data?: CreateSessionDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export type CreateSession = z.infer<typeof CreateSessionSchema>;

export const CreateSportsBookSessionSchema = z.object({
  language: z.string(),
});

@ZodDto()
export class CreateSportsBookSessionDto extends createZodDto(
  CreateSportsBookSessionSchema,
) {
  constructor(data?: CreateSportsBookSessionDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export type CreateSportsBookSession = z.infer<
  typeof CreateSportsBookSessionSchema
>;
