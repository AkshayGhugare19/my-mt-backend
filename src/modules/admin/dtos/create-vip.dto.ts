import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { CreateUserSchema } from '@modules/admin/dtos/create-user.dto';
import { TokenIssueWithPrepaidOptionsSchema } from '@modules/token-issue/dto/token-issue-with-prepaid-options.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateVipSchema = CreateUserSchema.innerType()
  .extend({
    balance: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => (value ? new Decimal(value) : undefined)),
    userBookieStake: z.number().min(0),
    isBonusEnabled: z.boolean().optional(),
  })
  .merge(TokenIssueWithPrepaidOptionsSchema)
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
export class CreateVipDto extends createZodDto(CreateVipSchema) {
  constructor(data: CreateVipDto) {
    super();
    Object.assign(this, data);
  }
}
