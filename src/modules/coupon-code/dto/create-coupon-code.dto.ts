import { createZodDto } from '@anatine/zod-nestjs';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { AddCodeConfigSchema } from '@modules/coupon-code/schema/update-code-config.schema';
import { z } from 'zod';

export const CreateCouponCodeSchema = z.object({
  code: z.string(),
  stock: z.number(),
  config: AddCodeConfigSchema.transform((data) => {
    if (data.rolloverTargetMultiplier) {
      data.rolloverTargetMultiplier = Number(data.rolloverTargetMultiplier) * 100;
    }
    return data;
  }),
  expiresAt: z
    .date({
      coerce: true,
      message: ValidationErrorMessages.INPUT_MUST_BE_A_VALID_DATE,
    })
    .nullable()
    .optional(),
  groups: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    )
});

@ZodDto()
export class CreateCouponCodeDto extends createZodDto(CreateCouponCodeSchema) {
  constructor(data: CreateCouponCodeDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
