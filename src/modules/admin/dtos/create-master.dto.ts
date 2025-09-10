import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { TokenIssueWithPrepaidOptionsSchema } from '@modules/token-issue/dto/token-issue-with-prepaid-options.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateMasterSchema = z
  .object({
    email: z.string().email().optional(),
    nickname: z.string().min(3).max(20).optional(),
    balance: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => (value ? new Decimal(value) : undefined)),
    maxExposurePerVip: z.number().optional(),
    maxNumberOfUsers: z.number().optional(),
    // !CHECK - https://trello.com/c/ALmQR6cR
    predefinedBookieStake: z.number().min(0),
    flexibleBookieStake: z.number().min(0),
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
export class CreateMasterDto extends createZodDto(CreateMasterSchema) {
  constructor(data: CreateMasterDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
