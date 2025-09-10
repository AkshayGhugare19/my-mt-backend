import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { Decimal } from '@prisma/client/runtime/library';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const CreateTipSchema = z.object({
  targetUsername: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .min(1, {
      message: ValidationErrorMessages.INPUT_IS_REQUIRED,
    })
    .refine((value) => value !== 'undefined', {
      message: ValidationErrorMessages.INPUT_IS_REQUIRED,
    }),
  amount: z
    .number(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_NUMBER))
    .transform((value) => new Decimal(value)),
});

@ZodDto()
export class CreateTipDto extends createZodDto(CreateTipSchema) {
  constructor(data: CreateTipDto) {
    super();
    Object.assign(this, data);
  }
}
