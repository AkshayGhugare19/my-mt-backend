import { createZodDto } from '@anatine/zod-nestjs';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { AddCodeConfigSchema } from '@modules/coupon-code/schema/update-code-config.schema';
import { z } from 'zod';

export const UpdateCouponCodeSchema = z.object({
  code: z.string().optional(),
  config: AddCodeConfigSchema.optional().transform((data) => {
    if (!data) return;
    if (data.rolloverTargetMultiplier) {
      data.rolloverTargetMultiplier =
        Number(data.rolloverTargetMultiplier) * 100;
    }
    return data;
  }),
  stock: z.number().optional(),
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
    ).optional(),
});

@ZodDto()
export class UpdateCouponCodeDto extends createZodDto(UpdateCouponCodeSchema) {
  constructor(data: UpdateCouponCodeDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
