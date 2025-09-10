import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateUserSchema = z
  .object({
    email: z.string().email().optional(),
    maxBetSize: z.number().optional(),
    nickname: z.string().min(3).max(20).optional(),
  })
  .superRefine((data, cx) => {
    if (!data.email && !data.nickname) {
      cx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email', 'nickname'],
        message: ErrorMessages.EMAIL_OR_NICKNAME_REQUIRED,
      });
      return z.NEVER;
    }
    return data;
  });

@ZodDto()
export class CreateUserDto extends createZodDto(CreateUserSchema) {
  constructor(data: CreateUserDto) {
    super();
    Object.assign(this, data);
  }
}
